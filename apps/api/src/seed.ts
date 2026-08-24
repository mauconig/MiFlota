/**
 * Generador de la flota inicial. Es el mismo que corría en el browser, movido al
 * servidor: ahora los datos se siembran una sola vez en SQLite en lugar de
 * regenerarse en cada carga. El PRNG sembrado se conserva tal cual para que la
 * base arranque con exactamente la misma flota que mostraba la app.
 */

export type Estado = 'activo' | 'taller' | 'baja';
export type MovEstado = 'pagado' | 'pendiente' | 'parcial';

export interface SeedCar {
  id: string;
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  estado: Estado;
  /** Identificador del rastreador GPS instalado. Vacío en las bajas. */
  gpsTag: string;
  kilometraje: number;
  seguroNombre: string;
  serviceCadaMeses: number;
  lastServiceDate: Date;
  seguroDate: Date;
  seguroCosto: number;
}

export interface SeedMov {
  id: number;
  carId: string;
  type: 'ingreso' | 'egreso';
  /** Lo facturado. Los egresos no llevan `cobrado`. */
  amount: number;
  cobrado?: number;
  date: Date;
  desc: string;
  cat?: string;
  estado?: MovEstado;
  /** Chofer al que corresponde el cobro. Solo en ingresos. */
  driver?: string;
}

/** Fecha de referencia de la flota de demostración. */
export const SEED_TODAY = new Date(Date.UTC(2026, 7, 28));

function addD(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 864e5);
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE: [string, string, number, string, number, Estado][] = [
  ['HBTC 412', 'Toyota Vitz', 2015, 'Carlos Benítez', 190000, 'activo'],
  ['GKPD 883', 'Toyota Vitz', 2014, 'Miguel Ojeda', 185000, 'activo'],
  ['HCVR 105', 'Kia Picanto', 2017, 'Rodrigo Villalba', 175000, 'activo'],
  ['GXNM 774', 'Hyundai i10', 2016, 'Óscar Giménez', 175000, 'activo'],
  ['HDFS 236', 'Chevrolet Onix', 2019, 'Fernando Cáceres', 210000, 'activo'],
  ['GTWQ 590', 'Toyota Etios', 2018, 'Julio Franco', 200000, 'activo'],
  ['HAKL 928', 'Honda Fit', 2015, 'Marcos Aguilar', 190000, 'activo'],
  ['GZBV 341', 'Nissan March', 2016, 'Diego Rotela', 180000, 'activo'],
  ['HEJP 067', 'Toyota Yaris', 2020, 'Sergio Duarte', 215000, 'activo'],
  ['GYRD 455', 'Kia Rio', 2017, 'Iván Acosta', 195000, 'activo'],
  ['HBMX 719', 'Hyundai HB20', 2018, 'Pablo Martínez', 195000, 'activo'],
  ['GVLC 208', 'Toyota Vitz', 2013, 'Hugo Ferreira', 170000, 'activo'],
  ['HCQT 634', 'Toyota Vitz', 2014, 'Cristian Espínola', 180000, 'activo'],
  ['BCDF 221', 'Chevrolet Onix', 2018, 'Nelson Vera', 200000, 'taller'],
  ['GRHZ 990', 'Nissan Tiida', 2011, 'Sin chofer', 0, 'baja'],
];

const TALLERD = ['Cambio de aceite y filtros', 'Pastillas de freno', 'Reparación suspensión', 'Correa de distribución', 'Neumáticos nuevos'];
const DOCD = ['Habilitación municipal', 'Cédula verde', 'Patente'];

/** Los rastreadores se identifican por color; cuando dos autos comparten
 *  color, una letra los desempata. El primero de cada color va sin letra:
 *  'Gris', 'Gris A', 'Gris B'. */
const GPS_COLORS = ['Gris', 'Negro', 'Azul', 'Rojo', 'Blanco', 'Verde'];
function gpsLabel(i: number): string {
  const color = GPS_COLORS[i % GPS_COLORS.length];
  const n = Math.floor(i / GPS_COLORS.length);
  return n === 0 ? color : color + ' ' + String.fromCharCode(65 + n - 1);
}

