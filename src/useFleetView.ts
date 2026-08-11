import { useCallback, useMemo, useRef } from 'react';
import type { Car, Mov, UIState, NewCarForm, NewDriverForm } from './types';
import type { NuevoCarPayload } from './api';
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
  text: string;
  kind: string;
  dot: string;
  tagBg: string;
  tagFg: string;
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
  amt: string;
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
  dateLbl: string;
  sign: string;
  iconBg: string;
  iconFg: string;
  desc: string;
  sub: string;
  amt: string;
  amtFg: string;
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
  cobradas: string;
  pendientes: string;
  svcLbl: string;
  svcSub: string;
  svcFg: string;
  svcPct: string;
  svcBar: string;
  /** Intervalo en edición: el campo muestra el borrador, no lo guardado. */
  svcCada: string;
  svcSetCada: (e: React.ChangeEvent<HTMLInputElement>) => void;
  svcUnidadOpts: Chip[];
  svcGuardar: () => void;
  svcPuedeGuardar: boolean;
  svcHint: string;
  docs: DetailDoc[];
  estadoOpts: Chip[];
  months: DetailMonth[];
  movs: DetailMov[];
  markService: () => void;
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
  diasCierre: number;
  sResumen: boolean;
  sFlota: boolean;
  sChoferes: boolean;
  sAlertas: boolean;
  sReportes: boolean;
  sCobros: boolean;
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

  tableSub: string;
  fleetFilters: Chip[];
  cols: ColItem[];
  colsF: ColItem[];
  brandFilters: Chip[];
  rows: VehicleRow[];
  flotaRows: VehicleRow[];
  openCarModal: () => void;

  periodShort: string;
  egrTotal: string;
  ingTotal: string;
  netTotal: string;
  cats: CatItem[];

  alertCount: number;
  alertsSummary: string;
  alertsFull: AlertFull[];
  alertKindChips: Chip[];

  pendCount: number;
  pendSummary: string;
  pendFull: PendFull[];
  pendKindChips: Chip[];

  topCars: TopCarItem[];

  choferes: ChoferItem[];
  choferesSub: string;
  openDrvModal: () => void;

  movsSub: string;
  movTypeChips: Chip[];
  movCatChips: Chip[];
  movRows: MovRow[];
  exportar: () => void;

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
  drvModal: boolean;
  ncar: NewCarForm;
  ch: Record<Exclude<keyof NewCarForm, 'serviceUnidad' | 'seguroPeriodo' | 'lastService' | 'seguroVence' | 'seguroCosto'>, (e: React.ChangeEvent<HTMLInputElement>) => void>;
  /** Campos que ya entregan el valor formateado, no un evento. */
  setLastService: (iso: string) => void;
  setSeguroVence: (iso: string) => void;
  setSeguroCosto: (v: string) => void;
  /** Selector días/meses del alta. */
  ncarUnidadOpts: Chip[];
  /** Selector mensual/anual del costo del seguro. */
  ncarPeriodoOpts: Chip[];
  /** Hoy en ISO, para topar el <input type="date"> del último service. */
  hoyISO: string;
  ndrv: NewDriverForm;
  dh: {
    name: (e: React.ChangeEvent<HTMLInputElement>) => void;
    carId: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  };
  setNdrvCuota: (v: string) => void;
  closeModal: () => void;
  saveCar: () => void;
  saveDrv: () => void;
  carOptions: CarOption[];

  hasToast: boolean;
  toastMsg: string;
}

function CH(on: boolean) {
  return { on, bg: on ? COLORS.ink : COLORS.paper, fg: on ? COLORS.paper : '#3d3a34', bd: on ? COLORS.ink : '#e0d6c4' };
}

