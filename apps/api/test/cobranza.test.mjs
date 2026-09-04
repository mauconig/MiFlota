import test from 'node:test';
import assert from 'node:assert/strict';
import { imputar } from '../dist/cobranza.js';

const cargo = (id, driverId, date, amount) => ({
  id, car_id: `c${driverId}`, type: 'ingreso', amount, date, descripcion: '', cat: null,
  estado: 'pendiente', driver: `Chofer ${driverId}`, driver_id: driverId,
  comprobante: null, comprobante_nombre: null, comprobante_tipo: null, mano_obra: 0,
});

const pago = (id, driverId, fecha, monto) => ({
  id, owner_id: 1, car_id: `c${driverId}`, driver: `Chofer ${driverId}`, driver_id: driverId,
  fecha, monto, tipo: 'pago', medio: 'Transferencia', nota: null,
  comprobante: null, comprobante_nombre: null, comprobante_tipo: null,
});

const cargos = [cargo(1, 2, '2026-08-31', 1_000_000), cargo(2, 2, '2026-09-01', 190_000)];
const choferDe = (m) => m.driver_id;

function deudaDe(cargosActuales, pagosActuales) {
  const { cobrado } = imputar(cargosActuales, pagosActuales, choferDe);
  return cargosActuales.reduce((total, row) => total + row.amount - (cobrado.get(row.id) ?? 0), 0);
}

test('arrastra deuda de agosto al mes siguiente', () => {
  assert.equal(deudaDe(cargos, []), 1_190_000);
  assert.equal(deudaDe(cargos, [pago(1, 2, '2026-09-02', 200_000)]), 990_000);
});

test('aplica pagos FIFO y distingue saldo a favor', () => {
  const completo = imputar(cargos, [pago(1, 2, '2026-09-02', 1_190_000)], choferDe);
  assert.equal(completo.cobrado.get(1), 1_000_000);
  assert.equal(completo.cobrado.get(2), 190_000);
  assert.equal(deudaDe(cargos, [pago(1, 2, '2026-09-02', 1_190_000)]), 0);

  const excedente = imputar(cargos, [pago(1, 2, '2026-09-02', 1_300_000)], choferDe);
  assert.equal(excedente.saldoAFavor.get('2'), 110_000);
});

test('no mezcla deudas entre choferes', () => {
  const deOtro = cargo(3, 3, '2026-09-01', 500_000);
  const resultado = imputar([...cargos, deOtro], [pago(1, 2, '2026-09-02', 1_190_000)], choferDe);
  assert.equal(resultado.cobrado.get(3) ?? 0, 0);
  assert.equal(deudaDe([deOtro], []), 500_000);
});
