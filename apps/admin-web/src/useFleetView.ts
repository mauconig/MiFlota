import { useCallback, useMemo, useRef } from 'react';
import type { Car, CarLocation, Mov, Pago, UIState, NewCarForm, NewDriverForm, EditCarForm } from './types';
import type { DriverCredentials, NuevoCarPayload, NuevoPagoPayload, ReportExportPayload } from './api';
import type { Aplicacion } from './cobranza';
import { imputar } from './cobranza';
import { CATS, CATCOLORS } from './data';
import { COLORS, TODAY, addD, addM, dLbl, dLblFull, daysBetween, durLbl, fmt, fmtShort, initials, isoLocal, miles, statusColor, numFromInput } from './format';

const UMBRAL_VERDE = 2500000;

/** Días de aviso antes de que venza el service. */
const SVC_AVISO_DIAS = 15;

/** Tope del intervalo de service. Es el mismo que valida el servidor: si acá
 *  pasara un valor mayor, se guardaría con el 6 por defecto sin avisar. */
const SVC_MAX = 3650;

/** Tope de meses entre renovaciones de la póliza. Coincide con el del servidor. */
const SEG_CADA_MAX = 120;

const svcConfigured = (c: Car) => c.serviceCada > 0 && c.lastServiceDate.getFullYear() > 1970;
const svcNextDate = (c: Car) => (c.serviceUnidad === 'meses' ? addM(c.lastServiceDate, c.serviceCada) : addD(c.lastServiceDate, c.serviceCada));
/** "cada 6 meses" / "cada 90 días" */
const svcIntervalo = (n: number, u: Car['serviceUnidad']) => n + ' ' + (u === 'meses' ? (n === 1 ? 'mes' : 'meses') : n === 1 ? 'día' : 'días');
/** Días que faltan para el próximo service (negativo = vencido). */
const svcDaysLeft = (c: Car) => daysBetween(TODAY, svcNextDate(c));
/** "vencido hace 8 días" / "vence hoy" / "en 3 meses" */
/** Días que faltan para el vencimiento de un documento (negativo = vencido). */
const docLeft = (d: Date) => daysBetween(TODAY, d);
const svcLeftLbl = (d: number, largo = false) => (d < 0 ? (largo ? 'vencido hace ' : 'vencido ') + durLbl(d) : d === 0 ? (largo ? 'vence hoy' : 'hoy') : (largo ? 'vence en ' : 'en ') + durLbl(d));

export interface Chip {
  label: string;
  bg: string;
  fg: string;
  bd: string;
  /** Si está seleccionado. Los colores ya lo reflejan, pero un control que se
      dibuja distinto (un segmentado, por ejemplo) necesita el dato crudo. */
  on: boolean;
  pick: () => void;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge: string;
  bg: string;
  fg: string;
  badgeFg: string;
  pick: () => void;
}

export interface ColItem {
  key: string;
  label: string;
  align: 'left' | 'right';
  fg: string;
  arrow: string;
  sort: () => void;
}

export interface VehicleRow {
  id: string;
  pos: number;
  plate: string;
  rawModel: string;
  model: string;
  driver: string;
  cuota: string;
  svc: string;
  svcFg: string;
  ing: string;
  egr: string;
  net: string;
  netColor: string;
  netPct: string;
  gpsTag: string;
  gpsFg: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  rowBg: string;
  open: () => void;
}

export interface KpiItem {
  label: string;
  value: string;
  delta: string;
  bg: string;
  bd: string;
  labelFg: string;
  valueFg: string;
  deltaFg: string;
}

export interface CatItem {
  label: string;
  amt: string;
  color: string;
  pct: string;
  share: string;
}

export interface AlertFull {
  plate: string;
  model: string;
  gpsTag: string;
  text: string;
  kind: string;
  dot: string;
  tagBg: string;
  tagFg: string;
  open: () => void;
}

export interface PendFull {
  initials: string;
  driver: string;
  plate: string;
  desc: string;
  dateLbl: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  /** Lo cobrado. En un parcial, "270k de 540k" para que no se lea a medias. */
  amt: string;
  /** Lo que falta cobrar. Vacío si no debe nada. */
  debe: string;
  debeFg: string;
  sort: Record<string, string | number>;
  open: () => void;
}

export interface AppliedPaymentView {
  id: number;
  dateLbl: string;
  amount: string;
  type: string;
  typeBg: string;
  typeFg: string;
  medio: string;
  note: string;
}

export interface MovementDetailView {
  id: string;
  type: string;
  typeBg: string;
  typeFg: string;
  amount: string;
  amountFg: string;
  dateLbl: string;
  driver: string;
  vehicle: string;
  medio: string;
  category: string;
  note: string;
  comprobante: { url: string; name: string; type: string } | null;
  appliedQuotas: { id: number; dateLbl: string; description: string; vehicle: string; amount: string }[];
  items: { nombre: string; cantidad: number; costoUnitario: string; subtotal: string }[];
  manoObra: string;
  saldoAFavor: string;
  canDelete: boolean;
  close: () => void;
  delete: () => Promise<void>;
}

export interface QuotaDetailView {
  description: string;
  dateLbl: string;
  driver: string;
  vehicle: string;
  billed: string;
  collected: string;
  due: string;
  status: string;
  statusBg: string;
  statusFg: string;
  appliedPayments: AppliedPaymentView[];
  close: () => void;
}

/** Una fila del libro de pagos. */
export interface PagoFull {
  id: number;
  initials: string;
  driver: string;
  /** Auto en el que andaba, o "—" si el pago no quedó atado a ninguno. */
  carLbl: string;
  dateLbl: string;
  monto: string;
  /** "Pago" o "Ajuste": un ajuste cancela deuda pero no es plata que entró. */
  tag: string;
  tagBg: string;
  tagFg: string;
  nota: string;
  sort: Record<string, string | number>;
  open: () => void;
}

export interface PagoFormView {
  /** Identidad del chofer elegido: su `driverId`, o el nombre en datos viejos. */
  driver: string | number;
  setDriver: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Choferes de la flota, con lo que debe cada uno al lado. */
  opciones: { id: string | number; label: string }[];
  fecha: string;
  setFecha: (iso: string) => void;
  hoy: string;
  monto: string;
  setMonto: (v: string) => void;
  tipoOpts: Chip[];
  nota: string;
  setNota: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Qué va a pasar con esta plata, resuelto antes de guardar. */
  destino: string;
  guardando: boolean;
  guardar: () => void;
  cerrar: () => void;
}

export interface TopCarItem {
  pos: string;
  plate: string;
  driver: string;
  net: string;
}

export interface ChoferItem {
  initials: string;
  name: string;
  carLbl: string;
  cuota: string;
  cobrado: string;
  pend: string;
  pendFg: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  open: () => void;
}

export interface DriverDetailView {
  initials: string;
  name: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  periodShort: string;
  cobrado: string;
  pendiente: string;
  pendienteFg: string;
  cumplimiento: string;
  cumplimientoPct: string;
  cumplimientoFg: string;
  /** Plata suya todavía sin imputar: pagó de más o por adelantado. Vacío si no
      tiene, que es el caso normal. */
  aFavor: string;
  plate: string;
  rawModel: string;
  model: string;
  estado: string;
  estadoBg: string;
  estadoFg: string;
  cuota: string;
  cuotasLbl: string;
  pagos: DetailMov[];
  sinPagos: boolean;
  verVehiculo: () => void;
  editar: () => void;
  quitar: () => void;
}

export interface MovRow {
  pos: number;
  dateLbl: string;
  sign: string;
  iconBg: string;
  iconFg: string;
  desc: string;
  sub: string;
  amt: string;
  amtFg: string;
  items?: { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[];
  manoObra?: number;
}

export interface LedgerRow {
  id: string;
  dateLbl: string;
  type: 'ingreso' | 'egreso';
  typeLbl: string;
  vehicle: string;
  driver: string;
  desc: string;
  category: string;
  note: string;
  medio: string;
  amount: string;
  amountFg: string;
  comprobante: string;
  items: { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[];
  manoObra: number;
}

export interface MovementMonth {
  key: string;
  label: string;
  year: string;
  count: string;
  income: string;
  expense: string;
  net: string;
  active: boolean;
  select: () => void;
}

export interface DetailDoc {
  label: string;
  txt: string;
  /** Segunda línea en gris: el costo y cada cuánto se renueva. */
  sub: string;
  fg: string;
  renew: () => void;
}

export interface DetailMonth {
  label: string;
  ing: string;
  egr: string;
  net: string;
  netFg: string;
  ingPct: string;
  egrPct: string;
}

export interface DetailMov {
  id?: string;
  dateLbl: string;
  desc: string;
  sub: string;
  /** URL del comprobante, o '' si el movimiento no tiene uno. */
  comprobante: string;
  amt: string;
  amtFg: string;
  iconBg: string;
  iconFg: string;
  sign: string;
  open?: () => void;
}

export interface DetailView {
  plate: string;
  rawModel: string;
  model: string;
  driver: string;
  hasDriver: boolean;
  estado: string;
  estadoBg: string;
  estadoFg: string;
  ing: string;
  egr: string;
  net: string;
  netFg: string;
  cuotaFmt: string;
  gpsTag: string;
  gpsFg: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    age: string;
    stale: boolean;
    mapsUrl: string;
  } | null;
  cobradas: string;
  pendientes: string;
  svcLbl: string;
  svcSub: string;
  svcFg: string;
  svcPct: string;
  svcBar: string;
  kilometraje: string;
  kilometrajeSub: string;
  /** Intervalo en edición: el campo muestra el borrador, no lo guardado. */
  svcCada: string;
  svcSetCada: (e: React.ChangeEvent<HTMLInputElement>) => void;
  svcUnidadOpts: Chip[];
  svcGuardar: () => void;
  svcPuedeGuardar: boolean;
  svcHint: string;
  agregarDatos: () => void;
  docs: DetailDoc[];
  estadoOpts: Chip[];
  months: DetailMonth[];
  movs: DetailMov[];
  markService: () => void;
  verHistorial: () => void;
  editDriver: () => void;
  clearDriver: () => void;
  borrar: () => void;
}

export interface CarOption {
  id: string;
  label: string;
}

export interface View {
  kicker: string;
  pageTitle: string;
  headerSub: string;
  cierreMsg: string;
  sResumen: boolean;
  sFlota: boolean;
  sChoferes: boolean;
  sAlertas: boolean;
  sReportes: boolean;
  sCobros: boolean;
  sMovimientos: boolean;
  navItems: NavItem[];
  periodChips: Chip[];
  isCustom: boolean;
  cFrom: string;
  cTo: string;
  onFrom: (iso: string) => void;
  onTo: (iso: string) => void;
  montosLbl: string;
  toggleMontos: () => void;

  kpis: KpiItem[];
  goFlota: () => void;
  goFlotaTop: () => void;
  goAlertas: () => void;
  goReportes: () => void;
  goCobros: () => void;
  goMovimientos: (carId?: string) => void;

  fleetFilters: Chip[];
  cols: ColItem[];
  colsF: ColItem[];
  rows: VehicleRow[];
  flotaRows: VehicleRow[];
  openCarModal: () => void;
  carQ: string;
  setCarQ: (e: React.ChangeEvent<HTMLInputElement>) => void;

  periodShort: string;
  egrTotal: string;
  ingTotal: string;
  netTotal: string;
  cats: CatItem[];

  alertCount: number;
  alertsSummary: string;
  alertsFull: AlertFull[];
  alertKindChips: Chip[];
  alertQ: string;
  setAlertQ: (e: React.ChangeEvent<HTMLInputElement>) => void;

  pendCount: number;
  pendSummary: string;
  cobrosSub: string;
  cobrosFull: PendFull[];
  pendKindChips: Chip[];
  pendKind: string;
  pendQ: string;
  setPendQ: (e: React.ChangeEvent<HTMLInputElement>) => void;

  cobrosTab: 'cuotas' | 'pagos';
  cobrosTabChips: Chip[];
  pagosFull: PagoFull[];
  pagosSub: string;
  abrirPago: () => void;
  /** Null mientras el modal de pago está cerrado. */
  pagoForm: PagoFormView | null;

  topCars: TopCarItem[];

  choferes: ChoferItem[];
  choferesSub: string;
  chKind: string;
  chKindChips: Chip[];
  openDrvModal: () => void;
  chQ: string;
  setChQ: (e: React.ChangeEvent<HTMLInputElement>) => void;

  movsSub: string;
  movTypeChips: Chip[];
  movCatChips: Chip[];
  movRows: MovRow[];
  movQ: string;
  setMovQ: (e: React.ChangeEvent<HTMLInputElement>) => void;
  movCats: CatItem[];
  movEgrTotal: string;
  movIngTotal: string;
  movNetTotal: string;
  exportar: () => void;
  exportarPdf: () => void;
  movementMonths: MovementMonth[];
  movementRows: LedgerRow[];
  movementTotalRows: number;
  movementPage: number;
  movementPageCount: number;
  movementMonth: string;
  movementExpandedId: string | null;
  movementVehicle: string;
  movementVehicleChips: Chip[];
  movementTypeChips: Chip[];
  movementCategoryChips: Chip[];
  setMovementVehicle: (id: string) => void;
  movementPrevPage: () => void;
  movementNextPage: () => void;
  movementOpenRow: (id: string) => void;

  movementDetail: MovementDetailView | null;
  quotaDetail: QuotaDetailView | null;

  hasDetail: boolean;
  detail: DetailView;
  closeDetail: () => void;

  confirmOpen: boolean;
  confirmTitulo: string;
  confirmDetalle: string;
  confirmAviso: string;
  confirmBoton: string;
  confirmar: () => void;
  cancelarConfirm: () => void;

  tallerOpen: boolean;
  tallerPlate: string;
  tallerRazon: string;
  tallerMonto: string;
  tallerArchivo: string;
  tallerGuardando: boolean;
  setTallerRazon: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTallerMonto: (v: string) => void;
  setTallerArchivo: (f: File | null) => void;
  tallerGuardar: () => void;
  cerrarTaller: () => void;