function blankCar(): NewCarForm {
  return {
    plate: '',
    model: '',
    year: '2018',
    gpsTag: '',
    lastService: isoLocal(TODAY),
    serviceCada: '6',
    serviceUnidad: 'meses',
    // El vencimiento no se presupone: es el dato que hay que mirar en la póliza.
    seguroVence: '',
    seguroCosto: '',
    seguroPeriodo: 'mensual',
    seguroCada: '12',
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
};

const PTAG: Record<string, [string, string]> = {
  Pendiente: ['#fdf3e2', '#a8730f'],
  Parcial: ['#eef1f6', '#4a6d99'],
};

function stats(movs: Mov[], f: (m: Mov) => boolean) {
  let ing = 0;
  let egr = 0;
  const byCat: Record<string, number> = {};
  movs.forEach((m) => {
    if (!f(m)) return;
    if (m.type === 'ingreso') ing += m.amount;
    else {
      egr += m.amount;
      byCat[m.cat!] = (byCat[m.cat!] || 0) + m.amount;
    }
  });
  return { ing, egr, net: ing - egr, byCat };
}

function range(state: UIState) {
  const k = state.period;
  if (k === 'semana') return { start: addD(TODAY, -6), end: TODAY, label: 'Últimos 7 días', short: '7 días' };
  if (k === 'jul') return { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31, 23, 59), label: 'Julio 2026', short: 'julio' };
  if (k === 'd90') return { start: addD(TODAY, -89), end: TODAY, label: 'Últimos 90 días', short: '90 días' };
  if (k === 'custom') {
    let start = new Date(state.cFrom + 'T00:00:00');
    let end = new Date(state.cTo + 'T23:59:59');
    if (isNaN(+start) || isNaN(+end) || end < start) {
      start = new Date(2026, 7, 1);
      end = TODAY;
    }
    return { start, end, label: dLbl(start) + ' – ' + dLbl(end), short: 'el rango' };
  }
  return { start: new Date(2026, 7, 1), end: TODAY, label: 'Agosto 2026', short: 'agosto' };
}

