const Database = require('better-sqlite3');
const db = new Database('.localdata/miflota.db');
const cars = db.prepare("SELECT plate, model, estado, last_service_date, service_cada, service_unidad, seguro_date FROM cars WHERE estado != 'baja'").all();
const TODAY = new Date('2026-08-10T00:00:00Z');
function addD(d, n) { return new Date(d.getTime() + n * 864e5); }
function addM(d, n) { const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + n); return r; }
function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 864e5); }
let svcAlerts = 0, segAlerts = 0, tallerAlerts = 0;
for (const c of cars) {
  const last = new Date(c.last_service_date + 'T00:00:00Z');
  const next = c.service_unidad === 'meses' ? addM(last, c.service_cada) : addD(last, c.service_cada);
  const dLeft = daysBetween(TODAY, next);
  if (dLeft <= 15) { svcAlerts++; console.log('SVC', c.plate, dLeft); }
  const seg = new Date(c.seguro_date + 'T00:00:00Z');
  const segLeft = daysBetween(TODAY, seg);
  if (segLeft <= 20) { segAlerts++; console.log('SEG', c.plate, segLeft); }
  if (c.estado === 'taller') { tallerAlerts++; console.log('TALLER', c.plate); }
}
console.log({ svcAlerts, segAlerts, tallerAlerts, total: cars.length });