  hasDriverDetail: boolean;
  driverDetail: DriverDetailView;
  closeDriverDetail: () => void;

  carModal: boolean;
  editCarModal: boolean;
  editCar: EditCarForm;
  editCarDriverOptions: { value: string; label: string }[];
  editCarChange: <K extends keyof EditCarForm>(key: K, value: EditCarForm[K]) => void;
  editCarSave: () => void;
  editCarClose: () => void;
  editCarDelete: () => void;
  serviceModal: boolean;
  service: UIState['service'];
  serviceVehicle: string;
  serviceSet: (patch: Partial<NonNullable<UIState['service']>>) => void;
  serviceNext: () => void;
  serviceBack: () => void;
  serviceSave: () => void;
  serviceClose: () => void;
  drvModal: boolean;
  ncar: NewCarForm;
  ch: Record<Exclude<keyof NewCarForm, 'serviceUnidad' | 'lastService' | 'seguroVence'>, (e: React.ChangeEvent<HTMLInputElement>) => void>;
  /** Campos que ya entregan el valor formateado, no un evento. */
  setLastService: (iso: string) => void;
  setSeguroVence: (iso: string) => void;
  /** Selector días/meses del alta. */
  ncarUnidadOpts: Chip[];
  /** Hoy en ISO, para topar el <input type="date"> del último service. */
  hoyISO: string;
  ndrv: NewDriverForm;
  dh: {
    name: (e: React.ChangeEvent<HTMLInputElement>) => void;
    carId: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  };
  setNdrvCuota: (v: string) => void;
  drvCredentials: DriverCredentials | null;
  drvCredentialsLoading: boolean;
  drvNeedsCredentials: boolean;
  closeModal: () => void;
  saveCar: () => void;
  previewDrv: () => void;
  backDrv: () => void;
  saveDrv: () => void;
  carOptions: CarOption[];

