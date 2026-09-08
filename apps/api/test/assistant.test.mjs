import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temp = mkdtempSync(join(tmpdir(), 'miflota-assistant-'));
process.env.MIFLOTA_DB = join(temp,'test.db');
const { openDb } = await import('../dist/db.js');
const { queryFleetData, queryRange } = await import('../dist/assistantQuery.js');
const { answerAssistant, visualsFromQuery } = await import('../dist/assistant.js');
const db = openDb();
after(() => { db.close(); rmSync(temp, { recursive: true, force: true }); });
db.exec(`
 INSERT INTO drivers(id,owner_id,nombre,estado,creado,driver_username,driver_pass_hash) VALUES
 (1,1,'Oscar Ledezma','activo','2026-09-01','oscar.ledezma','PRIVATE_HASH'),
 (2,1,'Hector Villalba','activo','2026-09-01','hector.villalba','PRIVATE_HASH'),
 (3,1,'Hector Caballero','activo','2026-09-01',NULL,NULL),
 (4,2,'Otro Propietario','activo','2026-09-01','private.user','PRIVATE_HASH');
 INSERT INTO cars(id,owner_id,plate,model,year,driver_id,driver,estado,gps_tag) VALUES
 ('a',1,'BYJ 066','Hyundai i10',2016,NULL,'Sin chofer','activo','Gris B'),
 ('b',1,'HFV 416','Kia Picanto',2018,1,'Oscar Ledezma','activo','Blanco A'),
 ('private',2,'SECRET','Private Car',2020,4,'Otro Propietario','activo','Private GPS');
 INSERT INTO movs(id,owner_id,car_id,type,amount,date,descripcion,driver,driver_id) VALUES
 (1,1,'a','ingreso',100,'2026-08-31','Cuota anterior','OSCAR LEDEZMA',1),
 (2,1,'b','ingreso',100,'2026-09-01','Cuota actual','Oscar Ledezma',1),
 (3,1,'b','egreso',40,'2026-09-02','Cambio de aceite',NULL,NULL),
 (4,2,'private','ingreso',999999,'2026-09-01','SECRET', 'Otro Propietario',4);
 UPDATE movs SET cat='Taller',mano_obra=20 WHERE id=3;
 INSERT INTO gasto_items(mov_id,nombre,cantidad,costo_unitario,subtotal) VALUES (3,'Aceite',1,20,20);
 INSERT INTO pagos(owner_id,car_id,driver,driver_id,fecha,monto,tipo) VALUES
 (1,'b','Oscar Ledezma',1,'2026-09-01',100,'pago'),
 (1,'b','Oscar Ledezma',1,'2026-09-02',20,'pago'),
 (1,'b','Oscar Ledezma',1,'2026-09-03',30,'ajuste'),
 (2,'private','Otro Propietario',4,'2026-09-01',888888,'pago');
 INSERT INTO reportes_falla(owner_id,car_id,driver,driver_id,cat,urgencia,texto,fecha) VALUES
 (1,'b','Oscar Ledezma',1,'Motor','urgente','Ruido en motor','2026-09-02'),
 (2,'private','Otro Propietario',4,'Motor','urgente','SECRET','2026-09-02');
 INSERT INTO driver_locations(car_id,latitude,longitude,accuracy,recorded_at,received_at) VALUES
 ('b',-25.3,-57.6,10,'2026-09-02T01:00:00Z','2026-09-02T01:00:00Z'),
 ('private',40,10,5,'2026-09-02T01:00:00Z','2026-09-02T01:00:00Z');
 INSERT INTO driver_location_history(car_id,latitude,longitude,accuracy,recorded_at,received_at) SELECT car_id,latitude,longitude,accuracy,recorded_at,received_at FROM driver_locations;
`);
for(let n=0;n<60;n++) db.prepare("INSERT INTO cars(id,owner_id,plate,model,year,estado) VALUES (?,3,?,'Demo',2020,'activo')").run('limit'+n,'LIMIT'+n);
const query = r => queryFleetData(db,1,r,'2026-09-08');

