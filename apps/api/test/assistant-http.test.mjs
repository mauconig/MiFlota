import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('HTTP authentication, tenant isolation, concurrency, rate limits and provider failure', {timeout:60000}, async t => {
 const dir=mkdtempSync(join(tmpdir(),'miflota-chat-http-'));
 process.env.MIFLOTA_DB=join(dir,'data.db');
 const {openDb}=await import('../dist/db.js');
 const {migrarAuth,crearSesion}=await import('../dist/auth.js');
 const db=openDb();migrarAuth(db);
 db.exec("INSERT INTO users(id,usuario,nombre,pass_hash,creado) VALUES (1,'a','A','unused','2026-09-01'),(2,'b','B','unused','2026-09-01')");
 db.exec("INSERT INTO cars(id,owner_id,plate,model,year,estado) VALUES ('a',1,'OWNER1','Model 1',2020,'activo'),('b',2,'OWNER2','Model 2',2020,'activo')");
 const tokenA=crearSesion(db,1).token;
 const tokenB=crearSesion(db,2).token;
 let fail=false,slow=false,release;
 const model=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  if(fail){res.writeHead(503);res.end('{}');return;}
  if(slow){slow=false;await new Promise(r=>{release=r;});}
  const body=JSON.parse(raw),result=body.messages.findLast(m=>m.role==='tool');
  const message=result?{role:'assistant',content:JSON.stringify({answer:'Resultado '+JSON.parse(result.content).rows[0].label,queryId:0,followUps:[]})}:{role:'assistant',content:null,tool_calls:[{id:'q',type:'function',function:{name:'query_fleet_data',arguments:'{"entity":"vehiculos"}'}}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message}]}));
 });
 model.listen(0,'127.0.0.1');await once(model,'listening');
 // Mock de Groq (Whisper): devuelve el texto del dictado.
 const groq=createServer(async(req,res)=>{
  let size=0;for await(const chunk of req)size+=chunk.length;
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({ text: size>0?'Hyundai blanco A 416 gastos taller':'' }));
 });
 groq.listen(0,'127.0.0.1');await once(groq,'listening');
 const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(r=>reserve.close(r));
 const child=spawn(process.execPath,['dist/index.js'],{cwd:resolve('.'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MIFLOTA_PUBLIC:join(dir,'public'),MIFLOTA_PUSH_ENABLED:'false',OPENROUTER_API_KEY:'fake-key',OPENROUTER_BASE_URL:`http://127.0.0.1:${model.address().port}`,GROQ_API_KEY:'fake-groq',GROQ_TRANSCRIBE_URL:`http://127.0.0.1:${groq.address().port}`,LOG_LEVEL:'silent'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 t.after(async()=>{release?.();child.kill();await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,2000))]);model.closeAllConnections();await new Promise(r=>model.close(r));groq.closeAllConnections();await new Promise(r=>groq.close(r));db.close();rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${port}`;
 let ready=false;for(let n=0;n<400;n++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.ok(ready,output);
 const ask=(token,question='Autos')=>fetch(base+'/api/assistant/query',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({question,capabilities:{lineCharts:true}})});
 assert.equal((await ask(null)).status,401);
 assert.equal((await ask(tokenA,'')).status,400);
 assert.equal((await ask(tokenA,'a'.repeat(601))).status,400);
 const a=await(await ask(tokenA)).json(),b=await(await ask(tokenB)).json();
 assert.match(a.answer,/OWNER1/);assert.doesNotMatch(JSON.stringify(a),/OWNER2/);
 assert.match(b.answer,/OWNER2/);assert.doesNotMatch(JSON.stringify(b),/OWNER1/);
 // Carga de gastos confirmada: sin sesión 401, validación 400 y aislamiento.
 const carga=(token,items)=>fetch(base+'/api/assistant/expenses',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({items})});
 assert.equal((await carga(null,[{carId:'a',description:'x',amount:1000,category:'Taller'}])).status,401);
 assert.equal((await carga(tokenA,[])).status,400);
 assert.equal((await carga(tokenA,[{carId:'b',description:'ajeno',amount:1000,category:'Taller'}])).status,400);
 const cargaOk=await carga(tokenA,[{carId:'a',description:'Cubierta usada',amount:120000,category:'Taller'}]);
 assert.equal(cargaOk.status,201);assert.equal((await cargaOk.json()).created,1);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM movs WHERE owner_id=1 AND car_id='a' AND type='egreso'").get().n,1);
 // Dictado por voz: sin sesión 401, sin audio 400, formato raro 415 y éxito.
 const dictar=(token,blob,type='audio/webm',name='a.webm')=>{
  const fd=new FormData();
  if(blob)fd.append('audio',new Blob([blob],{type}),name);
  return fetch(base+'/api/assistant/transcribe',{method:'POST',headers:{...(token?{Authorization:'Bearer '+token}:{})},body:fd});
 };
 assert.equal((await dictar(null,'abc')).status,401);
 assert.equal((await dictar(tokenA,null)).status,400);
 assert.equal((await dictar(tokenA,'abc','application/pdf','a.pdf')).status,415);
 const dictado=await dictar(tokenA,'audio-falso');
 assert.equal(dictado.status,200);assert.match((await dictado.json()).text,/Hyundai/);
 slow=true;const pending=ask(tokenA);for(let i=0;i<100&&!release;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release);
 assert.equal((await ask(tokenA)).status,429);release();assert.equal((await pending).status,200);
 fail=true;const failure=await ask(tokenB);assert.equal(failure.status,502);assert.deepEqual(Object.keys(await failure.json()),['error']);fail=false;
 let limited=false;for(let i=0;i<22;i++){if((await ask(tokenA)).status===429){limited=true;break;}}assert.ok(limited);
 db.prepare("UPDATE sessions SET expira='2000-01-01' WHERE user_id=2").run();
 assert.equal((await ask(tokenB)).status,401);
});