  hasToast: boolean;
  toastMsg: string;
}

function CH(on: boolean) {
  return { on, bg: on ? COLORS.ink : COLORS.paper, fg: on ? COLORS.paper : '#3d3a34', bd: on ? COLORS.ink : '#e0d6c4' };
}

/** Búsqueda de texto libre: sin distinguir mayúsculas, contra cualquiera de los campos. */
function matches(q: string, ...fields: (string | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

/** Arma un .xlsx real con SheetJS y lo descarga. Solo se usan sus funciones de
 *  escritura (`utils`/`write`): nunca se lee un archivo subido por el usuario,
 *  así que las vulnerabilidades conocidas de la librería, que están en el
 *  parser de lectura, no aplican a este uso.
 *
 *  El import es dinámico porque SheetJS pesa varios cientos de KB y solo hace
 *  falta cuando alguien exporta: cargarlo en el bundle inicial le sumaría ese
 *  peso a toda carga de la app, la usen o no. */
async function downloadXlsx(filename: string, sheetName: string, headerIn: string[], rowsIn: (string | number)[][]) {
  const XLSX = await import('xlsx');
  // Una columna que quedó sin dato en *todas* las filas exportadas es ruido y
  // se cae sola: exportar solo egresos deja "Estado" entero en guiones, y solo
  // ingresos hace lo mismo con "Categoría". La que sí tiene datos se queda,
  // guiones incluidos, porque ahí el guion distingue "no aplica" de "falta".
  const sinDato = (v: string | number | undefined) => v === undefined || v === '' || v === '—';
  const usada = headerIn.map((_, i) => !rowsIn.length || rowsIn.some((r) => !sinDato(r[i])));
  const header = headerIn.filter((_, i) => usada[i]);
  const rows = rowsIn.map((r) => r.filter((_, i) => usada[i]));

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = header.map((_, i) => ({ wch: Math.max(10, ...rows.map((r) => String(r[i] ?? '').length), header[i].length) + 2 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// La exportación usa el endpoint del servidor; se conserva esta función para
// compatibilidad con el código histórico mientras se termina de retirar.
void downloadXlsx;

function blankCar(): NewCarForm {
  return {
    plate: '',
    model: '',
    year: '2018',
    gpsTag: '',
    kilometraje: '',
    lastService: '',
    serviceCada: '',
    serviceUnidad: 'meses',
    // El vencimiento no se presupone: es el dato que hay que mirar en la póliza.
    seguroVence: '',
    seguroNombre: '',
    seguroCada: '',
  };
}

function blankDrv(): NewDriverForm {
  return { name: '', carId: '', cuota: '' };
}

export { blankCar, blankDrv };

const FTAG: Record<Car['estado'], [string, string, string]> = {
  activo: ['Activo', '#eef4f0', '#2e7d5b'],
  taller: ['Taller', '#fdf3e2', '#a8730f'],
  baja: ['Baja', '#f1eeea', '#6b665c'],
};

const KTAG: Record<string, [string, string]> = {
  Service: ['#fdf3e2', '#a8730f'],
  Seguro: ['#eef1f6', '#4a6d99'],
  Taller: ['#f3eefa', '#6b52a1'],
  Kilometraje: ['#fdf3e2', '#a8730f'],
};

const PTAG: Record<string, [string, string]> = {
  Cobrado: ['#eef4f0', '#2e7d5b'],
  Parcial: ['#eef1f6', '#4a6d99'],
  Pendiente: ['#fdf3e2', '#a8730f'],
};


/** Nombre del chofer para mostrar. Si el auto cambió de chofer después de
 *  generado, el cobro se queda con quien lo generó, no con quien maneja el
 *  auto hoy: por eso `m.driver` manda, y el chofer actual del auto es solo el
 *  valor por defecto para movimientos anteriores a este campo. */
const nombreChofer = (m: Mov, c?: Car) => m.driver || c?.driver || 'Sin chofer';

/** Identidad estable del chofer: su `driverId` si lo tiene, o el nombre como
 *  fallback en datos previos a ese campo. Siempre string, porque el valor
 *  viaja en un <select> y los números se serializan a texto; así la clave del
 *  Map y la del formulario siempre coinciden. Sirve para agrupar deuda e
 *  imputar pagos por chofer aunque éste cambie de vehículo. */
const claveChofer = (m: Mov, c?: Car): string => {
  const id = m.driverId != null ? m.driverId : c?.driverId != null ? c.driverId : null;
  return id != null ? String(id) : m.driver || c?.driver || 'Sin chofer';
};

/** Clave del chofer de un auto: su `driverId`, o el nombre como fallback. */
const claveDeCar = (c: Car): string => (c.driverId != null ? String(c.driverId) : c.driver);

/** Chofer al que corresponde un cobro, en texto, para mostrar. */
const paidBy = (m: Mov, c: Car) => nombreChofer(m, c);

/**
 * `fact` y `egr` salen de los movimientos —lo emitido y lo gastado—, pero `ing`
 * sale de las aplicaciones de pagos: es plata que entró, y lo que decide en qué
 * período cae es la fecha del pago, no la de la cuota que cancela. Por eso los
 * dos filtros son distintos y no se pueden unificar.
 *
 * Un ajuste (condonación) baja la deuda pero no es caja, así que no suma acá.
 */
function stats(
  movs: Mov[],
  apls: Aplicacion[],
  fm: (m: Mov) => boolean,
  fa: (a: Aplicacion) => boolean,
  pagos?: Pago[],
  fp?: (p: Pago) => boolean,
) {
  let fact = 0;
  let egr = 0;
  const byCat: Record<string, number> = {};
  movs.forEach((m) => {
    if (!fm(m)) return;
    if (m.type === 'ingreso') {
      fact += m.amount;
    } else {
      egr += m.amount;
      byCat[m.cat!] = (byCat[m.cat!] || 0) + m.amount;
    }
  });
  let ing = 0;
  if (pagos && fp) {
    // Cobrado es caja: un pago válido cuenta aunque todavía no haya una
    // cuota de ingreso contra la cual imputarlo.
    pagos.forEach((p) => {
      if (p.tipo === 'pago' && fp(p)) ing += p.monto;
    });
  } else {
    apls.forEach((a) => {
      if (a.tipo === 'pago' && fa(a)) ing += a.monto;
    });
  }
  // Una cuota impaga no es ganancia: por eso el neto se calcula con lo cobrado.
  return { ing, fact, egr, net: ing - egr, byCat };
}

/** Último instante del día. Los movimientos se parsean al mediodía (ver
 *  `parseDate` en api.ts), así que un rango que corta a las 00:00 de su último
 *  día deja afuera todo lo de esa jornada: sin esto, lo cargado hoy no entra
 *  en "Agosto" ni en "7 días". */
const finDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
/** Arranque del día, para el extremo opuesto del rango. */
const iniDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function range(state: UIState) {
  const k = state.period;
  if (k === 'semana') return { start: addD(TODAY, -6), end: finDia(TODAY), label: 'Últimos 7 días', short: '7 días' };
  if (k === 'jul') {
    const start = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1, 12);
    const end = finDia(new Date(TODAY.getFullYear(), TODAY.getMonth(), 0, 12));
    return { start, end, label: `${MESES_LARGO[start.getMonth()]} ${start.getFullYear()}`, short: 'mes anterior' };
  }
  if (k === 'd90') return { start: addD(TODAY, -89), end: finDia(TODAY), label: 'Últimos 90 días', short: '90 días' };
  if (k === 'custom') {
    let start = new Date(state.cFrom + 'T00:00:00');
    let end = new Date(state.cTo + 'T23:59:59');
    if (isNaN(+start) || isNaN(+end) || end < start) {
      start = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      end = finDia(TODAY);
    }
    return { start, end, label: dLbl(start) + ' – ' + dLbl(end), short: 'el rango' };
  }
  const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1, 12);
  return { start, end: finDia(TODAY), label: `${MESES_LARGO[TODAY.getMonth()]} ${TODAY.getFullYear()}`, short: MESES_LARGO[TODAY.getMonth()] };
}

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function useFleetView(
  cars: Car[],
  movs: Mov[],
  pagos: Pago[],
  locations: CarLocation[],
  state: UIState,
  update: (patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => void,
  persist: {
    patchCar: (id: string, patch: Partial<Car>) => void;
    updateCar: (id: string, patch: Partial<Car>) => Promise<Car>;
    previewDriverCredentials: (id: string, driver: string) => Promise<DriverCredentials>;
    assignDriver: (id: string, payload: DriverCredentials & { driver: string; cuota: number }) => Promise<Car>;
    addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
    deleteCar: (id: string) => Promise<{ plate: string; movs: number }>;
    mandarATaller: (id: string, datos: { razon: string; monto: number; comprobante: File | null }) => Promise<void>;
    registrarService: (id: string, datos: { fecha: string; descripcion: string; kilometraje?: number; costo?: number; comprobante?: File | null }) => Promise<{ car: Car; mov?: Mov }>;
    exportReport: (payload: ReportExportPayload) => Promise<{ file: { name: string; url: string; mimeType: string }; counts: { ingresos: number; gastos: number; total: number } }>;
    addPago: (nuevo: NuevoPagoPayload) => Promise<Pago>;
    deletePago: (id: number) => Promise<void>;
  },
): View {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = (m: string) => {
    clearTimeout(toastTimer.current);
    update({ toast: m });
    toastTimer.current = setTimeout(() => update({ toast: '' }), 2400);
  };

  const go = (nav: UIState['nav'], extra?: Partial<UIState>) => update({ nav, ...(nav === 'cobros' ? { cobrosTab: 'pagos' as const } : {}), ...(extra || {}) });

  const patchCar = persist.patchCar;
  // La API entrega las posiciones de cada auto de la más nueva a la más vieja.
  // No usar directamente `new Map(entries)`: eso terminaría sobrescribiendo la
  // posición actual con la última fila (la más antigua) del mismo vehículo.
  const locationByCar = new Map<string, CarLocation>();
  locations.forEach((location) => {
    if (!locationByCar.has(location.carId)) locationByCar.set(location.carId, location);
  });

  const locationView = (location: CarLocation | undefined): DetailView['location'] => {
    if (!location) return null;
    const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(location.recordedAt).getTime()) / 60_000));
    const age = ageMinutes < 2 ? 'hace un momento' : ageMinutes < 60 ? 'hace ' + ageMinutes + ' min' : 'hace ' + Math.floor(ageMinutes / 60) + ' h';
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      age,
      stale: ageMinutes > 10,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
    };
  };

  const ch = useMemo(
    () => ({
      plate: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, plate: e.target.value } })),
      model: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, model: e.target.value } })),
      year: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, year: e.target.value } })),
      gpsTag: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, gpsTag: e.target.value } })),
      kilometraje: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, kilometraje: e.target.value } })),
      seguroNombre: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, seguroNombre: e.target.value } })),
      serviceCada: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, serviceCada: e.target.value } })),
      seguroCada: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, seguroCada: e.target.value } })),
    }),
    [],
  );

  // Las fechas no vienen de un evento de input: DateField entrega el ISO ya
  // armado, porque lo que se tipea es `dd/mm/aaaa`.
  const setLastService = useCallback((iso: string) => update((s) => ({ ncar: { ...s.ncar, lastService: iso } })), []);
  const setSeguroVence = useCallback((iso: string) => update((s) => ({ ncar: { ...s.ncar, seguroVence: iso } })), []);
  const setNdrvCuota = useCallback((v: string) => update((s) => ({ ndrv: { ...s.ndrv, cuota: v } })), []);

  const dh = useMemo(
    () => ({
      name: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ndrv: { ...s.ndrv, name: e.target.value } })),
      carId: (e: React.ChangeEvent<HTMLSelectElement>) => update((s) => ({ ndrv: { ...s.ndrv, carId: e.target.value } })),
    }),
    [],
  );

  const saveCar = () => {
    const n = state.ncar;
    const plate = n.plate.trim().toUpperCase();
    if (!plate) {
      toast('Ingresá la chapa del vehículo');
      return;
    }
    if (!n.model.trim()) {
      toast('Ingresá la marca y el modelo');
      return;
    }
    if (cars.some((c) => c.plate.toUpperCase() === plate)) {
      toast('Esa chapa ya está en la flota');
      return;
    }
    const cada = numFromInput(n.serviceCada);
    const kilometraje = numFromInput(n.kilometraje);
    if (n.lastService && n.lastService > isoLocal(TODAY)) {
      toast('El último service no puede ser una fecha futura');
      return;
    }
    const segCada = numFromInput(n.seguroCada);
    if (segCada > SEG_CADA_MAX) {
      toast('Cada cuánto se renueva el seguro: entre 1 y ' + SEG_CADA_MAX + ' meses');
      return;
    }
    // El alta es lo único que no se puede aplicar en optimista: el id lo asigna
    // el servidor, así que se espera la confirmación antes de cerrar el modal.
    persist
      .addCar({
        plate,
        model: n.model.trim(),
        year: numFromInput(n.year) || 2018,
        gpsTag: n.gpsTag.trim(),
        ...(n.kilometraje.trim() ? { kilometraje } : {}),
        ...(n.lastService ? { lastServiceDate: n.lastService, serviceCada: cada, serviceUnidad: n.serviceUnidad } : n.serviceCada ? { serviceCada: cada, serviceUnidad: n.serviceUnidad } : {}),
        ...(n.seguroVence ? { seguroDate: n.seguroVence } : {}),
        ...(n.seguroNombre.trim() ? { seguroNombre: n.seguroNombre.trim() } : {}),
        ...(n.seguroCada ? { seguroCada: segCada } : {}),
      })
      .then(() => {
        update({ modal: null, ncar: blankCar(), nav: 'flota' });
        toast('Vehículo agregado · ' + plate + ' · asignale un chofer para cobrarle cuota');
      })
      .catch((e: Error) => toast('No se pudo agregar: ' + e.message));
  };

  const driverFormData = () => {
    const d = state.ndrv;
    const name = d.name.trim();
    if (!name) {
      toast('Ingresá el nombre del chofer');
      return null;
    }
    if (!d.carId) {
      toast('Elegí a qué vehículo lo asignás');
      return null;
    }
    const cuota = numFromInput(d.cuota);
    if (!cuota) {
      toast('Ingresá la cuota diaria del chofer');
      return null;
    }
    const car = cars.find((c) => c.id === d.carId)!;
    return { d, name, cuota, car };
  };

  const previewDrv = (): void => {
    if (state.driverCredentialsLoading) return;
    const form = driverFormData();
    if (!form) return;

    // Editar solamente la cuota del mismo chofer no invalida su login ni debe
    // generar una contraseña nueva. Ese caso se guarda directamente.
    if (form.car.driver === form.name) return saveDrv();

    update({ driverCredentialsLoading: true });
    persist
      .previewDriverCredentials(form.d.carId, form.name)
      .then((credentials) => update({ driverCredentials: credentials, driverCredentialsLoading: false }))
      .catch((e: Error) => {
        update({ driverCredentialsLoading: false });
        toast('No se pudieron generar los datos: ' + e.message);
      });
  };

  const saveDrv = (): void => {
    if (state.driverCredentialsLoading) return;
    const form = driverFormData();
    if (!form) return;

    if (form.car.driver === form.name) {
      patchCar(form.d.carId, { driver: form.name, cuota: form.cuota });
      update({ modal: null, ndrv: blankDrv(), driverCredentials: null, nav: 'choferes' });
      toast('Chofer actualizado · ' + form.name + ' · ' + form.car.plate);
      return;
    }

    const credentials = state.driverCredentials;
    if (!credentials) return previewDrv();

    update({ driverCredentialsLoading: true });
    persist
      .assignDriver(form.d.carId, { driver: form.name, cuota: form.cuota, ...credentials })
      .then(() => {
        update({ modal: null, ndrv: blankDrv(), driverCredentials: null, driverCredentialsLoading: false, nav: 'choferes' });
        toast('Chofer asignado · ' + form.name + ' · ' + form.car.plate);
      })
      .catch((e: Error) => {
        update({ driverCredentialsLoading: false });
        toast('No se pudo asignar: ' + e.message);
      });
  };

  const savePago = () => {
    const f = state.npago;
    if (!f || f.guardando) return;
    if (!f.driver) return toast('Elegí de qué chofer es el pago');
    const monto = numFromInput(f.monto);
    if (!monto) return toast('Ingresá cuánto pagó');
    if (f.fecha > isoLocal(TODAY)) return toast('El pago no puede tener fecha futura');

    // El auto es contexto, no destino: se guarda el que maneja hoy, resuelto por
    // la identidad del chofer (su `driverId`), no por el nombre escrito.
    const carSel = cars.find((c) => claveDeCar(c) === f.driver);
    const nombre = carSel?.driver ?? String(f.driver);

    // A qué cuotas se imputa lo decide el servidor recién en la próxima lectura,
    // así que no hay nada que aplicar en optimista: se marca guardando y se espera.
    update((s) => ({ npago: s.npago && { ...s.npago, guardando: true } }));
    persist
      .addPago({
        driver: f.driver,
        carId: carSel?.id ?? null,
        fecha: f.fecha,
        monto,
        tipo: f.tipo,
        nota: f.nota.trim() || undefined,
      })
      .then(() => {
        update({ npago: null });
        toast((f.tipo === 'ajuste' ? 'Ajuste registrado · ' : 'Pago registrado · ') + nombre + ' · ' + fmt(monto));
      })
      .catch((e: Error) => {
        update((s) => ({ npago: s.npago && { ...s.npago, guardando: false } }));
        toast('No se pudo registrar: ' + e.message);
      });
  };

  const st = state;
  const r = range(st);
  const inR = (m: Mov) => m.date >= r.start && m.date <= r.end;
  // Días de calendario que abarca el rango: se mide de medianoche a medianoche
  // para que el `finDia` del extremo no sume un día de más.
  const days = Math.max(1, Math.round((+iniDia(r.end) - +iniDia(r.start)) / 864e5) + 1);
  // El período anterior es el mismo largo, pegado antes, y cierra al final de
  // su último día por la misma razón que `finDia`.
  const prevEnd = finDia(addD(r.start, -1));
  const prevStart = iniDia(addD(prevEnd, -(days - 1)));
  const inPrev = (m: Mov) => m.date >= prevStart && m.date <= prevEnd;

  // Imputación de todos los pagos sobre todas las cuotas, sin recortar por
  // período: un pago de agosto puede estar cancelando una cuota de junio, así
  // que recortar antes de imputar daría deudas que no existen.
  const carDe = new Map(cars.map((c) => [c.id, c]));
  const cuotas = movs.filter((m) => m.type === 'ingreso');
  const { aplicaciones, cobrado, saldoAFavor } = imputar(cuotas, pagos, (m) => {
    const c = carDe.get(m.carId);
    return claveChofer(m, c);
  });
  const cobradoDe = (m: Mov) => cobrado.get(m.id) ?? 0;
  const deudaDe = (m: Mov) => m.amount - cobradoDe(m);
  /** Cuánto de un pago cayó dentro del período mirado. */
  const inRA = (a: Aplicacion) => a.fecha >= r.start && a.fecha <= r.end;
  const inPrevA = (a: Aplicacion) => a.fecha >= prevStart && a.fecha <= prevEnd;
  const inRP = (p: Pago) => p.fecha >= r.start && p.fecha <= r.end;
  const inPrevP = (p: Pago) => p.fecha >= prevStart && p.fecha <= prevEnd;

  const tot = stats(movs, aplicaciones, inR, inRA, pagos, inRP);
  const prev = stats(movs, aplicaciones, inPrev, inPrevA, pagos, inPrevP);
  const active = cars.filter((c) => c.estado !== 'baja');
  // La pantalla de Cobros lista todos los cobros del período, no solo los que
  // faltan: ver los ya cobrados es lo que da contexto a lo que falta.
  const cobroMovs = cuotas.filter(inR).sort((a, b) => +b.date - +a.date);
  const pendMovs = cobroMovs.filter((m) => deudaDe(m) > 0);
  const pendTotal = pendMovs.reduce((a, m) => a + deudaDe(m), 0);
  // Lo que la pantalla de Cobros muestra después de aplicar chip y búsqueda. El
  // resumen de arriba se calcula sobre esto y no sobre la flota entera: si estás
  // filtrando por un chofer, lo que querés saber es cuánto debe ÉL.
  const cobrosVista = cobroMovs
    .map((m) => ({ m, c: cars.find((c2) => c2.id === m.carId)!, debe: deudaDe(m) }))
    .filter(({ m, debe }) => (st.pendKind === 'todas' ? true : st.pendKind === (debe === 0 ? 'Cobrado' : cobradoDe(m) > 0 ? 'Parcial' : 'Pendiente')))
    .filter(({ m, c }) => matches(st.pendQ, paidBy(m, c), c.plate, c.model, c.gpsTag));
  const cobrosVistaDeuda = cobrosVista.reduce((a, x) => a + x.debe, 0);

  const choferDeCuota = (m: Mov) => {
    const c = carDe.get(m.carId);
    return claveChofer(m, c);
  };
  // La deuda de un chofer es sobre todo su historial, no sobre el período: un
  // saldo es una foto de hoy, no un flujo del mes. Filtrarla por período haría
  // desaparecer lo que debe de junio con solo mirar agosto.
  const deudaPorChofer = new Map<string | number, number>();
  cuotas.forEach((m) => {
    const falta = deudaDe(m);
    if (falta <= 0) return;
    const d = choferDeCuota(m);
    if (d === 'Sin chofer') return;
    deudaPorChofer.set(d, (deudaPorChofer.get(d) ?? 0) + falta);
  });

  const pagosVista = pagos
    .filter((p) => p.fecha >= r.start && p.fecha <= r.end)
    .filter((p) => matches(st.pendQ, p.driver, carDe.get(p.carId ?? '')?.plate, carDe.get(p.carId ?? '')?.model, carDe.get(p.carId ?? '')?.gpsTag))
    .sort((a, b) => +b.fecha - +a.fecha || b.id - a.id);

  const alertList: { car: Car; kind: string; sev: number; text: string }[] = [];
  active.forEach((c) => {
    const configuredService = svcConfigured(c);
    const dLeft = configuredService ? svcDaysLeft(c) : 0;
    if (svcConfigured(c) && dLeft <= SVC_AVISO_DIAS)
      alertList.push({
        car: c,
        kind: 'Service',
        sev: dLeft < 0 ? 2 : 1,
        text: 'Service ' + svcLeftLbl(dLeft, true),
      });
    const segLeft = daysBetween(TODAY, c.seguroDate);
    if (c.seguroCada > 0 && c.seguroNombre.trim() && c.seguroDate.getFullYear() > 1970 && segLeft <= 20)
      alertList.push({
        car: c,
        kind: 'Seguro',
        sev: segLeft < 0 ? 2 : 1,
        text: 'Seguro ' + (segLeft < 0 ? 'vencido hace ' + durLbl(segLeft) : segLeft === 0 ? 'vence hoy' : 'vence en ' + durLbl(segLeft)),
      });
    if (c.estado === 'taller') alertList.push({ car: c, kind: 'Taller', sev: 1, text: 'En taller, sin generar cuota' });
    const kmDays = c.kilometrajeActualizado ? daysBetween(new Date(c.kilometrajeActualizado + 'T12:00:00'), TODAY) : Number.POSITIVE_INFINITY;
    if (!c.kilometrajeActualizado || kmDays > 7) alertList.push({ car: c, kind: 'Kilometraje', sev: 1, text: c.kilometraje ? 'Kilometraje pendiente de actualizar' : 'Falta cargar el kilometraje' });
  });
  alertList.sort((a, b) => b.sev - a.sev);

  const perCar = cars.map((c) => ({ c, ...stats(movs, aplicaciones, (m) => m.carId === c.id && inR(m), (a) => a.carId === c.id && inRA(a), pagos, (p) => p.carId === c.id && inRP(p)) }));
  const maxNet = Math.max(...perCar.map((x) => Math.abs(x.net)), 1);
  const filtered = perCar.filter((x) => (st.filter === 'todos' ? true : x.c.estado === st.filter) && matches(st.carQ, x.c.plate, x.c.model, x.c.driver, x.c.gpsTag));
  const keyF: (x: (typeof perCar)[number]) => string | number =
    ({
      plate: (x: any) => x.c.plate,
      model: (x: any) => x.c.model,
      driver: (x: any) => x.c.driver,
      cuota: (x: any) => x.c.cuota,
      svc: (x: any) => svcDaysLeft(x.c),
      ing: (x: any) => x.ing,
      egr: (x: any) => x.egr,
      net: (x: any) => x.net,
      estado: (x: any) => x.c.estado,
    } as Record<string, (x: any) => string | number>)[st.sortK] || ((x: any) => x.net);
  const sorted = [...filtered].sort((a, b) => {
    const ka = keyF(a);
    const kb = keyF(b);
    return (typeof ka === 'string' ? ka.localeCompare(kb as string) : (ka as number) - (kb as number)) * st.sortDir;
  });

  const mkCols = (defs: [string, string, 'left' | 'right'][]): ColItem[] =>
    defs.map(([k, label, align]) => ({
      key: k,
      label,
      align,
      fg: st.sortK === k ? '#16150f' : '#6b665c',
      arrow: st.sortK === k ? (st.sortDir === -1 ? ' ↓' : ' ↑') : '',
      sort: () => update((s2) => ({ sortK: k, sortDir: s2.sortK === k ? ((-s2.sortDir) as 1 | -1) : -1 })),
    }));

  const delta = (now: number, before: number) => {
    if (!before) return 'Sin dato del período anterior';
    const p = Math.round(((now - before) / Math.abs(before)) * 100);
    return (p > 0 ? '+' : '') + p + '% vs. período anterior';
  };
  const catTotal = Object.values(tot.byCat).reduce((a, b) => a + b, 0) || 1;
  const catMax = Math.max(...CATS.map((c) => tot.byCat[c] || 0), 1);

  const mkRow = (x: (typeof perCar)[number], i: number): VehicleRow => {
    const t = FTAG[x.c.estado];
    const dLeft = svcDaysLeft(x.c);
    return {
      id: x.c.id,
      pos: i + 1,
      plate: x.c.plate,
      rawModel: x.c.model,
      model: x.c.model + ' · ' + x.c.year,
      driver: x.c.driver,
      cuota: x.c.cuota ? fmtShort(x.c.cuota, st.hide) : '—',
      svc: x.c.estado === 'baja' ? '—' : svcLeftLbl(dLeft),
      svcFg: dLeft < 0 ? COLORS.neg : dLeft <= SVC_AVISO_DIAS ? COLORS.warn : '#6b665c',
      ing: fmtShort(x.ing, st.hide),
      egr: fmtShort(x.egr, st.hide),
      net: fmtShort(x.net, st.hide),
      netColor: statusColor(x.net, UMBRAL_VERDE),
      netPct: Math.round((Math.abs(x.net) / maxNet) * 100) + '%',
       gpsTag: x.c.gpsTag || (locationByCar.has(x.c.id) ? 'Ubicación activa' : 'Sin GPS'),
       gpsFg: x.c.gpsTag || locationByCar.has(x.c.id) ? '#6b665c' : '#a09a8d',
      tag: t[0],
      tagBg: t[1],
      tagFg: t[2],
      rowBg: x.c.estado === 'baja' ? '#faf7f0' : 'transparent',
      open: () => update({ detailId: x.c.id }),
    };
  };

  const movsSorted = movs.filter(inR).sort((a, b) => +b.date - +a.date);
  const movsFiltered = movsSorted.filter((m) => {
    const c = cars.find((c2) => c2.id === m.carId);
    return (
      (st.movType === 'todos' || m.type === st.movType) &&
      (st.movCat === 'todas' || (m.type === 'egreso' && m.cat === st.movCat)) &&
      matches(st.movQ, m.desc, m.cat, c && paidBy(m, c), c?.model, c?.plate, c?.gpsTag)
    );
  });
  // Acá los ingresos son lo cobrado de las cuotas listadas, no la caja del
  // período: el panel resume la lista que se está viendo, y esa lista son
  // movimientos, no pagos.
  const idsFiltrados = new Set(movsFiltered.map((m) => m.id));
  const movTot = stats(movsFiltered, aplicaciones, () => true, (a) => idsFiltrados.has(a.movId));
  const movCatTotal = Object.values(movTot.byCat).reduce((a, b) => a + b, 0) || 1;
  const movCatMax = Math.max(...CATS.map((c) => movTot.byCat[c] || 0), 1);

  type RealMovement = {
    id: string;
    date: Date;
    type: 'ingreso' | 'egreso';
    carId: string | null;
    vehicle: string;
    driver: string;
    desc: string;
    category: string;
    note: string;
    medio: string;
    amount: number;
    comprobante: string;
    comprobanteName: string;
    comprobanteType: string;
    items: { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[];
    manoObra: number;
  };

  const editCarFrom = (c: Car): EditCarForm => ({
    plate: c.plate,
    model: c.model,
    year: String(c.year),
    gpsTag: c.gpsTag,
    kilometraje: c.kilometraje ? String(c.kilometraje) : '',
    lastService: c.lastServiceDate.getFullYear() > 1970 ? isoLocal(c.lastServiceDate) : '',
    serviceCada: c.serviceCada ? String(c.serviceCada) : '',
    serviceUnidad: c.serviceUnidad,
    seguroVence: c.seguroDate.getFullYear() > 1970 ? isoLocal(c.seguroDate) : '',
    seguroNombre: c.seguroNombre,
    seguroCada: c.seguroCada ? String(c.seguroCada) : '',
    estado: c.estado,
    driver: c.driver === 'Sin chofer' ? '' : c.driver,
    cuota: c.cuota ? miles(String(c.cuota)) : '',
    section: 'general',
    guardando: false,
  });
  const editCar = st.editCar || {
    plate: '', model: '', year: '', gpsTag: '', kilometraje: '', lastService: '', serviceCada: '', serviceUnidad: 'meses' as const,
    seguroVence: '', seguroNombre: '', seguroCada: '', estado: 'activo' as const, driver: '', cuota: '', section: 'general' as const, guardando: false,
  };
  const editCarDriverOptions = [
    { value: '', label: 'Sin chofer' },
    ...[...new Set(
      cars
        .filter((c) => c.driver !== 'Sin chofer')
        .map((c) => c.driver),
    )]
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((name) => ({ value: name, label: name })),
  ];
  const editCarChange = <K extends keyof EditCarForm>(key: K, value: EditCarForm[K]) => update((s) => ({ editCar: s.editCar ? { ...s.editCar, [key]: value } : s.editCar }));
  const editCarSave = () => {
    const f = st.editCar;
    if (!f || f.guardando) return;
    const c = cars.find((x) => x.id === st.detailId);
    if (!c) return;
    const year = numFromInput(f.year);
    const km = f.kilometraje.trim() ? numFromInput(f.kilometraje) : undefined;
    const serviceCada = f.serviceCada.trim() ? numFromInput(f.serviceCada) : 0;
    const seguroCada = f.seguroCada.trim() ? numFromInput(f.seguroCada) : 0;
    const serviceStarted = Boolean(f.lastService || f.serviceCada);
    const insuranceStarted = Boolean(f.seguroNombre.trim() || f.seguroVence || f.seguroCada);
    if (!f.plate.trim() || !f.model.trim()) return toast('Completá chapa y marca/modelo');
    if (!Number.isInteger(year) || year < 1951 || year > 2099) return toast('El año no es válido');
    if (km !== undefined && (km < c.kilometraje || km > 10_000_000)) return toast('El kilometraje no puede disminuir');
    if (serviceStarted && (!f.lastService || !serviceCada)) return toast('Completá fecha e intervalo del service');
    if (insuranceStarted && (!f.seguroNombre.trim() || !f.seguroVence || !seguroCada)) return toast('Completá todos los datos del seguro');
    if (f.driver.trim() && !numFromInput(f.cuota)) return toast('Indicá la cuota diaria del chofer');
    const patch: Partial<Car> = {
      plate: f.plate.trim().toUpperCase(),
      model: f.model.trim(),
      year,
      gpsTag: f.gpsTag.trim(),
      estado: f.estado === 'taller' && c.estado !== 'taller' ? c.estado : f.estado,
      serviceCada,
      serviceUnidad: f.serviceUnidad,
      lastServiceDate: f.lastService ? new Date(f.lastService + 'T12:00:00') : new Date('1970-01-01T12:00:00'),
      seguroNombre: f.seguroNombre.trim(),
      seguroDate: f.seguroVence ? new Date(f.seguroVence + 'T12:00:00') : new Date('1970-01-01T12:00:00'),
      seguroCada,
      ...(km !== undefined ? { kilometraje: km } : {}),
    };
    const targetDriver = f.driver.trim();
    const currentDriver = c.driver === 'Sin chofer' ? '' : c.driver;
    if (targetDriver === currentDriver) patch.cuota = targetDriver ? numFromInput(f.cuota) : 0;
    else if (!targetDriver) {
      patch.driver = 'Sin chofer';
      patch.cuota = 0;
    }
    update({ editCar: { ...f, guardando: true } });
    persist.updateCar(c.id, patch)
      .then(() => {
        if (targetDriver && targetDriver !== currentDriver) {
          update({ editCar: null, modal: 'drv', ndrv: { name: targetDriver, carId: c.id, cuota: f.cuota }, driverCredentials: null, driverCredentialsLoading: false });
          return;
        }
        if (f.estado === 'taller' && c.estado !== 'taller') {
          update({ editCar: null, taller: { carId: c.id, razon: '', monto: '', archivo: null, guardando: false } });
          return;
        }
        update({ editCar: null });
        toast('Datos del vehículo actualizados');
      })
      .catch((e: Error) => update({ editCar: { ...f, guardando: false }, toast: 'No se pudo guardar: ' + e.message }));
  };
  const serviceSet = (patch: Partial<NonNullable<UIState['service']>>) => update((s) => ({ service: s.service ? { ...s.service, ...patch } : s.service }));
  const serviceNext = () => {
    const s = st.service;
    if (!s || s.guardando) return;
    if (s.step === 0 && (!s.fecha || !s.descripcion.trim())) return toast('Completá la fecha y qué se hizo');
    if (s.step < 2) serviceSet({ step: s.step + 1 });
  };
  const serviceBack = () => {
    if (!st.service || st.service.guardando) return;
    if (st.service.step === 0) update({ service: null });
    else serviceSet({ step: st.service.step - 1 });
  };
  const serviceSave = () => {
    const s = st.service;
    const c = s && cars.find((x) => x.id === s.carId);
    if (!s || !c || s.guardando) return;
    const km = s.kilometraje.trim() ? numFromInput(s.kilometraje) : undefined;
    const costo = s.costo.trim() ? numFromInput(s.costo) : undefined;
    if (!s.fecha || s.fecha > isoLocal(TODAY) || !s.descripcion.trim()) return toast('Revisá los datos del service');
    if (km !== undefined && (km < c.kilometraje || km > 10_000_000)) return toast('El kilometraje no puede disminuir');
    update({ service: { ...s, guardando: true } });
    persist.registrarService(c.id, { fecha: s.fecha, descripcion: s.descripcion.trim(), kilometraje: km, costo, comprobante: s.comprobante })
      .then(() => update({ service: null, toast: costo ? 'Service registrado y gasto agregado' : 'Service registrado' }))
      .catch((e: Error) => update({ service: { ...s, guardando: false }, toast: 'No se pudo registrar: ' + e.message }));
  };
  const realMovements: RealMovement[] = [
    ...pagos
      .filter((p) => p.tipo === 'pago')
      .map((p) => {
        const c = p.carId ? carDe.get(p.carId) : undefined;
        return {
          id: 'pago-' + p.id,
          date: p.fecha,
          type: 'ingreso' as const,
          carId: p.carId,
          vehicle: c ? c.plate + ' · ' + c.model : 'Sin vehículo asociado',
          driver: p.driver || 'Sin chofer',
          desc: 'Pago recibido',
          category: 'Pago',
          note: p.nota || '',
          medio: p.medio || 'Sin especificar',
          amount: p.monto,
          comprobante: p.comprobante ? '/api/comprobantes/' + p.comprobante.id : '',
          comprobanteName: p.comprobante?.nombre || '',
          comprobanteType: p.comprobante?.tipo || '',
          items: [],
          manoObra: 0,
        };
      }),
    ...movs
      .filter((m) => m.type === 'egreso')
      .map((m) => {
        const c = carDe.get(m.carId);
        return {
          id: 'egreso-' + m.id,
          date: m.date,
          type: 'egreso' as const,
          carId: m.carId,
          vehicle: c ? c.plate + ' · ' + c.model : 'Vehículo eliminado',
          driver: c?.driver || 'Sin chofer',
          desc: m.desc,
          category: m.cat || 'Otros',
          note: '',
          medio: '',
          amount: m.amount,
          comprobante: m.comprobante ? '/api/comprobantes/' + m.comprobante.id : '',
          comprobanteName: m.comprobante?.nombre || '',
          comprobanteType: m.comprobante?.tipo || '',
          items: m.items || [],
          manoObra: m.manoObra || 0,
        };
      }),
  ].sort((a, b) => +b.date - +a.date || b.id.localeCompare(a.id));

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthDate = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1, 12);
  const monthLabel = (key: string) => {
    const d = monthDate(key);
    return `${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}`;
  };
  const monthKeys = new Set(realMovements.map((m) => monthKey(m.date)));
  monthKeys.add(monthKey(TODAY));
  const movementMonths = [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const rows = realMovements.filter((m) => monthKey(m.date) === key);
      const income = rows.filter((m) => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0);
      const expense = rows.filter((m) => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0);
      return { key, rows, income, expense };
    });
  const selectedMovementMonth = monthKeys.has(st.movMonth) ? st.movMonth : monthKey(TODAY);
  const selectedMonth = movementMonths.find((m) => m.key === selectedMovementMonth) || movementMonths[0];
  const filteredRealMovements = (selectedMonth?.rows || []).filter((m) => {
    const categoryOk = st.movCat === 'todas' || (m.type === 'egreso' && m.category === st.movCat);
    return (st.movType === 'todos' || m.type === st.movType) && (st.movVehicle === 'todos' || m.carId === st.movVehicle) && categoryOk && matches(st.movQ, m.desc, m.category, m.vehicle, m.driver, m.note, m.medio);
  });
  const movementPageCount = Math.max(1, Math.ceil(filteredRealMovements.length / 20));
  const movementPage = Math.min(Math.max(1, st.movPage), movementPageCount);
  const movementPageRows = filteredRealMovements.slice((movementPage - 1) * 20, movementPage * 20);

  const movementDetail: MovementDetailView | null = (() => {
    const selected = st.movementDetailId == null ? undefined : realMovements.find((x) => x.id === st.movementDetailId);
    if (!selected) return null;
    const p = selected.id.startsWith('pago-') ? pagos.find((x) => x.id === Number(selected.id.slice(6))) : undefined;
    const ajuste = p?.tipo === 'ajuste';
    const appliedQuotas = aplicaciones
      .filter((a) => p && a.pagoId === p.id)
      .map((a) => {
        const quota = cuotas.find((m) => m.id === a.movId);
        const quotaCar = quota ? carDe.get(quota.carId) : undefined;
        return {
          id: a.movId,
          dateLbl: quota ? dLbl(quota.date) : 'Cuota',
          description: quota?.desc || 'Cuota',
          vehicle: quotaCar?.plate || 'Vehículo eliminado',
          amount: fmt(a.monto, st.hide),
        };
      });
    const driverKey = p ? (p.driverId != null ? String(p.driverId) : p.driver) : '';
    const favor = p ? saldoAFavor.get(driverKey) ?? 0 : 0;
    return {
      id: selected.id,
      type: selected.type === 'egreso' ? 'Gasto' : ajuste ? 'Ajuste' : 'Pago',
      typeBg: selected.type === 'egreso' ? '#fdeeea' : ajuste ? '#f4f0e8' : '#eef4f0',
      typeFg: selected.type === 'egreso' ? '#a8412f' : ajuste ? '#6b665c' : '#2e7d5b',
      amount: fmt(selected.amount, st.hide),
      amountFg: selected.type === 'egreso' ? '#a8412f' : ajuste ? '#6b665c' : '#2e7d5b',
      dateLbl: dLblFull(selected.date),
      driver: selected.driver || 'Sin chofer',
      vehicle: selected.vehicle,
      medio: selected.medio || 'Sin especificar',
      category: selected.category,
      note: selected.note || '',
      comprobante: selected.comprobante ? { url: selected.comprobante, name: selected.comprobanteName || 'Comprobante', type: selected.comprobanteType } : null,
      appliedQuotas,
      items: selected.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad, costoUnitario: fmt(item.costoUnitario, st.hide), subtotal: fmt(item.subtotal, st.hide) })),
      manoObra: selected.manoObra ? fmt(selected.manoObra, st.hide) : '',
      saldoAFavor: favor ? fmt(favor, st.hide) : '',
      canDelete: !!p,
      close: () => update({ movementDetailId: null }),
      delete: async () => {
        if (!p) return;
        await persist.deletePago(p.id);
        update({ movementDetailId: null });
        toast((ajuste ? 'Ajuste eliminado · ' : 'Movimiento eliminado · ') + (p.driver || 'Sin chofer') + ' · ' + fmt(p.monto));
      },
    };
  })();

  const quotaDetail: QuotaDetailView | null = (() => {
    const m = st.quotaDetailId == null ? undefined : cuotas.find((x) => x.id === st.quotaDetailId);
    if (!m) return null;
    const c = carDe.get(m.carId);
    const collected = cobradoDe(m);
    const due = Math.max(0, m.amount - collected);
    const status = due === 0 ? 'Cobrado' : collected > 0 ? 'Parcial' : 'Pendiente';
    const appliedPayments = aplicaciones
      .filter((a) => a.movId === m.id)
      .map((a) => {
        const p = pagos.find((x) => x.id === a.pagoId);
        const ajuste = a.tipo === 'ajuste';
        return {
          id: a.pagoId,
          dateLbl: dLblFull(a.fecha),
          amount: fmt(a.monto, st.hide),
          type: ajuste ? 'Ajuste' : 'Pago',
          typeBg: ajuste ? '#f4f0e8' : '#eef4f0',
          typeFg: ajuste ? '#6b665c' : '#2e7d5b',
          medio: p?.medio || 'Sin especificar',
          note: p?.nota || '',
        };
      });
    return {
      description: m.desc,
      dateLbl: dLblFull(m.date),
      driver: nombreChofer(m, c),
      vehicle: c ? c.plate + ' · ' + c.model : 'Vehículo eliminado',
      billed: fmt(m.amount, st.hide),
      collected: fmt(collected, st.hide),
      due: fmt(due, st.hide),
      status,
      statusBg: PTAG[status][0],
      statusFg: PTAG[status][1],
      appliedPayments,
      close: () => update({ quotaDetailId: null }),
    };
  })();

  const nav = st.nav;
  const TITLES: Record<string, [string, string]> = {
    resumen: [r.label, 'Resumen'],
    flota: ['Vehículos', 'Flota'],
    choferes: ['Choferes', 'Equipo'],
    alertas: ['Alertas', 'Mantenimiento'],
    movimientos: ['Movimientos', 'Libro de caja'],
    reportes: ['Reportes', 'Resumen financiero'],
    cobros: st.cobrosTab === 'pagos' ? ['Movimientos', 'Libro de ingresos'] : ['Cobros', 'Ingresos'],
  };
  const SUBS: Record<string, string> = {
    resumen: active.length + ' vehículos activos · ' + (cars.length - active.length) + ' fuera de servicio · datos al ' + dLbl(TODAY),
    flota: sorted.length + ' vehículos en la vista · tocá una columna para ordenar',
    choferes: new Set(active.filter((c) => c.driver !== 'Sin chofer').map((c) => claveDeCar(c))).size + ' choferes asignados · cobros de ' + r.short,
    alertas: alertList.length + ' avisos de mantenimiento y documentos',
    movimientos: realMovements.length + ' movimientos reales registrados',
    reportes: 'Ingresos reales, gastos y resultado de ' + r.short,
    cobros: st.cobrosTab === 'pagos'
      ? pagosVista.length + (pagosVista.length === 1 ? ' movimiento registrado' : ' movimientos registrados') + ' en ' + r.short
      : 'Cobrado ' + fmt(tot.ing, st.hide) + ' de ' + fmt(tot.fact, st.hide) + ' facturado en ' + r.short + (pendTotal ? ' · deben ' + fmt(pendTotal, st.hide) : ''),
  };

  const openEditCar = () => {
    const c = cars.find((x) => x.id === st.detailId);
    if (c) update({ editCar: editCarFrom(c) });
  };
  const editCarClose = () => update({ editCar: null });
  const editCarDelete = () => {
    const c = cars.find((x) => x.id === st.detailId);
    if (c) update({ editCar: null, confirm: { tipo: 'borrarAuto', carId: c.id } });
  };
  const detail: DetailView = (() => {
    const c = cars.find((c2) => c2.id === st.detailId);
    if (!c) {
      return {
        plate: '',
        rawModel: '',
        model: '',
        driver: '',
        hasDriver: false,
        estado: '',
        estadoBg: '',
        estadoFg: '',
        ing: '',
        egr: '',
        net: '',
        netFg: '',
        cuotaFmt: '',
        gpsTag: '',
        gpsFg: '',
        location: null,
        cobradas: '',
        pendientes: '',
        svcLbl: '',
        svcSub: '',
        svcFg: '',
         svcPct: '0%',
         svcBar: '',
         kilometraje: '',
         kilometrajeSub: '',
        svcCada: '',
        svcSetCada: () => {},
        svcUnidadOpts: [],
        svcGuardar: () => {},
        svcPuedeGuardar: false,
        svcHint: '',
        agregarDatos: () => {},
        docs: [],
        estadoOpts: [],
        months: [],
        movs: [],
        markService: () => {},
        verHistorial: () => {},
        editDriver: () => {},
        clearDriver: () => {},
        borrar: () => {},
      };
    }
    const cs = stats(movs, aplicaciones, (m) => m.carId === c.id && inR(m), (a) => a.carId === c.id && inRA(a), pagos, (p) => p.carId === c.id && inRP(p));
    const configuredService = svcConfigured(c);
    const dLeft = configuredService ? svcDaysLeft(c) : 0;
    const svcTotalDias = Math.max(1, daysBetween(c.lastServiceDate, svcNextDate(c)));
    const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const months: { label: string; ing: number; egr: number; net: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1);
      const m0 = d.getMonth();
      const enMes = (f: Date) => f.getMonth() === m0 && f.getFullYear() === d.getFullYear();
      const s2 = stats(movs, aplicaciones, (m) => m.carId === c.id && enMes(m.date), (a) => a.carId === c.id && enMes(a.fecha), pagos, (p) => p.carId === c.id && enMes(p.fecha));
      months.push({ label: MES[m0], ing: s2.ing, egr: s2.egr, net: s2.net });
    }
    const mMax = Math.max(...months.map((m) => Math.max(m.ing, m.egr)), 1);
    // El resumen del chofer es de quien maneja el auto hoy: si cambió de
    // chofer, las cuotas de quien lo manejaba antes no cuentan acá.
    // Si una cuota está saldada se decide por lo imputado, nunca por el `estado`
    // que trae la fila: ese campo no se entera de un pago posterior.
    const suyas = movs.filter((m) => m.carId === c.id && m.type === 'ingreso' && claveChofer(m, c) === claveDeCar(c) && inR(m));
    const cuotasCobradas = suyas.filter((m) => deudaDe(m) === 0).length;
    const cuotasPend = suyas.filter((m) => deudaDe(m) > 0);

    // El intervalo de service se edita en borrador y se confirma con "Guardar":
    // a diferencia del resto de la ficha, escribir un número de a un dígito
    // pasaría por valores absurdos si cada tecla se guardara sola.
    const bor = st.svcEdit && st.svcEdit.carId === c.id ? st.svcEdit : { carId: c.id, cada: String(c.serviceCada), unidad: c.serviceUnidad };
    const borN = Number(bor.cada);
    const borOk = bor.cada !== '' && Number.isInteger(borN) && borN >= 1 && borN <= SVC_MAX;
    const borCambio = borOk && (borN !== c.serviceCada || bor.unidad !== c.serviceUnidad);
    const editarSvc = (patch: Partial<typeof bor>) => update({ svcEdit: { ...bor, ...patch } });
    const agregarDatos = openEditCar;

    return {
      plate: c.plate,
      rawModel: c.model,
      model: c.model + ' · ' + c.year,
      driver: c.driver,
      hasDriver: c.driver !== 'Sin chofer',
      estado: FTAG[c.estado][0],
      estadoBg: FTAG[c.estado][1],
      estadoFg: FTAG[c.estado][2],
      ing: fmt(cs.ing, st.hide),
      egr: fmt(cs.egr, st.hide),
      net: fmt(cs.net, st.hide),
      netFg: statusColor(cs.net, UMBRAL_VERDE),
      cuotaFmt: c.cuota ? fmt(c.cuota, st.hide) : '—',
      gpsTag: c.gpsTag ? 'Identificador GPS: ' + c.gpsTag : 'Identificador GPS: no configurado',
      gpsFg: c.gpsTag ? '#3d3a34' : '#a09a8d',
      location: locationView(locationByCar.get(c.id)),
      cobradas: cuotasCobradas + ' cuotas cobradas',
      pendientes: cuotasPend.length ? cuotasPend.length + ' sin cobrar · debe ' + fmtShort(cuotasPend.reduce((a, m) => a + (m.amount - cobradoDe(m)), 0), st.hide) : 'Todo cobrado',
      svcLbl: configuredService ? (dLeft < 0 ? 'Service vencido hace ' + durLbl(dLeft) : dLeft === 0 ? 'El service vence hoy' : 'Próximo service en ' + durLbl(dLeft)) + ' · ' + dLblFull(svcNextDate(c)) : 'Datos de service sin cargar',
      svcSub: configuredService ? 'Último service: ' + dLblFull(c.lastServiceDate) : 'Agregá el último service y su intervalo',
      svcFg: configuredService ? (dLeft < 0 ? COLORS.neg : dLeft <= SVC_AVISO_DIAS ? COLORS.warn : COLORS.pos) : COLORS.warn,
       svcPct: configuredService ? Math.max(4, Math.min(100, Math.round(((svcTotalDias - dLeft) / svcTotalDias) * 100))) + '%' : '0%',
       svcBar: configuredService ? (dLeft < 0 ? COLORS.neg : dLeft <= SVC_AVISO_DIAS ? COLORS.warn : COLORS.pos) : '#e8a13a',
       kilometraje: c.kilometraje ? c.kilometraje.toLocaleString('es-PY') + ' km' : 'No informado',
       kilometrajeSub: c.kilometrajeActualizado ? 'Actualizado el ' + dLbl(new Date(c.kilometrajeActualizado + 'T12:00:00')) : 'Todavía no se cargó',
      svcCada: bor.cada,
      // Solo dígitos: así "no es un número" deja de ser un estado posible y el
      // único error que queda es el rango.
      svcSetCada: (e) => editarSvc({ cada: e.target.value.replace(/\D/g, '').slice(0, 4) }),
      svcUnidadOpts: (['dias', 'meses'] as const).map((u) => ({
        label: u === 'dias' ? 'días' : 'meses',
        ...CH(bor.unidad === u),
        pick: () => editarSvc({ unidad: u }),
      })),
      svcPuedeGuardar: borCambio,
      svcGuardar: () => {
        if (!borCambio) return;
        patchCar(c.id, { serviceCada: borN, serviceUnidad: bor.unidad });
        update({ svcEdit: null });
        toast('Service cada ' + svcIntervalo(borN, bor.unidad) + ' · próximo el ' + dLblFull(svcNextDate({ ...c, serviceCada: borN, serviceUnidad: bor.unidad })));
      },
      svcHint: !borOk
        ? 'Poné un número entre 1 y ' + SVC_MAX
        : borCambio
          ? 'El próximo service pasaría al ' + dLblFull(svcNextDate({ ...c, serviceCada: borN, serviceUnidad: bor.unidad }))
          : '',
      agregarDatos,
      docs: [
        (() => {
          // Renovar corre desde el vencimiento, no desde hoy, para no regalar
          // días de póliza. Si ya venció, hoy es el único arranque posible.
          const seguroConfigurado = c.seguroDate.getFullYear() > 1970 && c.seguroCada > 0 && c.seguroNombre.trim();
          const desde = seguroConfigurado && c.seguroDate > TODAY ? c.seguroDate : TODAY;
          const hasta = addM(desde, c.seguroCada || 12);
          return {
            label: 'Seguro',
            txt: seguroConfigurado ? (docLeft(c.seguroDate) < 0 ? 'Vencido hace ' : docLeft(c.seguroDate) === 0 ? '' : 'Vence en ') + (docLeft(c.seguroDate) === 0 ? 'Vence hoy' : durLbl(docLeft(c.seguroDate))) + ' · ' + dLblFull(c.seguroDate) : 'Datos del seguro sin cargar',
            sub: seguroConfigurado ? c.seguroNombre + ' · se renueva cada ' + svcIntervalo(c.seguroCada, 'meses') : 'Agregá aseguradora, vencimiento e intervalo',
            fg: seguroConfigurado ? (docLeft(c.seguroDate) < 0 ? COLORS.neg : docLeft(c.seguroDate) <= 20 ? COLORS.warn : '#3d3a34') : COLORS.warn,
            renew: () => {
              if (!seguroConfigurado) return agregarDatos();
              patchCar(c.id, { seguroDate: hasta });
              toast('Seguro renovado hasta ' + dLblFull(hasta));
            },
          };
        })(),
      ],
      estadoOpts: (
        [
          ['activo', 'Activo'],
          ['taller', 'En taller'],
          ['baja', 'Baja'],
        ] as [Car['estado'], string][]
      ).map(([k, label]) => ({
        label,
        ...CH(c.estado === k),
        pick: () => {
          // Mandar a taller no es solo cambiar un estado: hay un gasto detrás y
          // se pregunta por él antes, no después.
          if (k === 'taller' && c.estado !== 'taller') {
            update({ taller: { carId: c.id, razon: '', monto: '', archivo: null, guardando: false } });
            return;
          }
          patchCar(c.id, { estado: k });
          toast('Estado actualizado · ' + label);
        },
      })),
      months: months.map((m) => ({
        label: m.label,
        ing: fmtShort(m.ing, st.hide),
        egr: fmtShort(m.egr, st.hide),
        net: fmtShort(m.net, st.hide),
        netFg: statusColor(m.net, UMBRAL_VERDE),
        ingPct: Math.round((m.ing / mMax) * 100) + '%',
        egrPct: Math.round((m.egr / mMax) * 100) + '%',
      })),
      movs: realMovements
        .filter((m) => m.carId === c.id)
        .slice(0, 4)
        .map((m) => ({
          id: m.id,
          dateLbl: dLbl(m.date),
          desc: m.desc,
          sub: m.type === 'ingreso' ? m.driver + (m.medio ? ' · ' + m.medio : '') : m.category,
          comprobante: m.comprobante,
          amt: (m.type === 'ingreso' ? '+' : '−') + fmtShort(m.amount, st.hide),
          amtFg: m.type === 'ingreso' ? COLORS.pos : COLORS.neg,
          iconBg: m.type === 'ingreso' ? '#eef4f0' : '#fdeeea',
          iconFg: m.type === 'ingreso' ? '#2e7d5b' : '#a8412f',
          sign: m.type === 'ingreso' ? '↓' : '↑',
          open: () => update({ detailId: null, nav: 'cobros', cobrosTab: 'pagos', pendQ: c.plate, movementDetailId: m.id, quotaDetailId: null, movPage: 1, movExpanded: null }),
        })),
      verHistorial: () => {
        const latest = realMovements.find((m) => m.carId === c.id);
        update({ detailId: null, nav: 'cobros', cobrosTab: 'pagos', pendQ: c.plate, movVehicle: c.id, movMonth: latest ? monthKey(latest.date) : monthKey(TODAY), movPage: 1, movExpanded: null, movementDetailId: null, quotaDetailId: null });
      },
      markService: () => {
        return update({ service: { carId: c.id, step: 0, fecha: isoLocal(TODAY), descripcion: '', kilometraje: '', costo: '', comprobante: null, guardando: false } });
      },
      editDriver: () =>
        update({
          modal: 'drv',
          ndrv: { name: c.driver === 'Sin chofer' ? '' : c.driver, carId: c.id, cuota: c.cuota ? miles(String(c.cuota)) : '' },
          driverCredentials: null,
          driverCredentialsLoading: false,
        }),
      clearDriver: () => update({ confirm: { tipo: 'quitarChofer', carId: c.id } }),
      borrar: () => update({ confirm: { tipo: 'borrarAuto', carId: c.id } }),
    };
  })();

  const driverDetail: DriverDetailView = (() => {
    const x = st.detailCarId ? perCar.find((p) => p.c.id === st.detailCarId) : undefined;
    if (!x)
      return {
        initials: '',
        name: '',
        tag: '',
        tagBg: '',
        tagFg: '',
        periodShort: '',
        cobrado: '',
        pendiente: '',
        pendienteFg: '',
        cumplimiento: '',
        cumplimientoPct: '0%',
        cumplimientoFg: '',
        plate: '',
        rawModel: '',
        model: '',
        estado: '',
        estadoBg: '',
        estadoFg: '',
        cuota: '',
        cuotasLbl: '',
        aFavor: '',
        pagos: [],
        sinPagos: true,
        verVehiculo: () => {},
        editar: () => {},
        quitar: () => {},
      };
    const c = x.c;
    // Solo las cuotas que le tocan a él: si el auto cambió de chofer, las del
    // anterior son de su ficha, no de esta.
    const cuotas = movs.filter((m) => m.carId === c.id && m.type === 'ingreso' && claveChofer(m, c) === claveDeCar(c) && inR(m));
    const impagas = cuotas.filter((m) => m.amount - cobradoDe(m) > 0);
    const facturado = cuotas.reduce((a, m) => a + m.amount, 0);
    const adeudado = cuotas.reduce((a, m) => a + (m.amount - cobradoDe(m)), 0);
    // Qué porcentaje de lo que se le facturó en el período efectivamente entró.
    const cumpl = facturado ? Math.round(((facturado - adeudado) / facturado) * 100) : 100;
    const ok = adeudado === 0;
    const t = FTAG[c.estado];
    return {
      initials: initials(c.driver),
      name: c.driver,
      tag: ok ? 'Al día' : 'Debe',
      tagBg: ok ? '#eef4f0' : '#fdeeea',
      tagFg: ok ? '#2e7d5b' : '#a8412f',
      periodShort: r.short,
      cobrado: fmt(facturado - adeudado, st.hide),
      pendiente: adeudado ? fmt(adeudado, st.hide) : '—',
      pendienteFg: adeudado ? COLORS.neg : '#6b665c',
      cumplimiento: cumpl + '%',
      cumplimientoPct: Math.max(2, Math.min(100, cumpl)) + '%',
      cumplimientoFg: cumpl >= 95 ? COLORS.pos : cumpl >= 80 ? COLORS.warn : COLORS.neg,
      aFavor: saldoAFavor.get(claveDeCar(c)) ? fmt(saldoAFavor.get(claveDeCar(c))!, st.hide) : '',
      plate: c.plate,
      rawModel: c.model,
      model: c.model + ' · ' + c.year,
      estado: t[0],
      estadoBg: t[1],
      estadoFg: t[2],
      cuota: c.cuota ? fmt(c.cuota, st.hide) : '—',
      cuotasLbl: cuotas.length - impagas.length + ' de ' + cuotas.length + ' cuotas cobradas',
      pagos: [...cuotas]
        .sort((a, b) => +b.date - +a.date)
        .slice(0, 8)
        .map((m) => {
          const cob = cobradoDe(m);
          const deuda = m.amount - cob;
          const pagado = deuda === 0;
          return {
            dateLbl: dLbl(m.date),
            desc: m.desc,
            sub: pagado ? 'Cobrado' : cob > 0 ? 'Pagó ' + fmtShort(cob, st.hide) + ' de ' + fmtShort(m.amount, st.hide) + ' · debe ' + fmtShort(deuda, st.hide) : 'Sin cobrar · debe ' + fmtShort(deuda, st.hide),
            // Los cobros de cuota no llevan adjunto: el comprobante es del gasto.
            comprobante: '',
            amt: '+' + fmtShort(cob, st.hide),
            amtFg: pagado ? COLORS.pos : COLORS.neg,
            iconBg: pagado ? '#eef4f0' : '#fdeeea',
            iconFg: pagado ? '#2e7d5b' : '#a8412f',
            sign: pagado ? '↓' : '!',
          };
        }),
      sinPagos: !cuotas.length,
      verVehiculo: () => update({ detailCarId: null, detailId: c.id }),
      editar: () =>
        update({
          detailCarId: null,
          modal: 'drv',
          ndrv: { name: c.driver, carId: c.id, cuota: c.cuota ? miles(String(c.cuota)) : '' },
          driverCredentials: null,
          driverCredentialsLoading: false,
        }),
      quitar: () => update({ detailCarId: null, confirm: { tipo: 'quitarChofer', carId: c.id } }),
    };
  })();

  // Días que quedan del mes en curso, contra `TODAY` y no la fecha real: en la
  // demo `TODAY` está fijo, así que el cartel de cierre tiene que moverse con
  // ella o queda pisado apenas cambie el reloj real.
  const finMes = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0);
  const diasCierre = Math.max(0, daysBetween(TODAY, finMes));
  const mesActual = new Intl.DateTimeFormat('es', { month: 'long' }).format(TODAY);
  const cierreMsg =
    diasCierre === 0
      ? 'Cierra hoy.'
      : 'Faltan ' + diasCierre + (diasCierre === 1 ? ' día' : ' días') + ' para cerrar ' + mesActual + '.';

  return {
    kicker: TITLES[nav][1],
    pageTitle: TITLES[nav][0],
    headerSub: SUBS[nav],
    cierreMsg,
    sResumen: nav === 'resumen',
    sFlota: nav === 'flota',
    sChoferes: nav === 'choferes',
    sAlertas: nav === 'alertas',
    sMovimientos: false,
    sReportes: nav === 'reportes',
    sCobros: nav === 'cobros',
    navItems: (
      [
        ['resumen', 'Resumen', 'm3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', ''],
        ['flota', 'Vehículos', 'M5 17h14M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4M4 13l2-5h12l2 5', String(cars.length)],
        ['choferes', 'Choferes', 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c0-4 3.6-6 8-6s8 2 8 6', String(active.filter((c) => c.driver !== 'Sin chofer').length)],
        ['alertas', 'Alertas', 'M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01', String(alertList.length)],
        ['cobros', 'Cobros', 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4', String(pendMovs.length)],
        ['reportes', 'Reportes', 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8', ''],
      ] as [UIState['nav'], string, string, string][]
    ).map(([k, label, icon, badge]) => ({
      key: k,
      label,
      icon,
      badge,
      bg: nav === k ? '#2a2820' : 'transparent',
      fg: nav === k ? '#fffdf8' : '#bdb6a4',
      badgeFg: nav === k ? '#e8a13a' : '#77726a',
      pick: () => go(k),
    })),
    periodChips: (
      [
        ['semana', '7 días'],
        ['mes', MESES_LARGO[TODAY.getMonth()]],
        ['jul', MESES_LARGO[(TODAY.getMonth() + 11) % 12]],
        ['d90', '90 días'],
        ['custom', 'Rango'],
      ] as [UIState['period'], string][]
    ).map(([k, label]) => ({ label, ...CH(st.period === k), pick: () => update({ period: k }) })),
    isCustom: st.period === 'custom',
    cFrom: st.cFrom,
    cTo: st.cTo,
    onFrom: (iso) => update({ cFrom: iso }),
    onTo: (iso) => update({ cTo: iso }),
    montosLbl: st.hide ? 'Mostrar montos' : 'Ocultar montos',
    toggleMontos: () => update((s2) => ({ hide: !s2.hide })),

    kpis: [
      { label: 'Ingresos', value: fmt(tot.ing, st.hide), delta: delta(tot.ing, prev.ing), bg: COLORS.paper, bd: '#ece4d6', labelFg: '#6b665c', valueFg: '#16150f', deltaFg: '#6b665c' },
      { label: 'Egresos', value: fmt(tot.egr, st.hide), delta: delta(tot.egr, prev.egr), bg: COLORS.paper, bd: '#ece4d6', labelFg: '#6b665c', valueFg: '#16150f', deltaFg: '#6b665c' },
      { label: 'Ganancia neta', value: fmt(tot.net, st.hide), delta: delta(tot.net, prev.net), bg: COLORS.ink, bd: COLORS.ink, labelFg: '#bdb6a4', valueFg: '#fffdf8', deltaFg: '#e8a13a' },
      { label: 'Cobros pendientes', value: fmt(pendTotal, st.hide), delta: pendMovs.length + ' cuotas sin cobrar', bg: '#fdeeea', bd: '#f0d0c6', labelFg: '#a8503c', valueFg: '#8f3324', deltaFg: '#a8503c' },
    ],

    goFlota: () => go('flota'),
    goFlotaTop: () => go('flota', { sortK: 'net', sortDir: -1, filter: 'activo' }),
    goAlertas: () => go('alertas'),
    goMovimientos: (carId) => {
      const latest = carId ? realMovements.find((m) => m.carId === carId) : undefined;
      update({ nav: 'cobros', cobrosTab: 'pagos', movVehicle: carId || 'todos', movMonth: latest ? monthKey(latest.date) : monthKey(TODAY), movPage: 1, movExpanded: null });
    },
    goReportes: () => go('reportes'),
    goCobros: () => go('cobros'),

    fleetFilters: (
      [
        ['todos', 'Todos'],
        ['activo', 'Activos'],
        ['taller', 'Taller'],
        ['baja', 'Baja'],
      ] as [UIState['filter'], string][]
    ).map(([k, label]) => ({ label, ...CH(st.filter === k), pick: () => update({ filter: k }) })),
    cols: mkCols([
      ['plate', 'Vehículo', 'left'],
      ['driver', 'Chofer', 'left'],
      ['cuota', 'Cuota', 'right'],
      ['ing', 'Ingresos', 'right'],
      ['egr', 'Egresos', 'right'],
      ['net', 'Neto', 'right'],
      ['estado', 'Estado', 'right'],
    ]),
    colsF: mkCols([
      ['model', 'Vehículo', 'left'],
      ['driver', 'Chofer', 'left'],
      ['cuota', 'Cuota', 'right'],
      ['svc', 'Service', 'left'],
      ['ing', 'Ingresos', 'right'],
      ['egr', 'Egresos', 'right'],
      ['net', 'Neto', 'right'],
      ['estado', 'Estado', 'right'],
    ]),
    rows: sorted.map(mkRow),
    flotaRows: sorted.map(mkRow),
    carQ: st.carQ,
    setCarQ: (e) => update({ carQ: e.target.value }),
    hoyISO: isoLocal(TODAY),
    openCarModal: () => update({ modal: 'car', ncar: blankCar() }),
    ncarUnidadOpts: (['dias', 'meses'] as const).map((u) => ({
      label: u === 'dias' ? 'días' : 'meses',
      ...CH(st.ncar.serviceUnidad === u),
      pick: () => update((s2) => ({ ncar: { ...s2.ncar, serviceUnidad: u } })),
    })),
    setLastService,
    setSeguroVence,
    setNdrvCuota,

    periodShort: r.short,
    egrTotal: fmt(tot.egr, st.hide),
    ingTotal: fmt(tot.ing, st.hide),
    netTotal: fmt(tot.net, st.hide),
    cats: CATS.map((label) => {
      const v = tot.byCat[label] || 0;
      return { label, amt: fmtShort(v, st.hide), color: CATCOLORS[label], pct: Math.round((v / catMax) * 100) + '%', share: Math.round((v / catTotal) * 100) + '%' };
    }),

    alertCount: alertList.length,
    alertsSummary: (() => {
      if (!alertList.length) return 'Todo al día';
      const vencidos = alertList.filter((a) => a.sev === 2).length;
      const avisos = alertList.length + (alertList.length === 1 ? ' aviso' : ' avisos');
      return vencidos ? avisos + ' · ' + vencidos + (vencidos === 1 ? ' vencido' : ' vencidos') : avisos;
    })(),
    alertsFull: (st.alertKind === 'todas' ? alertList : alertList.filter((a) => a.kind === st.alertKind))
      .filter((a) => matches(st.alertQ, a.car.plate, a.car.model, a.car.driver, a.car.gpsTag, a.text))
      .map((a) => ({
        plate: a.car.plate,
        model: a.car.model + ' · ' + a.car.year,
        gpsTag: a.car.gpsTag || 'Sin GPS',
        text: a.text,
        kind: a.kind,
        dot: a.sev === 2 ? COLORS.neg : COLORS.warn,
        tagBg: KTAG[a.kind][0],
        tagFg: KTAG[a.kind][1],
        open: () => update({ detailId: a.car.id }),
      })),
    alertKindChips: (['todas', ...Object.keys(KTAG)] as string[]).map((k) => ({
      label: k === 'todas' ? 'Todas' : k,
      ...CH(st.alertKind === k),
      pick: () => update({ alertKind: k }),
    })),
    alertQ: st.alertQ,
    setAlertQ: (e) => update({ alertQ: e.target.value }),

    pendCount: pendMovs.length,
    pendSummary: !pendMovs.length ? 'Todo cobrado' : pendMovs.length + (pendMovs.length === 1 ? ' cuota sin cobrar' : ' cuotas sin cobrar'),
    cobrosSub: (() => {
      const n = cobrosVista.length;
      // Con un solo chofer en la vista el texto habla de él en singular, que es
      // como se lee cuando buscás a alguien puntual.
      const unico = new Set(cobrosVista.map((x) => paidBy(x.m, x.c)));
      const quien = unico.size === 1 ? [...unico][0] + ' debe ' : 'deben ';
      return n + (n === 1 ? ' cobro · ' : ' cobros · ') + (cobrosVistaDeuda ? quien + fmt(cobrosVistaDeuda, st.hide) : 'sin deuda');
    })(),
    cobrosFull: cobrosVista.map(({ m, c, debe }) => {
        const cob = cobradoDe(m);
        const tag = debe === 0 ? 'Cobrado' : cob > 0 ? 'Parcial' : 'Pendiente';
        const drv = paidBy(m, c);
        return {
          initials: initials(drv),
          driver: drv,
          plate: c.plate + ' · ' + c.model + ' · ' + (c.gpsTag || 'Sin GPS'),
          desc: m.desc,
          dateLbl: dLbl(m.date),
          tag,
          tagBg: PTAG[tag][0],
          tagFg: PTAG[tag][1],
          // Un parcial dice explícitamente cuánto entró de cuánto: "270k de
          // 540k" no se puede leer mal, un "270k" suelto sí. Y en una pendiente
          // la columna va vacía: no entró nada, poner el monto facturado abajo
          // de "Cobrado" se lee como que sí.
          amt: tag === 'Cobrado' ? fmtShort(m.amount, st.hide) : tag === 'Parcial' ? fmtShort(cob, st.hide) + ' de ' + fmtShort(m.amount, st.hide) : '—',
          debe: debe ? fmtShort(debe, st.hide) : '',
          debeFg: debe ? COLORS.neg : '#6b665c',
          sort: { driver: drv, vehicle: c.plate + ' ' + c.model, description: m.desc, date: m.date.getTime(), status: tag, amount: cob, due: debe },
          // La ficha es del chofer actual del auto: si el auto cambió de manos
          // y esta fila es de un cobro viejo, abre la ficha de quien lo maneja
          // hoy, no la de `drv`, porque no existe una ficha por ex-chofer.
          open: () => update({ quotaDetailId: m.id, movementDetailId: null }),
        };
      }),
    pendKindChips: (['todas', ...Object.keys(PTAG)] as string[]).map((k) => ({
      label: k === 'todas' ? 'Todos' : k,
      ...CH(st.pendKind === k),
      pick: () => update({ pendKind: k }),
    })),
    pendKind: st.pendKind,
    pendQ: st.pendQ,
    setPendQ: (e) => update({ pendQ: e.target.value }),

    cobrosTab: st.cobrosTab,
    cobrosTabChips: (['pagos', 'cuotas'] as const).map((k) => ({
      label: k === 'cuotas' ? 'Cuotas' : 'Movimientos',
      ...CH(st.cobrosTab === k),
      pick: () => update({ cobrosTab: k }),
    })),
    pagosFull: pagosVista.map((p) => {
      const c = p.carId ? carDe.get(p.carId) : undefined;
      const ajuste = p.tipo === 'ajuste';
      return {
        id: p.id,
        initials: initials(p.driver),
        driver: p.driver,
        carLbl: c ? c.plate + ' · ' + c.model + ' · ' + (c.gpsTag || 'Sin GPS') : '—',
        dateLbl: dLbl(p.fecha),
        monto: fmtShort(p.monto, st.hide),
        tag: ajuste ? 'Ajuste' : 'Pago',
        tagBg: ajuste ? '#f4f0e8' : '#eef4f0',
        tagFg: ajuste ? '#6b665c' : '#2e7d5b',
        nota: p.nota ?? '',
        sort: { driver: p.driver, vehicle: c ? c.plate + ' ' + c.model : 'Sin vehículo asociado', note: p.nota ?? '', date: p.fecha.getTime(), type: ajuste ? 'Ajuste' : 'Pago', amount: p.monto },
        open: () => update({ movementDetailId: 'pago-' + p.id, quotaDetailId: null }),
      };
    }),
    pagosSub: (() => {
      const n = pagosVista.length;
      const caja = pagosVista.filter((p) => p.tipo === 'pago').reduce((a, p) => a + p.monto, 0);
      if (!n) return 'Sin movimientos en el período';
      return n + (n === 1 ? ' movimiento · ' : ' movimientos · ') + fmt(caja, st.hide) + ' de caja';
    })(),
    abrirPago: () => update({ npago: { driver: '', fecha: isoLocal(TODAY), monto: '', tipo: 'pago', nota: '', guardando: false } }),
    pagoForm: (() => {
      const f = st.npago;
      if (!f) return null;
      const setF = (patch: Partial<NonNullable<UIState['npago']>>) => update((s) => ({ npago: s.npago && { ...s.npago, ...patch } }));
      // Choferes por su identidad estable (`driverId`), no por el nombre del
      // auto de hoy: un mismo chofer puede aparecer en varios autos si alguna
      // vez se lo reasignó, pero es una sola ficha.
      const choferKey = new Map<string | number, string>();
      cars.forEach((c) => {
        if (c.driver === 'Sin chofer') return;
        const k = claveDeCar(c);
        if (!choferKey.has(k)) choferKey.set(k, c.driver);
      });
      deudaPorChofer.forEach((_, k) => {
        if (!choferKey.has(k)) choferKey.set(k, String(k));
      });
      // Los que deben van primero: son a los que les vas a estar cargando pagos.
      const opciones = [...choferKey.entries()].sort(
        (a, b) => (deudaPorChofer.get(b[0]) ?? 0) - (deudaPorChofer.get(a[0]) ?? 0) || a[1].localeCompare(b[1]),
      );
      const debe = deudaPorChofer.get(f.driver) ?? 0;
      const monto = numFromInput(f.monto);
      return {
        driver: f.driver,
        setDriver: (e) => setF({ driver: e.target.value }),
        opciones: opciones.map(([k, nombre]) => ({ id: k, label: nombre + (deudaPorChofer.get(k) ? ' — debe ' + fmtShort(deudaPorChofer.get(k)!) : ' — al día') })),
        fecha: f.fecha,
        setFecha: (iso) => setF({ fecha: iso }),
        hoy: isoLocal(TODAY),
        monto: f.monto,
        setMonto: (v) => setF({ monto: v }),
        tipoOpts: (['pago', 'ajuste'] as const).map((k) => ({
          label: k === 'pago' ? 'Pago' : 'Ajuste',
          ...CH(f.tipo === k),
          pick: () => setF({ tipo: k }),
        })),
        nota: f.nota,
        setNota: (e) => setF({ nota: e.target.value }),
        // Se adelanta lo que va a pasar, porque la imputación es automática y
        // sin esto el monto se carga a ciegas.
        destino: !f.driver
          ? 'Elegí un chofer para ver a qué se imputa'
          : !monto
            ? debe
              ? 'Debe ' + fmt(debe) + ' · se cancela de lo más viejo primero'
              : 'No debe nada · lo que cargues queda a favor'
            : monto >= debe
              ? (debe ? 'Cancela los ' + fmt(debe) + ' que debe' : 'No debe nada') + (monto > debe ? ' · quedan ' + fmt(monto - debe) + ' a favor' : ' y queda al día')
              : 'Cancela ' + fmt(monto) + ' de los ' + fmt(debe) + ' que debe · le quedan ' + fmt(debe - monto),
        guardando: f.guardando,
        guardar: savePago,
        cerrar: () => update({ npago: null }),
      };
    })(),

    topCars: [...perCar]
      .filter((x) => x.c.estado !== 'baja')
      .sort((a, b) => b.net - a.net)
      .slice(0, 5)
      .map((x, i) => ({ pos: String(i + 1), plate: x.c.plate, driver: x.c.driver, net: fmtShort(x.net, st.hide) })),

    choferes: (() => {
      // Una ficha por chofer, no por auto: agrupa todos los autos que tuvo el
      // mismo `driverId` (porque alguna vez se lo reasignó) en una sola tarjeta.
      const porChofer = new Map<string, Car[]>();
      cars.forEach((c) => {
        if (c.driver === 'Sin chofer') return;
        const k = claveDeCar(c);
        const g = porChofer.get(k);
        if (g) g.push(c);
        else porChofer.set(k, [c]);
      });
      return [...porChofer.entries()]
        .map(([key, grupo]) => {
          const c = grupo[0];
          const propios = (m: Mov) => claveChofer(m, carDe.get(m.carId)) === key;
          const dStats = stats(movs, aplicaciones, (m) => propios(m) && inR(m), (a) => a.driver === key && inRA(a), pagos, (p) => (p.driverId != null ? String(p.driverId) : p.driver) === key && inRP(p));
          const pend = grupo.reduce((acc, car) => acc + pendMovs.filter((m) => m.carId === car.id && propios(m)).reduce((a, m) => a + deudaDe(m), 0), 0);
          const ok = pend === 0;
          return {
            name: c.driver,
            initials: initials(c.driver),
            carLbl: grupo.length === 1 ? c.plate + ' · ' + c.model + ' · ' + (c.gpsTag || 'Sin GPS') : grupo.length + ' vehículos',
            cuota: fmtShort(c.cuota, st.hide),
            cobrado: fmtShort(dStats.ing, st.hide),
            pend: pend ? fmtShort(pend, st.hide) : '—',
            pendFg: pend ? '#c0553f' : '#6b665c',
            tag: ok ? 'Al día' : 'Debe',
            tagBg: ok ? '#eef4f0' : '#fdeeea',
            tagFg: ok ? '#2e7d5b' : '#a8412f',
            open: () => update({ detailCarId: c.id }),
          };
        })
        .filter((x) => matches(st.chQ, x.name, x.carLbl))
        .filter((x) => (st.chKind === 'todas' ? true : st.chKind === 'aldia' ? x.tag === 'Al día' : x.tag === 'Debe'));
    })(),
    chKind: st.chKind,
    chKindChips: (
      [
        ['todas', 'Todos'],
        ['aldia', 'Al día'],
        ['debe', 'Debe'],
      ] as [string, string][]
    ).map(([k, label]) => ({ label, ...CH(st.chKind === k), pick: () => update({ chKind: k }) })),
    choferesSub: (() => {
      const asignados = perCar.filter((x) => x.c.driver !== 'Sin chofer');
      const deben = asignados.filter((x) => pendMovs.some((m) => m.carId === x.c.id)).length;
      if (!asignados.length) return 'Sin choferes asignados';
      if (!deben) return asignados.length + ' choferes · todos al día';
      return deben + ' con saldo pendiente · ' + (asignados.length - deben) + ' al día';
    })(),
    chQ: st.chQ,
    setChQ: (e) => update({ chQ: e.target.value }),
    openDrvModal: () => update({ modal: 'drv', ndrv: blankDrv(), driverCredentials: null, driverCredentialsLoading: false }),

    movsSub: movsFiltered.length + ' movimientos en ' + r.short + (st.movType !== 'todos' || st.movCat !== 'todas' ? ' con los filtros aplicados' : ''),
    movTypeChips: (
      [
        ['todos', 'Todos'],
        ['ingreso', 'Ingresos'],
        ['egreso', 'Egresos'],
      ] as [UIState['movType'], string][]
    ).map(([k, label]) => ({ label, ...CH(st.movType === k), pick: () => update({ movType: k, movCat: k === 'ingreso' ? 'todas' : st.movCat }) })),
    movCatChips: [['todas', 'Todas las categorías'], ...CATS.map((c) => [c, c] as [string, string])].map(([k, label]) => ({
      label,
      ...CH(st.movCat === k),
      pick: () => update({ movCat: k, movType: k === 'todas' ? st.movType : 'egreso' }),
    })),
    movRows: movsFiltered.map((m, i) => {
      const c = cars.find((c2) => c2.id === m.carId)!;
      const inc = m.type === 'ingreso';
      return {
        pos: i + 1,
        dateLbl: dLbl(m.date),
        sign: inc ? '↓' : '↑',
        iconBg: inc ? '#eef4f0' : '#fdeeea',
        iconFg: inc ? '#2e7d5b' : '#a8412f',
        desc: m.desc,
        // Una cuota a medias arrastra su deuda al subtítulo, así el listado
        // general no queda mostrando plata que en realidad no entró.
        sub: c.plate + ' · ' + (c.gpsTag || 'Sin GPS') + ' · ' + (inc ? paidBy(m, c) + (m.amount - cobradoDe(m) > 0 ? ' · debe ' + fmtShort(m.amount - cobradoDe(m), st.hide) : '') : m.cat),
        amt: (inc ? '+' : '−') + fmtShort(inc ? cobradoDe(m) : m.amount, st.hide),
        amtFg: inc ? '#2e7d5b' : '#c0553f',
        items: m.items,
        manoObra: m.manoObra,
      };
    }),
    movQ: st.movQ,
    setMovQ: (e) => update({ movQ: e.target.value }),
    movCats: CATS.map((label) => {
      const v = movTot.byCat[label] || 0;
      return { label, amt: fmtShort(v, st.hide), color: CATCOLORS[label], pct: Math.round((v / movCatMax) * 100) + '%', share: Math.round((v / movCatTotal) * 100) + '%' };
    }),
    movEgrTotal: fmt(movTot.egr, st.hide),
    movIngTotal: fmt(movTot.ing, st.hide),
    movNetTotal: fmt(movTot.net, st.hide),
    exportar: async () => {
      const periodPayload = { type: st.period, ...(st.period === 'custom' ? { from: st.cFrom, to: st.cTo } : { to: isoLocal(TODAY) }) } as ReportExportPayload['period'];
      try {
        const result = await persist.exportReport({ period: periodPayload, include: 'ambos', carIds: 'todos', categories: 'todas', format: 'xlsx' });
        const a = document.createElement('a'); a.href = result.file.url; a.download = result.file.name; a.click();
        toast('Excel descargado · ' + result.counts.total + ' movimientos');
      } catch (e) { toast('No se pudo exportar: ' + (e as Error).message); }
      return;
    },
      // Legacy client-side export retained below as historical context.
    /*
      if (!movsFiltered.length) return toast('No hay movimientos para exportar con estos filtros');
      try {
        await downloadXlsx(
          'movimientos-' + isoLocal(TODAY) + '.xlsx',
          'Movimientos',
          ['Fecha', 'Tipo', 'Vehículo', 'Modelo', 'Año', 'Chofer', 'Descripción', 'Categoría', 'Estado', 'Comprobante', 'Facturado', 'Monto', 'Debe'],
          movsFiltered.map((m) => {
            const c = cars.find((c2) => c2.id === m.carId);
            const inc = m.type === 'ingreso';
            const cob = cobradoDe(m);
            return [
              isoLocal(m.date),
              inc ? 'Ingreso' : 'Egreso',
              c?.plate ?? '',
              c?.model ?? '',
              c?.year ?? '',
              // El chofer va en toda fila, no solo en los ingresos: un gasto del
              // vehículo igual es del chofer que lo tiene asignado.
              c?.driver ?? '',
              m.desc,
              // Un ingreso no tiene categoría de gasto y un egreso no tiene
              // estado de cobro. El guion marca "no aplica"; si toda la
              // exportación quedó así, `downloadXlsx` saca la columna entera.
              inc ? '—' : (m.cat ?? '—'),
              inc ? (m.amount - cob === 0 ? 'Cobrado' : cob > 0 ? 'Pago parcial' : 'Pendiente') : '—',
              m.comprobante ? m.comprobante.nombre : '—',
              // "Monto" es la plata que se movió de verdad, en las dos
              // direcciones. Facturado y Debe son propios del cobro, así que en
              // un gasto no aplican (y si la exportación es toda de gastos,
              // `downloadXlsx` borra esas dos columnas enteras).
              inc ? m.amount : '—',
              inc ? cob : m.amount,
              inc ? m.amount - cob : '—',
            ];
          }),
        );
        toast(movsFiltered.length + (movsFiltered.length === 1 ? ' movimiento exportado' : ' movimientos exportados'));
      } catch {
        toast('No se pudo generar el Excel — probá de nuevo');
      }
    },
    */
    exportarPdf: async () => {
      const periodPayload = { type: st.period, ...(st.period === 'custom' ? { from: st.cFrom, to: st.cTo } : { to: isoLocal(TODAY) }) } as ReportExportPayload['period'];
      try {
        const result = await persist.exportReport({ period: periodPayload, include: 'ambos', carIds: 'todos', categories: 'todas', format: 'pdf' });
        const a = document.createElement('a'); a.href = result.file.url; a.download = result.file.name; a.click();
        toast('PDF descargado · ' + result.counts.total + ' movimientos');
      } catch (e) { toast('No se pudo exportar: ' + (e as Error).message); }
    },

    movementMonths: movementMonths.map((m) => ({
      key: monthKey(m.rows[0]?.date || monthDate(m.key)),
      label: monthLabel(m.key),
      year: m.key.slice(0, 4),
      count: String(m.rows.length),
      income: fmtShort(m.income, st.hide),
      expense: fmtShort(m.expense, st.hide),
      net: fmtShort(m.income - m.expense, st.hide),
      active: m.key === selectedMovementMonth,
      select: () => update({ movMonth: m.key, movPage: 1, movExpanded: null }),
    })),
    movementRows: movementPageRows.map((m) => ({
      id: m.id,
      dateLbl: dLbl(m.date),
      type: m.type,
      typeLbl: m.type === 'ingreso' ? 'Ingreso' : 'Gasto',
      vehicle: m.vehicle,
      driver: m.driver,
      desc: m.desc,
      category: m.category,
      note: m.note,
      medio: m.medio,
      amount: (m.type === 'ingreso' ? '+' : '−') + fmtShort(m.amount, st.hide),
      amountFg: m.type === 'ingreso' ? COLORS.pos : COLORS.neg,
      comprobante: m.comprobante,
      items: m.items,
      manoObra: m.manoObra,
    })),
    movementTotalRows: filteredRealMovements.length,
    movementPage,
    movementPageCount,
    movementMonth: selectedMovementMonth,
    movementExpandedId: st.movExpanded,
    movementVehicle: st.movVehicle,
    movementVehicleChips: [
      { label: 'Todos los vehículos', ...CH(st.movVehicle === 'todos'), pick: () => update({ movVehicle: 'todos', movPage: 1, movExpanded: null }) },
      ...cars.map((c) => ({ label: c.plate, ...CH(st.movVehicle === c.id), pick: () => update({ movVehicle: c.id, movPage: 1, movExpanded: null }) })),
    ],
    movementTypeChips: (['todos', 'ingreso', 'egreso'] as const).map((k) => ({ label: k === 'todos' ? 'Todos' : k === 'ingreso' ? 'Ingresos' : 'Gastos', ...CH(st.movType === k), pick: () => update({ movType: k, movPage: 1, movExpanded: null }) })),
    movementCategoryChips: [['todas', 'Todas'], ...CATS.map((c) => [c, c] as [string, string])].map(([k, label]) => ({ label, ...CH(st.movCat === k), pick: () => update({ movCat: k, movType: k === 'todas' ? st.movType : 'egreso', movPage: 1, movExpanded: null }) })),
    setMovementVehicle: (id) => update({ movVehicle: id, movPage: 1, movExpanded: null }),
    movementPrevPage: () => update({ movPage: Math.max(1, movementPage - 1), movExpanded: null }),
    movementNextPage: () => update({ movPage: Math.min(movementPageCount, movementPage + 1), movExpanded: null }),
    movementOpenRow: (id) => update((s) => ({ movExpanded: s.movExpanded === id ? null : id })),
    movementDetail,
    quotaDetail,

    hasDetail: !!st.detailId,
    detail,
    // Cerrar descarta el borrador del intervalo: si no, volver a abrir la ficha
    // mostraría un número que nunca se guardó.
    closeDetail: () => update({ detailId: null, svcEdit: null }),

    ...(() => {
      const c = st.confirm ? cars.find((x) => x.id === st.confirm!.carId) : undefined;
      if (!st.confirm || !c) {
        return { confirmOpen: false, confirmTitulo: '', confirmDetalle: '', confirmAviso: '', confirmBoton: '', confirmar: () => {}, cancelarConfirm: () => update({ confirm: null }) };
      }
      const cerrar = () => update({ confirm: null });

      if (st.confirm.tipo === 'quitarChofer') {
        return {
          confirmOpen: true,
          confirmTitulo: '¿Quitar a ' + c.driver + '?',
          confirmDetalle: `${c.plate} queda sin chofer y deja de generar cuota. Los cobros ya registrados no se tocan.`,
          confirmAviso: 'El nombre del chofer no se guarda en ningún otro lado: si lo quitás, hay que volver a escribirlo.',
          confirmBoton: 'Quitar chofer',
          confirmar: () => {
            patchCar(c.id, { driver: 'Sin chofer', cuota: 0 });
            cerrar();
            toast('Chofer desvinculado de ' + c.plate);
          },
          cancelarConfirm: cerrar,
        };
      }

      // Borrar el vehículo arrastra sus movimientos, así que el aviso dice
      // exactamente cuánta plata registrada desaparece de los reportes.
      const suyos = movs.filter((m) => m.carId === c.id);
      const ing = suyos.filter((m) => m.type === 'ingreso').reduce((a, m) => a + cobradoDe(m), 0);
      const egr = suyos.filter((m) => m.type === 'egreso').reduce((a, m) => a + m.amount, 0);
      return {
        confirmOpen: true,
        confirmTitulo: '¿Eliminar ' + c.plate + '?',
        confirmDetalle: `Se borra ${c.model} del ${c.year}${c.driver !== 'Sin chofer' ? ', junto con su chofer ' + c.driver : ''}. Esto no se puede deshacer.`,
        confirmAviso: suyos.length
          ? `También se borran sus ${suyos.length} movimientos (${fmt(ing)} cobrados y ${fmt(egr)} en gastos), así que los totales de Reportes van a cambiar. Si solo dejó de circular, conviene marcarlo como Baja en lugar de eliminarlo.`
          : 'Si solo dejó de circular, conviene marcarlo como Baja en lugar de eliminarlo.',
        confirmBoton: 'Eliminar vehículo',
        confirmar: () => {
          cerrar();
          update({ detailId: null });
          persist
            .deleteCar(c.id)
            .then((r) => toast('Vehículo eliminado · ' + r.plate + (r.movs ? ' y sus ' + r.movs + ' movimientos' : '')))
            .catch((e: Error) => toast('No se pudo eliminar: ' + e.message));
        },
        cancelarConfirm: cerrar,
      };
    })(),

    ...(() => {
      const t = st.taller;
      const car = t ? cars.find((c) => c.id === t.carId) : undefined;
      const editar = (patch: Partial<NonNullable<UIState['taller']>>) => update((s) => (s.taller ? { taller: { ...s.taller, ...patch } } : {}));
      const cerrar = () => update({ taller: null });
      return {
        tallerOpen: !!t && !!car,
        tallerPlate: car ? car.plate : '',
        tallerRazon: t?.razon ?? '',
        tallerMonto: t?.monto ?? '',
        tallerArchivo: t?.archivo?.name ?? '',
        tallerGuardando: t?.guardando ?? false,
        setTallerRazon: (e: React.ChangeEvent<HTMLInputElement>) => editar({ razon: e.target.value }),
        setTallerMonto: (v: string) => editar({ monto: v }),
        setTallerArchivo: (f: File | null) => editar({ archivo: f }),
        cerrarTaller: cerrar,
        tallerGuardar: () => {
          if (!t || !car || t.guardando) return;
          const razon = t.razon.trim();
          if (!razon) return toast('Escribí por qué entra a taller');
          const monto = numFromInput(t.monto);
          if (!monto) return toast('Indicá cuánto se gasta en el taller');
          // El botón se bloquea mientras sube: con un comprobante de varios MB
          // hay tiempo de sobra para apretarlo dos veces y duplicar el gasto.
          editar({ guardando: true });
          persist
            .mandarATaller(car.id, { razon, monto, comprobante: t.archivo })
            .then(() => {
              cerrar();
              toast(car.plate + ' en taller · gasto de ' + fmt(monto) + ' registrado');
            })
            .catch((e: Error) => {
              editar({ guardando: false });
              toast('No se pudo registrar: ' + e.message);
            });
        },
      };
    })(),

    hasDriverDetail: !!st.detailCarId,
    driverDetail,
    closeDriverDetail: () => update({ detailCarId: null }),

    carModal: st.modal === 'car',
    editCarModal: !!st.editCar,
    editCar,
    editCarDriverOptions,
    editCarChange,
    editCarSave,
    editCarClose,
    editCarDelete,
    serviceModal: !!st.service,
    service: st.service,
    serviceVehicle: st.service ? (cars.find((c) => c.id === st.service!.carId)?.plate ?? '') : '',
    serviceSet,
    serviceNext,
    serviceBack,
    serviceSave,
    serviceClose: () => update({ service: null }),
    drvModal: st.modal === 'drv',
    ncar: st.ncar,
    ch,
    ndrv: st.ndrv,
    dh,
    drvCredentials: st.driverCredentials,
    drvCredentialsLoading: st.driverCredentialsLoading,
    drvNeedsCredentials: cars.find((c) => c.id === st.ndrv.carId)?.driver !== st.ndrv.name.trim(),
    closeModal: () => update({ modal: null, driverCredentials: null, driverCredentialsLoading: false }),
    saveCar,
    previewDrv,
    backDrv: () => update({ driverCredentials: null, driverCredentialsLoading: false }),
    saveDrv,
    carOptions: cars
      .filter((c) => c.estado !== 'baja')
      .map((c) => ({ id: c.id, label: c.plate + ' · ' + c.model + (c.driver === 'Sin chofer' ? ' — libre' : ' — ' + c.driver) })),

    hasToast: !!st.toast,
    toastMsg: st.toast,
  };
}