test('all operational queries are isolated and exclude secrets without mutating data', () => {
 const changes = db.prepare('SELECT total_changes() n').get().n;
 for(const entity of ['vehiculos','choferes','cuotas','pagos','ajustes','gastos','deudas','finanzas','movimientos','mantenimiento','seguros','gps','ubicaciones','fallas']) {
  const result = query({entity});
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_HASH|private\.user|SECRET|Private Car|Otro Propietario|pass_hash|token/);
 }
 assert.equal(db.prepare('SELECT total_changes() n').get().n,changes);
 assert.equal(queryFleetData(db,2,{entity:'vehiculos'},'2026-09-08').rows[0].label,'SECRET');
});
test('identity, normalized plates, unknown odometer and unassigned drivers', () => {
 const a=query({entity:'vehiculos',vehicle:'BYJ066'});
 assert.equal(a.rows[0].details.Chofer,'Sin chofer');
 assert.equal(a.rows[0].details.Kilometraje,'Sin lectura registrada');
 assert.equal(a.rows[0].details['GPS-TAG'],'Gris B');
 assert.equal(visualsFromQuery(a).chart,undefined);
 assert.equal(query({entity:'choferes',assigned:false}).total,2);
 assert.equal(query({entity:'vehiculos',assigned:false}).total,1);
 assert.equal(query({entity:'choferes',driver:'Oscar Ledezma'}).rows[0].details.Vehículos,'HFV 416');
 assert.throws(()=>query({entity:'choferes',driver:'Hector'}),/Precisá el chofer/);
});
test('debt allocation follows stable driver identity across cars before filtering', () => {
 const all=query({entity:'deudas'});
 assert.equal(all.total,50);
 assert.equal(all.rows[0].label,'Oscar Ledezma');
 assert.equal(query({entity:'deudas',vehicle:'BYJ066'}).total,0);
 assert.equal(query({entity:'deudas',vehicle:'HFV416',period:'mes'}).total,50);
 assert.equal(query({entity:'cuotas',status:'parcial'}).rows[0].details['Saldo pendiente'],'Gs. 50');
 assert.equal(query({entity:'cuotas',status:'pagado'}).total,100);
});
test('cash, adjustments, billed amount, expenses and net are distinct', () => {
 assert.equal(query({entity:'pagos'}).total,120);
 assert.equal(query({entity:'ajustes'}).total,30);
 assert.equal(query({entity:'finanzas',metric:'ganancia'}).total,80);
 assert.equal(query({entity:'finanzas',metric:'facturado'}).total,200);
 assert.equal(query({entity:'finanzas',metric:'facturado',period:'mes'}).total,100);
 assert.equal(query({entity:'pagos',metric:'cantidad',groupBy:'fecha'}).total,2);
 const expense=query({entity:'gastos',category:'Taller',driver:'Oscar Ledezma'});
 assert.match(expense.rows[0].details.Repuestos,/Aceite/);
 assert.equal(expense.rows[0].details['Mano de obra'],'Gs. 20');
});
test('complete totals before pagination and grouping by model', () => {
 const q=queryFleetData(db,3,{entity:'vehiculos',limit:10,offset:10},'2026-09-08');
 assert.equal(q.total,60); assert.equal(q.totalRows,60); assert.equal(q.rows.length,10); assert.equal(q.truncated,true);
 const models=query({entity:'vehiculos',groupBy:'modelo',metric:'cantidad'});
 assert.equal(models.total,2); assert.equal(models.rows.length,2);
 assert.equal(visualsFromQuery(models).chart.kind,'bars');
 const top=query({entity:'pagos',groupBy:'fecha',limit:1});
 assert.equal(top.total,120); assert.equal(top.rows[0].label,'2026-09-01');
});
test('temporal charts ordered by date; mobile keeps bars; negatives retained', () => {
 const result=query({entity:'finanzas',metric:'ganancia',groupBy:'fecha'});
 assert.deepEqual(result.rows.map(r=>r.value),[100,-20]);
 assert.equal(visualsFromQuery(result,true).chart.kind,'line');
 assert.equal(visualsFromQuery(result,false).chart.kind,'bars');
 assert.equal(query({entity:'ubicaciones',history:true,period:'personalizado',from:'2026-09-01',to:'2026-09-01'}).total,1);
});
test('invalid fields, dates, metrics and SQL rejected; empty matches never fall back', () => {
 for(const r of [{entity:'users'},{entity:'vehiculos',sql:'SELECT * FROM users'},{entity:'vehiculos',owner_id:2},{entity:'pagos',metric:'deuda'},{entity:'pagos',limit:Infinity},{entity:'pagos',groupBy:'invalid'},{entity:'pagos',period:'personalizado',from:'2026-02-30'}]) assert.throws(()=>query(r));
 assert.throws(()=>queryRange({period:'personalizado',from:'2026-09-01',to:'2027-01-01'},'2026-09-08'));
 const empty=query({entity:'pagos',vehicle:'NO EXISTE'});
 assert.equal(empty.total,0); assert.deepEqual(empty.rows,[]); assert.equal(visualsFromQuery(empty).chart,undefined);
});