export function generateFleetData(): { cars: SeedCar[]; movs: SeedMov[] } {
  const R = makeRng(7);

  let gpsIdx = 0;
  const cars: SeedCar[] = BASE.map((b, i) => {
    // Se consume igual que antes para no correr la secuencia del PRNG y que
    // la flota sembrada siga siendo idéntica a la original.
    R();
    // Días desde el último service. Los valores replican las mismas fracciones
    // del intervalo que usaba el esquema por km (94% / 32% / 61% de 6 meses),
    // para que sigan siendo los mismos autos los que aparecen por vencer.
    const gapDias = [172, 59, 112][i % 3] + Math.round(R() * 15);
    const estado = b[5];
    return {
      id: 'c' + i,
      plate: b[0],
      model: b[1],
      year: b[2],
      driver: b[3],
      cuota: b[4],
      estado,
      gpsTag: estado === 'baja' ? '' : gpsLabel(gpsIdx++),
      kilometraje: 82000 + i * 6700,
      seguroNombre: ['Mapfre', 'Sancor', 'Aseguradora Paraguaya'][i % 3],
      serviceCadaMeses: 6,
      lastServiceDate: addD(SEED_TODAY, -gapDias),
      // Los offsets son los que tenía la versión anterior en días restantes,
      // convertidos a la fecha de vencimiento que representaban.
      seguroDate: addD(SEED_TODAY, ((i * 71) % 360) - 5),
      // Sin tocar el PRNG, para no correrle la secuencia a los movimientos. El
      // rango coincide con el de los egresos de categoría Seguro que se generan
      // más abajo, así que el costo y lo que efectivamente se paga concuerdan.
      seguroCosto: 400000 + ((i * 17) % 12) * 10000,
    };
  });

  const movs: SeedMov[] = [];
  let id = 1;

  cars.forEach((c) => {
    if (c.estado === 'baja') return;
    for (let d = 90; d >= 0; d -= 3) {
      if (c.estado === 'taller' && d < 12) continue;
      if (R() < 0.08) continue;
      let estado: MovEstado = 'pagado';
      if (d <= 3 && R() < 0.35) estado = 'pendiente';
      else if (R() < 0.06) estado = 'parcial';
      // Se factura siempre la cuota completa; lo que cambia es cuánto entró.
      const facturado = c.cuota * 3;
      movs.push({
        id: id++,
        carId: c.id,
        type: 'ingreso',
        amount: facturado,
        cobrado: estado === 'pagado' ? facturado : estado === 'parcial' ? Math.round(facturado * 0.5) : 0,
        date: addD(SEED_TODAY, -d),
        estado,
        desc: 'Cuota diaria × 3 días',
        driver: c.driver,
      });
    }
    const nE = 6 + Math.floor(R() * 5);
    for (let k = 0; k < nE; k++) {
      const d = Math.floor(R() * 91);
      const r = R();
      let cat: string;
      let amt: number;
      let desc: string;
      if (r < 0.32) {
        cat = 'Taller';
        amt = 250000 + R() * 1100000;
        desc = TALLERD[Math.floor(R() * TALLERD.length)];
      } else if (r < 0.52) {
        cat = 'Combustible';
        amt = 120000 + R() * 180000;
        desc = 'Carga de combustible';
      } else if (r < 0.7) {
        cat = 'Seguro';
        amt = 380000 + R() * 60000;
        desc = 'Cuota mensual seguro';
      } else if (r < 0.82) {
        cat = 'Multas';
        amt = 150000 + R() * 350000;
        desc = 'Multa de tránsito';
      } else if (r < 0.92) {
        cat = 'Documentación';
        amt = 150000 + R() * 250000;
        desc = DOCD[Math.floor(R() * DOCD.length)];
      } else {
        cat = 'Otros';
        amt = 80000 + R() * 220000;
        desc = 'Lavado y varios';
      }
      movs.push({ id: id++, carId: c.id, type: 'egreso', cat, amount: Math.round(amt / 1000) * 1000, date: addD(SEED_TODAY, -d), desc });
    }
  });

  movs.push({ id: id++, carId: 'c13', type: 'egreso', cat: 'Taller', amount: 2850000, date: addD(SEED_TODAY, -5), desc: 'Motor — reparación mayor' });

  return { cars, movs };
}
