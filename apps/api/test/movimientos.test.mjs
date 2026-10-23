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
const manana = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return iso(d);
})();

const pdf = (texto) => new Blob([Buffer.from(`%PDF-1.4\n${texto}\n%%EOF`)], { type: 'application/pdf' });

test('editar y borrar movimientos, aislamiento por dueño y fecha del egreso', { timeout: 60000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'miflota-movs-'));
  process.env.MIFLOTA_DB = join(dir, 'data.db');
  const { openDb } = await import('../dist/db.js');
  const { migrarAuth, crearSesion } = await import('../dist/auth.js');
  const db = openDb();
  migrarAuth(db);
  db.exec("INSERT INTO users(id,usuario,nombre,pass_hash,creado) VALUES (1,'a','A','unused','2026-09-01'),(2,'b','B','unused','2026-09-01')");
  db.exec("INSERT INTO cars(id,owner_id,plate,model,year,estado,driver) VALUES ('a',1,'OWNER1','Model 1',2020,'activo','Chofer A'),('b',2,'OWNER2','Model 2',2020,'activo','Chofer B')");
  db.exec("INSERT INTO drivers(owner_id,nombre,creado) VALUES (1,'Chofer A','2026-09-01'),(2,'Chofer B','2026-09-01')");
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
  /** El cuerpo solo se lee cuando falla: leerlo siempre lo consume y rompe el `json()`. */
  const esperar = async (res, status) => {
    if (res.status !== status) assert.fail(`${status} esperado, llegó ${res.status}: ${await res.text()}`);
    return res;
  };
  let ready = false;
  for (let n = 0; n < 400; n++) {
    try {
      if ((await fetch(base + '/api/health')).ok) { ready = true; break; }
    } catch { /* todavía no levantó */ }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(ready, output);

  const auth = (token) => ({ Authorization: 'Bearer ' + token });

  const crearEgreso = async (token, campos, comprobante) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, String(v));
    if (comprobante) fd.append('comprobante', comprobante, 'ticket.pdf');
    return fetch(base + '/api/cars/a/egreso', { method: 'POST', headers: auth(token), body: fd });
  };
  const editarGasto = (token, id, campos, comprobante) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, String(v));
    if (comprobante) fd.append('comprobante', comprobante, 'ticket.pdf');
    return fetch(`${base}/api/movs/${id}`, { method: 'PATCH', headers: auth(token), body: fd });
  };
  const archivoDe = (mov) => join(dir, 'comprobantes', mov.comprobante.id);

  // La fecha elegida al registrar tiene que llegar al servidor (antes se ignoraba).
  const creado = await esperar(await crearEgreso(tokenA, { razon: 'Cubiertas', monto: 100000, cat: 'Taller', fecha: ayer }, pdf('original')), 201);
  const mov = (await creado.json()).mov;
  assert.equal(mov.date, ayer);
  assert.ok(existsSync(archivoDe(mov)), 'el comprobante se guarda en disco');
  assert.equal((await crearEgreso(tokenA, { razon: 'Futuro', monto: 1000, cat: 'Otros', fecha: manana })).status, 400);

  // Editar el gasto: monto, descripción, categoría, fecha y comprobante.
  const editado = await esperar(await editarGasto(tokenA, mov.id, { descripcion: 'Cubiertas nuevas', monto: 150000, cat: 'Mantenimiento', fecha: ayer }, pdf('reemplazo')), 200);
  const movEditado = (await editado.json()).mov;
  assert.equal(movEditado.amount, 150000);
  assert.equal(movEditado.desc, 'Cubiertas nuevas');
  assert.equal(movEditado.cat, 'Mantenimiento');
  assert.equal(movEditado.date, ayer);
  assert.notEqual(movEditado.comprobante.id, mov.comprobante.id);
  assert.equal(existsSync(archivoDe(mov)), false, 'el comprobante reemplazado se borra');

  assert.equal((await editarGasto(tokenA, mov.id, { fecha: manana })).status, 400);
  assert.equal((await editarGasto(tokenA, mov.id, { monto: 0 })).status, 400);
  assert.equal((await editarGasto(tokenA, mov.id, { cat: 'Invisible' })).status, 400);
  assert.equal((await editarGasto(tokenB, mov.id, { monto: 999 })).status, 404, 'no se edita un gasto ajeno');

  // Quitar el comprobante sin subir otro.
  const sinAdjunto = await editarGasto(tokenA, mov.id, { quitarComprobante: 1 });
  assert.equal(sinAdjunto.status, 200);
  assert.equal((await sinAdjunto.json()).mov.comprobante, undefined);
  assert.equal(existsSync(archivoDe(movEditado)), false);

  // Pagos: se editan monto, fecha, medio y nota; chofer y auto no.
  const pagoCreado = await esperar(await fetch(base + '/api/pagos', {
    method: 'POST',
    headers: { ...auth(tokenA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver: 'Chofer A', carId: 'a', fecha: ayer, monto: 50000, tipo: 'pago' }),
  }), 201);
  const pago = await pagoCreado.json();

  const editarPago = (token, id, campos) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, String(v));
    return fetch(`${base}/api/pagos/${id}`, { method: 'PATCH', headers: auth(token), body: fd });
  };
  const pagoEditado = await esperar(await editarPago(tokenA, pago.id, { monto: 70000, fecha: ayer, medio: 'Transferencia', nota: 'Corregido' }), 200);
  const pagoJson = (await pagoEditado.json()).pago;
  assert.equal(pagoJson.monto, 70000);
  assert.equal(pagoJson.medio, 'Transferencia');
  assert.equal(pagoJson.nota, 'Corregido');
  assert.equal(pagoJson.driver, 'Chofer A');
  assert.equal(pagoJson.carId, 'a');
  assert.equal((await editarPago(tokenA, pago.id, { fecha: manana })).status, 400);
  assert.equal((await editarPago(tokenA, pago.id, { monto: 0 })).status, 400);
  assert.equal((await editarPago(tokenB, pago.id, { monto: 999 })).status, 404, 'no se edita un pago ajeno');

  // Borrar: el gasto se va con su archivo y una cuota emitida no se puede tocar.
  const conAdjunto = await crearEgreso(tokenA, { razon: 'Seguro', monto: 20000, cat: 'Seguro', fecha: ayer }, pdf('borrar'));
  const movAdjunto = (await conAdjunto.json()).mov;
  // "Seguro" dejó de ser categoría propia: se agrupa en Otros aunque venga de un
  // cliente viejo.
  assert.equal(movAdjunto.cat, 'Otros');
  const archivoAdjunto = archivoDe(movAdjunto);
  assert.ok(existsSync(archivoAdjunto));
  const borrado = await fetch(`${base}/api/movs/${movAdjunto.id}`, { method: 'DELETE', headers: auth(tokenA) });
  assert.equal(borrado.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM movs WHERE id = ?').get(movAdjunto.id).n, 0);
  assert.equal(existsSync(archivoAdjunto), false, 'el comprobante del gasto borrado no queda huérfano');
  assert.equal((await fetch(`${base}/api/movs/${movAdjunto.id}`, { method: 'DELETE', headers: auth(tokenA) })).status, 404);
  assert.equal((await fetch(`${base}/api/movs/${mov.id}`, { method: 'DELETE', headers: auth(tokenB) })).status, 404);

  const cuota = db.prepare("INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat) VALUES (1,'a','ingreso',10000,?,'Cuota','')").run(ayer);
  assert.equal((await fetch(`${base}/api/movs/${cuota.lastInsertRowid}`, { method: 'DELETE', headers: auth(tokenA) })).status, 404, 'las cuotas no se borran');
  assert.equal((await editarGasto(tokenA, cuota.lastInsertRowid, { monto: 1 })).status, 404, 'las cuotas no se editan');

  const pagoBorrado = await fetch(`${base}/api/pagos/${pago.id}`, { method: 'DELETE', headers: auth(tokenA) });
  assert.equal(pagoBorrado.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM pagos WHERE id = ?').get(pago.id).n, 0);
  assert.equal((await fetch(`${base}/api/pagos/${pago.id}`, { method: 'DELETE', headers: auth(tokenA) })).status, 404);

  assert.equal((await fetch(`${base}/api/movs/${mov.id}`, { method: 'DELETE' })).status, 401, 'sin sesión no se borra');
});
