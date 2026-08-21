import type { Mov, Pago, PagoTipo } from './types';

/**
 * Imputación de pagos a cuotas.
 *
 * Un pago no dice a qué cuota va: entra como plata a favor del chofer y se
 * reparte sobre lo que debe, de lo más viejo a lo más nuevo. Eso hace que la
 * deuda vieja se cierre siempre primero —nunca envejece en silencio mientras
 * se pagan las nuevas— y, sobre todo, deja que el pago conserve su fecha real
 * sin arrastrar la de la cuota que cancela: la caja de agosto es la plata que
 * entró en agosto, aunque salde una cuota de junio.
 *
 * Se recalcula en cada lectura en vez de guardarse. Con esto un pago cargado
 * con fecha atrasada se acomoda solo en el lugar que le corresponde, y nunca
 * hay dos versiones de la verdad que puedan quedar desfasadas.
 */

/** Un pedazo de un pago aplicado a una cuota concreta. */
export interface Aplicacion {
  pagoId: number;
  movId: number;
  monto: number;
  /** Del pago, no del cargo: es la fecha en la que entró la plata. */
  fecha: Date;
  /** Del cargo, no del pago: es el auto que generó esa cuota. */
  carId: string;
  /** Identidad del chofer (id de `drivers`) o, en datos viejos sin id, su
   *  nombre. Agrupa la imputación por chofer estable. */
  driver: string | number;
  tipo: PagoTipo;
}

export interface Imputacion {
  aplicaciones: Aplicacion[];
  /** Id de cuota → cuánto se le imputó, contando pagos y ajustes. */
  cobrado: Map<number, number>;
  /** Chofer → plata suya que todavía no se imputó a ninguna cuota. Aparece
   *  cuando paga de más o por adelantado; se consume sola con la cuota que
   *  viene, porque la imputación se rehace entera en cada lectura. */
  saldoAFavor: Map<string | number, number>;
}

interface Cuenta {
  cargos: Mov[];
  pagos: Pago[];
}

/**
 * @param cargos  Movimientos de tipo ingreso: las cuotas emitidas.
 * @param pagos   Pagos y ajustes registrados.
 * @param choferDe  A quién le corresponde una cuota. Devuelve el id estable
 *   del chofer (o el nombre como fallback en datos viejos), no el del auto de
 *   hoy: un chofer conserva su deuda aunque cambie de vehículo.
 */
export function imputar(cargos: Mov[], pagos: Pago[], choferDe: (m: Mov) => string | number): Imputacion {
  const aplicaciones: Aplicacion[] = [];
  const cobrado = new Map<number, number>();
  const saldoAFavor = new Map<string | number, number>();

  // La deuda es del chofer, no del auto: si cambió de vehículo, lo que pague
  // tiene que poder cancelar lo que quedó debiendo en el anterior.
  const cuentas = new Map<string | number, Cuenta>();
  const cuenta = (d: string | number) => {
    let c = cuentas.get(d);
    if (!c) cuentas.set(d, (c = { cargos: [], pagos: [] }));
    return c;
  };
  for (const m of cargos) cuenta(choferDe(m)).cargos.push(m);
  for (const p of pagos) cuenta(p.driverId != null ? p.driverId : p.driver).pagos.push(p);

  for (const [driver, c] of cuentas) {
    // El id desempata las fechas iguales para que la imputación sea estable:
    // dos cuotas del mismo día tienen que resolverse siempre en el mismo orden.
    c.cargos.sort((a, b) => +a.date - +b.date || a.id - b.id);
    c.pagos.sort((a, b) => +a.fecha - +b.fecha || a.id - b.id);

    let i = 0;
    let falta = c.cargos.length ? c.cargos[0].amount : 0;
    let credito = 0;

    for (const p of c.pagos) {
      let resto = p.monto;
      while (resto > 0 && i < c.cargos.length) {
        const aplica = Math.min(resto, falta);
        if (aplica > 0) {
          const cargo = c.cargos[i];
          aplicaciones.push({ pagoId: p.id, movId: cargo.id, monto: aplica, fecha: p.fecha, carId: cargo.carId, driver, tipo: p.tipo });
          cobrado.set(cargo.id, (cobrado.get(cargo.id) ?? 0) + aplica);
          resto -= aplica;
          falta -= aplica;
        }
        // Cuota saldada (o emitida en cero): sigue la próxima.
        if (falta === 0) {
          i++;
          falta = i < c.cargos.length ? c.cargos[i].amount : 0;
        }
      }
      // Lo que sobró después de cancelar todo lo emitido queda a favor.
      credito += resto;
    }
    if (credito > 0) saldoAFavor.set(driver, credito);
  }

  return { aplicaciones, cobrado, saldoAFavor };
}