export function useFleetView(
  cars: Car[],
  movs: Mov[],
  state: UIState,
  update: (patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => void,
  persist: {
    patchCar: (id: string, patch: Partial<Car>) => void;
    addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
    deleteCar: (id: string) => Promise<{ plate: string; movs: number }>;
    mandarATaller: (id: string, datos: { razon: string; monto: number; comprobante: File | null }) => Promise<void>;
  },
): View {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = (m: string) => {
    clearTimeout(toastTimer.current);
    update({ toast: m });
    toastTimer.current = setTimeout(() => update({ toast: '' }), 2400);
  };

  const go = (nav: UIState['nav'], extra?: Partial<UIState>) => update({ nav, ...(extra || {}) });

  const patchCar = persist.patchCar;

  const ch = useMemo(
    () => ({
      plate: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, plate: e.target.value } })),
      model: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, model: e.target.value } })),
      year: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, year: e.target.value } })),
      gpsTag: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, gpsTag: e.target.value } })),
      serviceCada: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, serviceCada: e.target.value } })),
      seguroCada: (e: React.ChangeEvent<HTMLInputElement>) => update((s) => ({ ncar: { ...s.ncar, seguroCada: e.target.value } })),
    }),
    [],
  );

  // Las fechas no vienen de un evento de input: DateField entrega el ISO ya
  // armado, porque lo que se tipea es `dd/mm/aaaa`.
  const setLastService = useCallback((iso: string) => update((s) => ({ ncar: { ...s.ncar, lastService: iso } })), []);
  const setSeguroVence = useCallback((iso: string) => update((s) => ({ ncar: { ...s.ncar, seguroVence: iso } })), []);
  // El monto llega ya con los puntos puestos por MoneyInput.
  const setSeguroCosto = useCallback((v: string) => update((s) => ({ ncar: { ...s.ncar, seguroCosto: v } })), []);
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
    if (!cada) {
      toast('Indicá cada cuánto se le hace el service');
      return;
    }
    if (n.lastService > isoLocal(TODAY)) {
      toast('El último service no puede ser una fecha futura');
      return;
    }
    if (!n.seguroVence) {
      toast('Indicá cuándo vence el seguro');
      return;
    }
    const segCosto = numFromInput(n.seguroCosto);
    if (!segCosto) {
      toast('Indicá el costo del seguro');
      return;
    }
    const segCada = numFromInput(n.seguroCada);
    if (!segCada || segCada > SEG_CADA_MAX) {
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
        lastServiceDate: n.lastService || isoLocal(TODAY),
        serviceCada: cada,
        serviceUnidad: n.serviceUnidad,
        seguroDate: n.seguroVence,
        seguroCosto: segCosto,
        seguroPeriodo: n.seguroPeriodo,
        seguroCada: segCada,
      })
      .then(() => {
        update({ modal: null, ncar: blankCar(), nav: 'flota' });
        toast('Vehículo agregado · ' + plate + ' · asignale un chofer para cobrarle cuota');
      })
      .catch((e: Error) => toast('No se pudo agregar: ' + e.message));
  };

  const saveDrv = () => {
    const d = state.ndrv;
    const name = d.name.trim();
    if (!name) {
      toast('Ingresá el nombre del chofer');
      return;
    }
    if (!d.carId) {
      toast('Elegí a qué vehículo lo asignás');
      return;
    }
    const cuota = numFromInput(d.cuota);
    if (!cuota) {
      toast('Ingresá la cuota diaria del chofer');
      return;
    }
    const car = cars.find((c) => c.id === d.carId)!;
    patchCar(d.carId, { driver: name, cuota });
    update({ modal: null, ndrv: blankDrv(), nav: 'choferes' });
    toast('Chofer asignado · ' + name + ' · ' + car.plate);
  };

  const st = state;
  const r = range(st);
  const inR = (m: Mov) => m.date >= r.start && m.date <= r.end;
  const days = Math.max(1, Math.round((+r.end - +r.start) / 864e5) + 1);
  const prevEnd = addD(r.start, -1);
  const prevStart = addD(prevEnd, -(days - 1));
  const inPrev = (m: Mov) => m.date >= prevStart && m.date <= prevEnd;
  const tot = stats(movs, inR);
  const prev = stats(movs, inPrev);
  const active = cars.filter((c) => c.estado !== 'baja');
  const pendMovs = movs.filter((m) => m.type === 'ingreso' && m.estado !== 'pagado' && inR(m)).sort((a, b) => +b.date - +a.date);
  const pendTotal = pendMovs.reduce((a, m) => a + m.amount, 0);

  const alertList: { car: Car; kind: string; sev: number; text: string }[] = [];
  active.forEach((c) => {
    const dLeft = svcDaysLeft(c);
    if (dLeft <= SVC_AVISO_DIAS)
      alertList.push({
        car: c,
        kind: 'Service',
        sev: dLeft < 0 ? 2 : 1,
        text: 'Service ' + svcLeftLbl(dLeft, true),
      });
    const segLeft = daysBetween(TODAY, c.seguroDate);
    if (segLeft <= 20)
      alertList.push({
        car: c,
        kind: 'Seguro',
        sev: segLeft < 0 ? 2 : 1,
        text: 'Seguro ' + (segLeft < 0 ? 'vencido hace ' + durLbl(segLeft) : segLeft === 0 ? 'vence hoy' : 'vence en ' + durLbl(segLeft)),
      });
    if (c.estado === 'taller') alertList.push({ car: c, kind: 'Taller', sev: 1, text: 'En taller, sin generar cuota' });
  });
  alertList.sort((a, b) => b.sev - a.sev);

  const perCar = cars.map((c) => ({ c, ...stats(movs, (m) => m.carId === c.id && inR(m)) }));
  const maxNet = Math.max(...perCar.map((x) => Math.abs(x.net)), 1);
  const brandOfCar = (c: Car) => String(c.model).split(' ')[0];
  const brands = [...new Set(cars.map(brandOfCar))].sort();
  const brandSel = st.brand || 'todas';
  const filtered = perCar.filter((x) => (st.filter === 'todos' ? true : x.c.estado === st.filter) && (brandSel === 'todas' || brandOfCar(x.c) === brandSel));
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
      tag: t[0],
      tagBg: t[1],
      tagFg: t[2],
      rowBg: x.c.estado === 'baja' ? '#faf7f0' : 'transparent',
      open: () => update({ detailId: x.c.id }),
    };
  };

  const movsSorted = movs.filter(inR).sort((a, b) => +b.date - +a.date);
  const movsFiltered = movsSorted.filter((m) => (st.movType === 'todos' || m.type === st.movType) && (st.movCat === 'todas' || (m.type === 'egreso' && m.cat === st.movCat)));

  const nav = st.nav;
  const TITLES: Record<string, [string, string]> = {
    resumen: [r.label, 'Resumen'],
    flota: ['Vehículos', 'Flota'],
    choferes: ['Choferes', 'Equipo'],
    alertas: ['Alertas', 'Mantenimiento'],
    reportes: ['Reportes', 'Movimientos'],
    cobros: ['Cobros pendientes', 'Ingresos'],
  };
  const SUBS: Record<string, string> = {
    resumen: active.length + ' vehículos activos · ' + (cars.length - active.length) + ' fuera de servicio · datos al ' + dLbl(TODAY),
    flota: sorted.length + ' vehículos en la vista · tocá una columna para ordenar',
    choferes: active.filter((c) => c.driver !== 'Sin chofer').length + ' choferes asignados · cobros de ' + r.short,
    alertas: alertList.length + ' avisos de mantenimiento y documentos',
    reportes: movsSorted.length + ' movimientos en ' + r.short,
    cobros: pendMovs.length + ' cuotas sin cobrar en ' + r.short + ' · ' + fmt(pendTotal, st.hide),
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
        cobradas: '',
        pendientes: '',
        svcLbl: '',
        svcSub: '',
        svcFg: '',
        svcPct: '0%',
        svcBar: '',
        svcCada: '',
        svcSetCada: () => {},
        svcUnidadOpts: [],
        svcGuardar: () => {},
        svcPuedeGuardar: false,
        svcHint: '',
        docs: [],
        estadoOpts: [],
        months: [],
        movs: [],
        markService: () => {},
        editDriver: () => {},
        clearDriver: () => {},
        borrar: () => {},
      };
    }
    const cs = stats(movs, (m) => m.carId === c.id && inR(m));
    const dLeft = svcDaysLeft(c);
    const svcTotalDias = Math.max(1, daysBetween(c.lastServiceDate, svcNextDate(c)));
    const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const months: { label: string; ing: number; egr: number; net: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(2026, 7 - k, 1);
      const m0 = d.getMonth();
      const s2 = stats(movs, (m) => m.carId === c.id && m.date.getMonth() === m0 && m.date.getFullYear() === 2026);
      months.push({ label: MES[m0], ing: s2.ing, egr: s2.egr, net: s2.net });
    }
    const mMax = Math.max(...months.map((m) => Math.max(m.ing, m.egr)), 1);
    const cuotasCobradas = movs.filter((m) => m.carId === c.id && m.type === 'ingreso' && m.estado === 'pagado' && inR(m)).length;
    const cuotasPend = movs.filter((m) => m.carId === c.id && m.type === 'ingreso' && m.estado !== 'pagado' && inR(m));

    // El intervalo de service se edita en borrador y se confirma con "Guardar":
    // a diferencia del resto de la ficha, escribir un número de a un dígito
    // pasaría por valores absurdos si cada tecla se guardara sola.
    const bor = st.svcEdit && st.svcEdit.carId === c.id ? st.svcEdit : { carId: c.id, cada: String(c.serviceCada), unidad: c.serviceUnidad };
    const borN = Number(bor.cada);
    const borOk = bor.cada !== '' && Number.isInteger(borN) && borN >= 1 && borN <= SVC_MAX;
    const borCambio = borOk && (borN !== c.serviceCada || bor.unidad !== c.serviceUnidad);
    const editarSvc = (patch: Partial<typeof bor>) => update({ svcEdit: { ...bor, ...patch } });

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
      gpsTag: c.gpsTag || 'Sin GPS',
      gpsFg: c.gpsTag ? '#3d3a34' : '#a09a8d',
      cobradas: cuotasCobradas + ' cuotas cobradas',
      pendientes: cuotasPend.length ? cuotasPend.length + ' sin cobrar · ' + fmtShort(cuotasPend.reduce((a, m) => a + m.amount, 0), st.hide) : 'Todo cobrado',
      svcLbl: (dLeft < 0 ? 'Service vencido hace ' + durLbl(dLeft) : dLeft === 0 ? 'El service vence hoy' : 'Próximo service en ' + durLbl(dLeft)) + ' · ' + dLblFull(svcNextDate(c)),
      svcSub: 'Último service: ' + dLblFull(c.lastServiceDate),
      svcFg: dLeft < 0 ? COLORS.neg : dLeft <= SVC_AVISO_DIAS ? COLORS.warn : COLORS.pos,
      svcPct: Math.max(4, Math.min(100, Math.round(((svcTotalDias - dLeft) / svcTotalDias) * 100))) + '%',
      svcBar: dLeft < 0 ? COLORS.neg : dLeft <= SVC_AVISO_DIAS ? COLORS.warn : COLORS.pos,
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
      docs: [
        (() => {
          // Renovar corre desde el vencimiento, no desde hoy, para no regalar
          // días de póliza. Si ya venció, hoy es el único arranque posible.
          const desde = c.seguroDate > TODAY ? c.seguroDate : TODAY;
          const hasta = addM(desde, c.seguroCada);
          return {
            label: 'Seguro',
            txt: (docLeft(c.seguroDate) < 0 ? 'Vencido hace ' : docLeft(c.seguroDate) === 0 ? '' : 'Vence en ') + (docLeft(c.seguroDate) === 0 ? 'Vence hoy' : durLbl(docLeft(c.seguroDate))) + ' · ' + dLblFull(c.seguroDate),
            sub: (c.seguroCosto ? fmt(c.seguroCosto, st.hide) + (c.seguroPeriodo === 'mensual' ? ' por mes' : ' por año') : 'Sin costo cargado') + ' · se renueva cada ' + svcIntervalo(c.seguroCada, 'meses'),
            fg: docLeft(c.seguroDate) < 0 ? COLORS.neg : docLeft(c.seguroDate) <= 20 ? COLORS.warn : '#3d3a34',
            renew: () => {
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
      movs: movs
        .filter((m) => m.carId === c.id)
        .sort((a, b) => +b.date - +a.date)
        .slice(0, 8)
        .map((m) => {
          const inc = m.type === 'ingreso';
          return {
            dateLbl: dLbl(m.date),
            desc: m.desc,
            sub: inc ? (m.estado === 'pagado' ? 'Cobrado' : m.estado === 'parcial' ? 'Pago parcial' : 'Pendiente') : m.cat!,
            comprobante: m.comprobante ? '/api/comprobantes/' + m.comprobante.id : '',
            amt: (inc ? '+' : '−') + fmtShort(m.amount, st.hide),
            amtFg: inc ? COLORS.pos : COLORS.neg,
            iconBg: inc ? '#eef4f0' : '#fdeeea',
            iconFg: inc ? '#2e7d5b' : '#a8412f',
            sign: inc ? '↓' : '↑',
          };
        }),
      markService: () => {
        patchCar(c.id, { lastServiceDate: TODAY });
        toast('Service registrado el ' + dLblFull(TODAY) + ' · próximo en ' + svcIntervalo(c.serviceCada, c.serviceUnidad));
      },
      editDriver: () => update({ modal: 'drv', ndrv: { name: c.driver === 'Sin chofer' ? '' : c.driver, carId: c.id, cuota: c.cuota ? miles(String(c.cuota)) : '' } }),
      clearDriver: () => update({ confirm: { tipo: 'quitarChofer', carId: c.id } }),
      borrar: () => update({ confirm: { tipo: 'borrarAuto', carId: c.id } }),
    };
  })();

  const driverDetail: DriverDetailView = (() => {
    const x = st.driverId ? perCar.find((p) => p.c.id === st.driverId) : undefined;
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
        pagos: [],
        sinPagos: true,
        verVehiculo: () => {},
        editar: () => {},
        quitar: () => {},
      };
    const c = x.c;
    const cuotas = movs.filter((m) => m.carId === c.id && m.type === 'ingreso' && inR(m));
    const impagas = cuotas.filter((m) => m.estado !== 'pagado');
    const facturado = cuotas.reduce((a, m) => a + m.amount, 0);
    const adeudado = impagas.reduce((a, m) => a + m.amount, 0);
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
          const pagado = m.estado === 'pagado';
          return {
            dateLbl: dLbl(m.date),
            desc: m.desc,
            sub: pagado ? 'Cobrado' : m.estado === 'parcial' ? 'Pago parcial' : 'Pendiente',
            // Los cobros de cuota no llevan adjunto: el comprobante es del gasto.
            comprobante: '',
            amt: '+' + fmtShort(m.amount, st.hide),
            amtFg: pagado ? COLORS.pos : COLORS.neg,
            iconBg: pagado ? '#eef4f0' : '#fdeeea',
            iconFg: pagado ? '#2e7d5b' : '#a8412f',
            sign: pagado ? '↓' : '!',
          };
        }),
      sinPagos: !cuotas.length,
      verVehiculo: () => update({ driverId: null, detailId: c.id }),
      editar: () => update({ driverId: null, modal: 'drv', ndrv: { name: c.driver, carId: c.id, cuota: c.cuota ? miles(String(c.cuota)) : '' } }),
      quitar: () => update({ driverId: null, confirm: { tipo: 'quitarChofer', carId: c.id } }),
    };
  })();

  return {
    kicker: TITLES[nav][1],
    pageTitle: TITLES[nav][0],
    headerSub: SUBS[nav],
    diasCierre: 3,
    sResumen: nav === 'resumen',
    sFlota: nav === 'flota',
    sChoferes: nav === 'choferes',
    sAlertas: nav === 'alertas',
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
        ['mes', 'Agosto'],
        ['jul', 'Julio'],
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
    goReportes: () => go('reportes'),
    goCobros: () => go('cobros'),

    tableSub:
      sorted.length +
      ' de ' +
      cars.length +
      ' vehículos · ordenado por ' +
      (({ plate: 'chapa', model: 'modelo', driver: 'chofer', cuota: 'cuota', svc: 'service', ing: 'ingresos', egr: 'egresos', net: 'neto', estado: 'estado' } as Record<string, string>)[st.sortK] || 'neto'),
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
    brandFilters: [['todas', 'Todas las marcas'], ...brands.map((b) => [b, b] as [string, string])].map(([k, label]) => ({
      label,
      ...CH(brandSel === k),
      pick: () => update({ brand: k }),
    })),
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
    hoyISO: isoLocal(TODAY),
    openCarModal: () => update({ modal: 'car', ncar: blankCar() }),
    ncarUnidadOpts: (['dias', 'meses'] as const).map((u) => ({
      label: u === 'dias' ? 'días' : 'meses',
      ...CH(st.ncar.serviceUnidad === u),
      pick: () => update((s2) => ({ ncar: { ...s2.ncar, serviceUnidad: u } })),
    })),
    setLastService,
    setSeguroVence,
    setSeguroCosto,
    setNdrvCuota,
    ncarPeriodoOpts: (['mensual', 'anual'] as const).map((p) => ({
      label: p,
      ...CH(st.ncar.seguroPeriodo === p),
      pick: () => update((s2) => ({ ncar: { ...s2.ncar, seguroPeriodo: p } })),
    })),

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
    alertsFull: (st.alertKind === 'todas' ? alertList : alertList.filter((a) => a.kind === st.alertKind)).slice(0, 15).map((a) => ({
      plate: a.car.plate,
      model: a.car.model + ' · ' + a.car.year,
      text: a.text,
      kind: a.kind,
      dot: a.sev === 2 ? COLORS.neg : COLORS.warn,
      tagBg: KTAG[a.kind][0],
      tagFg: KTAG[a.kind][1],
    })),
    alertKindChips: (['todas', ...Object.keys(KTAG)] as string[]).map((k) => ({
      label: k === 'todas' ? 'Todas' : k,
      ...CH(st.alertKind === k),
      pick: () => update({ alertKind: k }),
    })),

    pendCount: pendMovs.length,
    pendSummary: !pendMovs.length ? 'Todo cobrado' : pendMovs.length + (pendMovs.length === 1 ? ' cuota sin cobrar' : ' cuotas sin cobrar'),
    pendFull: (st.pendKind === 'todas' ? pendMovs : pendMovs.filter((m) => (m.estado === 'parcial' ? 'Parcial' : 'Pendiente') === st.pendKind))
      .slice(0, 15)
      .map((m) => {
        const c = cars.find((c2) => c2.id === m.carId)!;
        const tag = m.estado === 'parcial' ? 'Parcial' : 'Pendiente';
        return {
          initials: initials(c.driver),
          driver: c.driver,
          plate: c.plate + ' · ' + c.model,
          desc: m.desc,
          dateLbl: dLbl(m.date),
          tag,
          tagBg: PTAG[tag][0],
          tagFg: PTAG[tag][1],
          amt: fmtShort(m.amount, st.hide),
        };
      }),
    pendKindChips: (['todas', ...Object.keys(PTAG)] as string[]).map((k) => ({
      label: k === 'todas' ? 'Todas' : k,
      ...CH(st.pendKind === k),
      pick: () => update({ pendKind: k }),
    })),

    topCars: [...perCar]
      .filter((x) => x.c.estado !== 'baja')
      .sort((a, b) => b.net - a.net)
      .slice(0, 5)
      .map((x, i) => ({ pos: String(i + 1), plate: x.c.plate, driver: x.c.driver, net: fmtShort(x.net, st.hide) })),

    choferes: perCar
      .filter((x) => x.c.driver !== 'Sin chofer')
      .map((x) => {
        const pend = pendMovs.filter((m) => m.carId === x.c.id).reduce((a, m) => a + m.amount, 0);
        const ok = pend === 0;
        return {
          initials: initials(x.c.driver),
          name: x.c.driver,
          carLbl: x.c.plate + ' · ' + x.c.model,
          cuota: fmtShort(x.c.cuota, st.hide),
          cobrado: fmtShort(x.ing, st.hide),
          pend: pend ? fmtShort(pend, st.hide) : '—',
          pendFg: pend ? '#c0553f' : '#6b665c',
          tag: ok ? 'Al día' : 'Debe',
          tagBg: ok ? '#eef4f0' : '#fdeeea',
          tagFg: ok ? '#2e7d5b' : '#a8412f',
          open: () => update({ driverId: x.c.id }),
        };
      }),
    choferesSub: (() => {
      const asignados = perCar.filter((x) => x.c.driver !== 'Sin chofer');
      const deben = asignados.filter((x) => pendMovs.some((m) => m.carId === x.c.id)).length;
      if (!asignados.length) return 'Sin choferes asignados';
      if (!deben) return asignados.length + ' choferes · todos al día';
      return deben + ' con saldo pendiente · ' + (asignados.length - deben) + ' al día';
    })(),
    openDrvModal: () => update({ modal: 'drv', ndrv: blankDrv() }),

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
    movRows: movsFiltered.map((m) => {
      const c = cars.find((c2) => c2.id === m.carId)!;
      const inc = m.type === 'ingreso';
      return {
        dateLbl: dLbl(m.date),
        sign: inc ? '↓' : '↑',
        iconBg: inc ? '#eef4f0' : '#fdeeea',
        iconFg: inc ? '#2e7d5b' : '#a8412f',
        desc: m.desc,
        sub: c.plate + ' · ' + (inc ? c.driver : m.cat),
        amt: (inc ? '+' : '−') + fmtShort(m.amount, st.hide),
        amtFg: inc ? '#2e7d5b' : '#c0553f',
      };
    }),
    exportar: () => toast('Exportación CSV — disponible en la versión final'),

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
      const ing = suyos.filter((m) => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0);
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

    hasDriverDetail: !!st.driverId,
    driverDetail,
    closeDriverDetail: () => update({ driverId: null }),

    carModal: st.modal === 'car',
    drvModal: st.modal === 'drv',
    ncar: st.ncar,
    ch,
    ndrv: st.ndrv,
    dh,
    closeModal: () => update({ modal: null }),
    saveCar,
    saveDrv,
    carOptions: cars
      .filter((c) => c.estado !== 'baja')
      .map((c) => ({ id: c.id, label: c.plate + ' · ' + c.model + (c.driver === 'Sin chofer' ? ' — libre' : ' — ' + c.driver) })),

    hasToast: !!st.toast,
    toastMsg: st.toast,
  };
}
