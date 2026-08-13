import type { MovRow, PagoRow } from './db.js';

/**
 * Puerto de apps/admin-web/src/cobranza.ts y apps/admin-mobile/src/cobranza.ts
 * (idénticos entre sí) para poder calcular el resumen de un chofer del lado
 * del servidor, sin mandarle a apps/driver todo el historial de movs/pagos
 * de la flota solo para que compute su propio saldo. La matemática se
 * mantiene igual a propósito — la única diferencia intencional es comparar
 * fechas como string ISO (`YYYY-MM-DD`, ordenan lexicográficamente) en vez
 * de `Date`, porque acá se trabaja directo sobre las filas crudas de la base.
 */

export interface Aplicacion {
  pagoId: number;
  movId: number;
  monto: number;
  fecha: string;
  carId: string;
  driver: string;
  tipo: string;
}

export interface Imputacion {
  aplicaciones: Aplicacion[];
  cobrado: Map<number, number>;
  saldoAFavor: Map<string, number>;
}

interface Cuenta {
  cargos: MovRow[];
  pagos: PagoRow[];
}

/**
 * @param cargos  Movimientos de tipo ingreso: las cuotas emitidas.
 * @param pagos   Pagos y ajustes registrados.
 * @param choferDe  A quién le corresponde una cuota. Se pasa de afuera porque
 *   depende del chofer que tenía el auto ese día, no del que lo tiene hoy.
 */
export function imputar(cargos: MovRow[], pagos: PagoRow[], choferDe: (m: MovRow) => string): Imputacion {
  const aplicaciones: Aplicacion[] = [];
  const cobrado = new Map<number, number>();
  const saldoAFavor = new Map<string, number>();

  const cuentas = new Map<string, Cuenta>();
  const cuenta = (d: string) => {
    let c = cuentas.get(d);
    if (!c) cuentas.set(d, (c = { cargos: [], pagos: [] }));
    return c;
  };
  for (const m of cargos) cuenta(choferDe(m)).cargos.push(m);
  for (const p of pagos) cuenta(p.driver).pagos.push(p);

  for (const [driver, c] of cuentas) {
    c.cargos.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    c.pagos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id));

    let i = 0;
    let falta = c.cargos.length ? c.cargos[0].amount : 0;
    let credito = 0;

    for (const p of c.pagos) {
      let resto = p.monto;
      while (resto > 0 && i < c.cargos.length) {
        const aplica = Math.min(resto, falta);
        if (aplica > 0) {
          const cargo = c.cargos[i];
          aplicaciones.push({ pagoId: p.id, movId: cargo.id, monto: aplica, fecha: p.fecha, carId: cargo.car_id, driver, tipo: p.tipo });
          cobrado.set(cargo.id, (cobrado.get(cargo.id) ?? 0) + aplica);
          resto -= aplica;
          falta -= aplica;
        }
        if (falta === 0) {
          i++;
          falta = i < c.cargos.length ? c.cargos[i].amount : 0;
        }
      }
      credito += resto;
    }
    if (credito > 0) saldoAFavor.set(driver, credito);
  }

  return { aplicaciones, cobrado, saldoAFavor };
}
