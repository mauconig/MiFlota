import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import * as XLSX from 'xlsx';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoy = iso(new Date());

test('el reporte imprime la nota de cada gasto y la exporta al Excel', { timeout: 60000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'miflota-reporte-'));
  process.env.MIFLOTA_DB = join(dir, 'data.db');
  const { openDb } = await import('../dist/db.js');
  const { migrarAuth, crearSesion } = await import('../dist/auth.js');
  const db = openDb();
  migrarAuth(db);
  db.exec("INSERT INTO users(id,usuario,nombre,pass_hash,creado) VALUES (1,'a','A','unused','2026-09-01')");
  db.exec("INSERT INTO cars(id,owner_id,plate,model,year,estado,driver) VALUES ('a',1,'OWNER1','Model 1',2020,'activo','Chofer A')");
  const token = crearSesion(db, 1).token;

  const notaLarga = 'Se cambió el aceite y el filtro. '.repeat(45).trim(); // ~1600 caracteres
  db.prepare("INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, nota, cat) VALUES (1,'a','egreso',450000,?,'Cambio de aceite',?,'Mantenimiento')").run(hoy, notaLarga);
  db.prepare("INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, nota, cat) VALUES (1,'a','egreso',120000,?,'Cubierta','Nota corta','Taller')").run(hoy);
  db.prepare("INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat) VALUES (1,'a','egreso',30000,?,'Peaje','Otros')").run(hoy);

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
  const auth = { Authorization: 'Bearer ' + token };
  let ready = false;
  for (let n = 0; n < 400; n++) {
    try {
      if ((await fetch(base + '/api/health')).ok) { ready = true; break; }
    } catch { /* todavía no levantó */ }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(ready, output);

  const exportar = (format) => fetch(base + '/api/reports/export', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ period: { type: 'custom', from: hoy, to: hoy }, include: 'gastos', carIds: 'todos', categories: 'todas', format }),
  });

  const pdfRes = await exportar('pdf');
  assert.equal(pdfRes.status, 200);
  const pdf = await pdfRes.json();
  assert.match(pdf.file.name, /\.pdf$/);
  const pdfFile = await fetch(base + pdf.file.url, { headers: auth });
  assert.equal(pdfFile.status, 200);
  const pdfBytes = Buffer.from(await pdfFile.arrayBuffer());
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF', 'el PDF se genera con las notas');

  const xlsxRes = await exportar('xlsx');
  assert.equal(xlsxRes.status, 200);
  const xlsx = await xlsxRes.json();
  const xlsxFile = await fetch(base + xlsx.file.url, { headers: auth });
  const book = XLSX.read(Buffer.from(await xlsxFile.arrayBuffer()), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(book.Sheets.Gastos, { header: 1 });
  assert.deepEqual(rows[0], ['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Nota', 'Total gasto']);
  const aceite = rows.find((row) => row[3] === 'Cambio de aceite');
  assert.equal(aceite[4], notaLarga, 'la nota larga viaja completa');
  const cubierta = rows.find((row) => row[3] === 'Cubierta');
  assert.equal(cubierta[4], 'Nota corta');

  // El flujo viejo de notas del reporte ya no existe.
  const viejo = await fetch(base + '/api/report-notes/preview', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(viejo.status, 404);
});
