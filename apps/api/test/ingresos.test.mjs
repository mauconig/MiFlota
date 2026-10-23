import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ayer = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return iso(d);
})();

const pdf = (texto) => new Blob([Buffer.from(`%PDF-1.4\n${texto}\n%%EOF`)], { type: 'application/pdf' });

test('alta de chofer, asignación de auto y pago con comprobante', { timeout: 60000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'miflota-ingresos-'));
  process.env.MIFLOTA_DB = join(dir, 'data.db');
  const { openDb } = await import('../dist/db.js');
  const { migrarAuth, crearSesion } = await import('../dist/auth.js');
  const db = openDb();
  migrarAuth(db);
  db.exec("INSERT INTO users(id,usuario,nombre,pass_hash,creado) VALUES (1,'a','A','unused','2026-09-01'),(2,'b','B','unused','2026-09-01')");
  db.exec("INSERT INTO sections(id,owner_id,name,position) VALUES (1,1,'General',0),(2,2,'Ajena',0)");
  const driverA = db.prepare("INSERT INTO drivers(owner_id,nombre,creado) VALUES (1,'Chofer A','2026-09-01')").run().lastInsertRowid;
  const driverB = db.prepare("INSERT INTO drivers(owner_id,nombre,creado) VALUES (1,'Chofer B','2026-09-01')").run().lastInsertRowid;
  db.prepare("INSERT INTO cars(id,owner_id,section_id,plate,model,year,driver,driver_id,cuota,estado) VALUES ('a',1,1,'OWNER1','Toyota Vitz',2020,'Chofer A',?,300000,'activo'),('b',1,1,'OWNER2','Hyundai i10',2019,'Chofer B',?,250000,'activo'),('c',2,2,'AJENO','Kia Picanto',2021,'Sin chofer',NULL,0,'activo')").run(driverA, driverB);
  const tokenA = crearSesion(db, 1).token;
  const tokenB = crearSesion(db, 2).token;

  const reserve = createServer();
  reserve.listen(0, '127.0.0.1');
  await once(reserve, 'listening');
  const port = reserve.address().port;
  await new Promise((r) => reserve.close(r));

  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: resolve('.'),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', MIFLOTA_PUBLIC: join(dir, 'public'), MIFLOTA_PUSH_ENABLED: 'false', LOG_LEVEL: 'silent' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (b) => { output += b; });
  child.stderr.on('data', (b) => { output += b; });
  t.after(async () => {
    child.kill();
    await Promise.race([once(child, 'exit'), new Promise((r) => setTimeout(r, 2000))]);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let n = 0; n < 400; n++) {
    try {
      if ((await fetch(base + '/api/health')).ok) { ready = true; break; }
    } catch { /* todavía no levantó */ }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(ready, output);

  const auth = (token) => ({ Authorization: 'Bearer ' + token });
  const esperar = async (res, status) => {
    if (res.status !== status) assert.fail(`${status} esperado, llegó ${res.status}: ${await res.text()}`);
    return res;
  };

  // Alta de chofer: crea, es idempotente y aparece en /api/state sin auto.
  const crearChofer = (token, nombre) => fetch(base + '/api/drivers', {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  });
  const nuevo = await esperar(await crearChofer(tokenA, '  Ramón   Villalba '), 201);
  const chofer = (await nuevo.json()).driver;
  assert.equal(chofer.nombre, 'Ramón Villalba');
  const repetido = await esperar(await crearChofer(tokenA, 'Ramón Villalba'), 201);
  assert.equal((await repetido.json()).driver.id, chofer.id);
  assert.equal((await crearChofer(tokenA, '   ')).status, 400);
  assert.equal((await crearChofer(tokenA, 'Sin chofer')).status, 400);

  const estado = await (await fetch(base + '/api/state', { headers: auth(tokenA) })).json();
  assert.ok(estado.drivers.some((d) => d.id === chofer.id), 'el chofer sin auto viaja en el estado');
  const estadoB = await (await fetch(base + '/api/state', { headers: auth(tokenB) })).json();
  assert.ok(!estadoB.drivers.some((d) => d.id === chofer.id), 'cada dueño ve solo sus choferes');

  // Asignar el chofer nuevo al auto 'a': el chofer anterior queda sin auto.
  const asignar = (token, carId, body) => fetch(`${base}/api/cars/${carId}`, {
    method: 'PATCH',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const asignado = await esperar(await asignar(tokenA, 'a', { driver: 'Ramón Villalba', cuota: 300000 }), 200);
  const carA = await asignado.json();
  assert.equal(carA.driver, 'Ramón Villalba');
  assert.equal(carA.driverId, chofer.id);
  const anterior = db.prepare("SELECT driver, driver_id FROM cars WHERE id = 'a'").get();
  assert.equal(anterior.driver, 'Ramón Villalba');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM cars WHERE owner_id = 1 AND driver_id = ? AND id <> 'a'").get(driverA).n, 0);
  assert.equal((await asignar(tokenB, 'a', { driver: 'Intruso' })).status, 404, 'no se asigna en un auto ajeno');
  assert.equal((await asignar(tokenB, 'c', { driver: 'Chofer A', cuota: 0 })).status, 200, 'cada dueño manda en su flota');

  // Un solo auto por chofer: al mover a un chofer de auto, el otro queda libre.
  assert.equal((await esperar(await asignar(tokenA, 'b', { driver: 'Ramón Villalba', cuota: 250000 }), 200)).status, 200);
  assert.equal(db.prepare("SELECT driver FROM cars WHERE id = 'a'").get().driver, 'Sin chofer');
  assert.equal(db.prepare("SELECT driver FROM cars WHERE id = 'b'").get().driver, 'Ramón Villalba');

  // Pago multipart con comprobante: el archivo queda guardado y se devuelve.
  const crearPago = (token, campos, comprobante) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, String(v));
    if (comprobante) fd.append('comprobante', comprobante, 'transferencia.pdf');
    return fetch(base + '/api/pagos', { method: 'POST', headers: auth(token), body: fd });
  };
  const pagoOk = await esperar(await crearPago(tokenA, { driver: chofer.id, carId: 'b', fecha: ayer, monto: 200000, tipo: 'pago', nota: 'Transferencia' }, pdf('pago')), 201);
  const pago = await pagoOk.json();
  assert.equal(pago.driver, 'Ramón Villalba');
  assert.equal(pago.carId, 'b');
  assert.equal(pago.monto, 200000);
  assert.equal(pago.nota, 'Transferencia');
  assert.ok(pago.comprobante?.id, 'el pago devuelve el comprobante');
  assert.ok(existsSync(join(dir, 'comprobantes', pago.comprobante.id)), 'el archivo del pago queda en disco');
  assert.equal(db.prepare('SELECT comprobante FROM pagos WHERE id = ?').get(pago.id).comprobante, pago.comprobante.id);

  // Validaciones del pago: fecha futura, monto inválido y auto ajeno.
  const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); })();
  assert.equal((await crearPago(tokenA, { driver: chofer.id, carId: 'b', fecha: manana, monto: 1000, tipo: 'pago' })).status, 400);
  assert.equal((await crearPago(tokenA, { driver: chofer.id, carId: 'b', fecha: ayer, monto: 0, tipo: 'pago' })).status, 400);
  assert.equal((await crearPago(tokenA, { driver: chofer.id, carId: 'c', fecha: ayer, monto: 1000, tipo: 'pago' })).status, 404);

  // La web sigue mandando JSON: no se rompe.
  const jsonPago = await esperar(await fetch(base + '/api/pagos', {
    method: 'POST',
    headers: { ...auth(tokenA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver: 'Chofer B', carId: 'a', fecha: ayer, monto: 50000, tipo: 'pago' }),
  }), 201);
  assert.equal((await jsonPago.json()).monto, 50000);

  assert.equal((await fetch(base + '/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'X' }) })).status, 401, 'sin sesión no se crean choferes');
});