function tool(args,id='t') { return {role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'query_fleet_data',arguments:JSON.stringify(args)}}]}; }
function reportTool(args,id='r') { return {role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'generate_fleet_report',arguments:JSON.stringify(args)}}]}; }
function final(answer='Respuesta',queryId=0) {return {role:'assistant',content:JSON.stringify({answer,queryId,followUps:[]})};}
function model(messages) {
 const calls=[];
 return { calls, fetch:async(_url,init)=>{calls.push(JSON.parse(init.body));const message=messages.shift();return new Response(JSON.stringify({choices:[{message}]}),{status:200});} };
}
test('query-first agent grounds response and uses selected query for visuals', async () => {
 const m=model([tool({entity:'vehiculos',groupBy:'modelo'}),tool({entity:'pagos',groupBy:'fecha'},'t2'),final('Por modelo',0)]);
 const result=await answerAssistant('Comparar modelos',[], '2026-09-08',{apiKey:'test',fetch:m.fetch,queryFleet:async r=>query(r),lineCharts:true});
 assert.equal(m.calls[0].tool_choice.function.name,'query_fleet_data');
 assert.equal(result.chart.kind,'bars');assert.match(result.chart.title,/modelo/);
 assert.doesNotMatch(JSON.stringify(m.calls),/PRIVATE_HASH|SECRET/);
});
test('reports inherit the category and vehicle filter from the preceding query', async () => {
 const m=model([
  tool({entity:'gastos',category:'Taller',vehicle:'HFV416',period:'mes'}),
  reportTool({format:'pdf',report:'gastos',period:'month'}),
  reportTool({format:'xlsx',report:'gastos',period:'month'}),
  final('Archivos listos'),
 ]);
 const generated=[];
 const result=await answerAssistant('Hacé un reporte de eso en PDF y Excel',[], '2026-09-08', {
  apiKey:'test', fetch:m.fetch, queryFleet:async r=>query(r),
  generateReport:async request=>{ generated.push(request); return { name:`${request.format}.file`, url:`/files/${request.format}`, mimeType:'application/octet-stream' }; },
 });
 assert.equal(generated.length,2);
 assert.deepEqual(generated.map(r=>({format:r.format,period:r.period,report:r.report,category:r.category,vehicle:r.vehicle})),[
  {format:'pdf',period:'month',report:'gastos',category:'Taller',vehicle:'HFV416'},
  {format:'xlsx',period:'month',report:'gastos',category:'Taller',vehicle:'HFV416'},
 ]);
 assert.equal(result.files.length,2);
});
test('history carries context and model receives error, never fabricated fallback', async () => {
 const m=model([tool({entity:'users'}),tool({entity:'pagos',period:'mes'},'t2'),final()]);
 await answerAssistant('¿Y este mes?',[{role:'user',content:'Cobros anteriores'},{role:'assistant',content:'Septiembre'}],'2026-09-08',{apiKey:'test',fetch:m.fetch,queryFleet:async r=>query(r)});
 assert.match(JSON.stringify(m.calls[0].messages),/Cobros anteriores/);
 assert.match(JSON.stringify(m.calls[1].messages),/Entidad de consulta/);
 const noQuery=model([final('Inventado')]);
 await assert.rejects(answerAssistant('Total',[],'2026-09-08',{apiKey:'test',fetch:noQuery.fetch,queryFleet:async r=>query(r)}),/no consultó/);
});
test('invalid model JSON retried once, ambiguous identity returns clarification', async () => {
 const m=model([tool({entity:'pagos'}),{role:'assistant',content:'not json'},final()]);
 assert.equal((await answerAssistant('Cobros',[],'2026-09-08',{apiKey:'test',fetch:m.fetch,queryFleet:async r=>query(r)})).answer,'Respuesta');
 const invalid=model([tool({entity:'pagos'}),{role:'assistant',content:'not json'},{role:'assistant',content:'not json'}]);
 await assert.rejects(answerAssistant('Cobros',[],'2026-09-08',{apiKey:'test',fetch:invalid.fetch,queryFleet:async r=>query(r)}),/respuesta válida/);
 const ambiguous=model([tool({entity:'choferes',driver:'Hector'})]);
 const reply=await answerAssistant('Hector',[],'2026-09-08',{apiKey:'test',fetch:ambiguous.fetch,queryFleet:async r=>query(r)});
 assert.match(reply.answer,/Precisá el chofer/);assert.equal(reply.chart,undefined);
});
test('missing key and provider failures are errors without unrelated results', async () => {
 await assert.rejects(answerAssistant('Cobros',[],'2026-09-08',{queryFleet:async r=>query(r)}),/sin configurar/);
 await assert.rejects(answerAssistant('Cobros',[],'2026-09-08',{apiKey:'test',queryFleet:async r=>query(r),fetch:async()=>new Response('failure',{status:503})}),/HTTP 503/);
});
