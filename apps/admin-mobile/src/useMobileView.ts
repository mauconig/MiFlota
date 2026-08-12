import { useEffect } from 'react';
import type { Car, Mov, Pago, MobileState, Screen, RegistrarTab, FleetFilter } from './types';
import { imputar, type Aplicacion } from './cobranza';
import { CATS, CATCOLORS } from './data';
import { COLORS, TODAY, addD, addM, daysBetween, durLbl, dLbl, fmt, fmtShort, initials, statusColor, numFromInput, miles, isoLocal } from './format';
import type { FleetStore } from './api';

const UMBRAL_VERDE = 2500000;
const SVC_AVISO_DIAS = 15;
const SEG_AVISO_DIAS = 20;
const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// --------------------------------------------------------------------------
// Helpers puros, portados de apps/admin-web/src/useFleetView.ts. La demo usa
// `TODAY` fijo (no `new Date()`) para quedar alineada con el `MIFLOTA_HOY`
// del servidor — nunca llamar al reloj real acá.

const svcNextDate = (c: Car) => (c.serviceUnidad === 'meses' ? addM(c.lastServiceDate, c.serviceCada) : addD(c.lastServiceDate, c.serviceCada));
const svcDaysLeft = (c: Car) => daysBetween(TODAY, svcNextDate(c));
/** Una cuota es de quien manejaba el auto cuando se emitió, no de quien lo
 *  maneja hoy: si el auto cambió de chofer, los cobros viejos no cambian de dueño. */
const paidBy = (m: Mov, c: Car) => m.driver || c.driver;

function matches(q: string, ...fields: (string | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

function stats(movs: Mov[], aplicaciones: Aplicacion[], fm: (m: Mov) => boolean, fa: (a: Aplicacion) => boolean) {
  let fact = 0;
  let egr = 0;
  const byCat: Record<string, number> = {};
  movs.forEach((m) => {
    if (!fm(m)) return;
    if (m.type === 'ingreso') fact += m.amount;
    else {
      egr += m.amount;
      byCat[m.cat!] = (byCat[m.cat!] || 0) + m.amount;
    }
  });
  let ing = 0;
  aplicaciones.forEach((a) => {
    if (a.tipo === 'pago' && fa(a)) ing += a.monto;
  });
  return { ing, fact, egr, net: ing - egr, byCat };
}

const finDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const iniDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function range(period: MobileState['period'], cFrom: string, cTo: string) {
  if (period === 'semana') return { start: addD(TODAY, -6), end: finDia(TODAY), label: 'Últimos 7 días', short: '7 días' };
  if (period === 'jul') return { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31, 23, 59), label: 'Julio 2026', short: 'julio' };
  if (period === 'd90') return { start: addD(TODAY, -89), end: finDia(TODAY), label: 'Últimos 90 días', short: '90 días' };
  if (period === 'custom') {
    let start = new Date(cFrom + 'T00:00:00');
    let end = new Date(cTo + 'T23:59:59');
    if (isNaN(+start) || isNaN(+end) || end < start) {
      start = new Date(2026, 7, 1);
      end = finDia(TODAY);
    }
    return { start, end, label: dLbl(start) + ' – ' + dLbl(end), short: 'el rango' };
  }
  return { start: new Date(2026, 7, 1), end: finDia(TODAY), label: 'Agosto 2026', short: 'agosto' };
}

const delta = (now: number, before: number) => {
  if (!before) return 'Sin dato del período anterior';
  const p = Math.round(((now - before) / Math.abs(before)) * 100);
  return (p > 0 ? '+' : '') + p + '% vs. período anterior';
};

interface Chip {
  label: string;
  bg: string;
  fg: string;
  bd: string;
  pick: () => void;
}

const chipStyle = (active: boolean, tone?: 'amber') => {
  if (!active) return { bg: COLORS.paper, fg: '#5f5a51', bd: '#e6ded0' };
  if (tone === 'amber') return { bg: COLORS.amber, fg: COLORS.ink, bd: COLORS.amber };
  return { bg: COLORS.ink, fg: COLORS.paper, bd: COLORS.ink };
};

interface Alerta {
  car: Car;
  kind: 'Service' | 'Seguro' | 'Taller';
  sev: number;
  text: string;
}

function buildAlerts(active: Car[]): Alerta[] {
  const list: Alerta[] = [];
  active.forEach((c) => {
    const dLeft = svcDaysLeft(c);
    if (dLeft <= SVC_AVISO_DIAS) {
      list.push({ car: c, kind: 'Service', sev: dLeft < 0 ? 2 : 1, text: 'Service ' + (dLeft < 0 ? 'vencido hace ' + durLbl(dLeft) : dLeft === 0 ? 'vence hoy' : 'vence en ' + durLbl(dLeft)) });
    }
    const segLeft = daysBetween(TODAY, c.seguroDate);
    if (segLeft <= SEG_AVISO_DIAS) {
      list.push({ car: c, kind: 'Seguro', sev: segLeft < 0 ? 2 : 1, text: 'Seguro ' + (segLeft < 0 ? 'vencido hace ' + durLbl(segLeft) : segLeft === 0 ? 'vence hoy' : 'vence en ' + durLbl(segLeft)) });
    }
    if (c.estado === 'taller') list.push({ car: c, kind: 'Taller', sev: 1, text: 'En taller, sin generar cuota' });
  });
  list.sort((a, b) => b.sev - a.sev);
  return list;
}

const TAG: Record<Car['estado'], [string, string, string]> = {
  activo: ['Activo', '#e7f2ec', '#256b4d'],
  taller: ['En taller', '#fdf0dd', '#9a6a12'],
  baja: ['Baja', '#f0ece3', '#6b665c'],
};

export function blankRegistrarForm(tab: RegistrarTab, carId: string, driver: string): import('./types').RegistrarForm {
  return { tab, carId, digits: '', fecha: isoLocal(TODAY), nota: '', driver, tipo: 'pago', cat: CATS[0], comprobante: null, guardando: false };
}

export function initialMobileState(): MobileState {
  return {
    screen: 'dashboard',
    backTo: 'dashboard',
    carId: null,
    period: 'mes',
    cFrom: '2026-08-01',
    cTo: isoLocal(TODAY),
    periodSheet: false,
    estadoSheet: false,
    choferSheet: false,
    choferForm: { name: '', cuota: '' },
    nuevoVehiculo: { plate: '', model: '', year: '2018' },
    registrar: null,
    q: '',
    shortcut: '',
    recents: [],
    toast: '',
    fleetFilter: 'todos',
    rankBy: 'auto',
  };
}

// --------------------------------------------------------------------------
// Vistas por pantalla

interface CarCardView {
  id: string;
  plate: string;
  model: string;
  driver: string;
  initials: string;
  estado: string;
  tagBg: string;
  tagFg: string;
  net: string;
  color: string;
  open: () => void;
}

interface AlertCardView {
  txt: string;
  sub: string;
  color: string;
  bg: string;
  bd: string;
  iconBg: string;
}

interface MovRowView {
  id: number;
  desc: string;
  sub: string;
  icon: string;
  iconBg: string;
  color: string;
  amt: string;
  showTag: boolean;
  tag: string;
  tagBg: string;
  tagFg: string;
}

interface DetalleView {
  car: Car;
  plate: string;
  model: string;
  year: number;
  driver: string;
  initials: string;
  estado: string;
  tagBg: string;
  tagFg: string;
  ing: string;
  egr: string;
  net: string;
  netColor: string;
  cuotaFmt: string;
  driverAction: string;
  driverTitle: string;
  alerts: AlertCardView[];
  hasAlerts: boolean;
  movs: MovRowView[];
  noMovs: boolean;
  movCount: string;
  goCobro: () => void;
  goGasto: () => void;
  openEstadoSheet: () => void;
  openChoferSheet: () => void;
}

interface SearchRow {
  desc: string;
  sub: string;
  amt: string;
  color: string;
  iconBg: string;
  icon: string;
  open: () => void;
}

interface RankRow {
  pos: string;
  posColor: string;
  name: string;
  sub: string;
  net: string;
  w: number;
  color: string;
  initials: string;
  open: () => void;
}

export interface MobileView {
  screen: Screen;
  isTab: boolean;
  isSub: boolean;
  isSearch: boolean;
  headerTitle: string;
  headerSub: string;
  back: () => void;

  navDash: () => void;
  navFlota: () => void;
  navRanking: () => void;
  navReportes: () => void;
  tabActive: { dash: boolean; flota: boolean; ranking: boolean; reportes: boolean };

  openSearch: () => void;
  goDetalle: (carId: string) => void;
  goNuevoVehiculo: () => void;
  goRegistrarCobro: (carId?: string) => void;
  goRegistrarGasto: (carId?: string) => void;

  hide: boolean;

  period: {
    label: string;
    short: string;
    days: string;
    chips: Chip[];
    cFrom: string;
    cTo: string;
    setFrom: (iso: string) => void;
    setTo: (iso: string) => void;
    open: boolean;
    openSheet: () => void;
    closeSheet: () => void;
  };

  dashboard: {
    heroNet: string;
    heroColor: string;
    deltaTxt: string;
    heroIng: string;
    heroEgr: string;
    egrBarW: number;
    linePoints: string;
    areaPoints: string;
    trendPts: { lbl: string; x: string; y: string }[];
    lastPt: { x: string; y: string };
    donut: { cat: string; color: string; dash: string; off: string; pctTxt: string }[];
    donutTotal: string;
    bars: { plate: string; w: number; color: string; short: string }[];
    health: string;
    healthLbl: string;
    healthSub: string;
  };

  flota: { filters: Chip[]; cars: CarCardView[] };

  detalle: DetalleView | null;

  nuevoVehiculo: {
    plate: string;
    model: string;
    year: string;
    setPlate: (v: string) => void;
    setModel: (v: string) => void;
    setYear: (v: string) => void;
    guardar: () => void;
  };

  registrar: {
    tab: RegistrarTab;
    setTab: (t: RegistrarTab) => void;
    amountDisplay: string;
    amountColor: string;
    amountHint: string;
    keys: { label: string; press: () => void }[];
    fecha: string;
    setFecha: (iso: string) => void;
    hoy: string;
    nota: string;
    setNota: (v: string) => void;
    notaPh: string;
    cta: { label: string; bg: string; fg: string };
    submit: () => void;
    guardando: boolean;
    cobro: {
      driver: string;
      setDriver: (v: string) => void;
      opciones: { id: string; label: string }[];
      tipoOpts: Chip[];
      destino: string;
    } | null;
    gasto: {
      catChips: Chip[];
      carId: string;
      setCarId: (v: string) => void;
      selCars: { id: string; label: string }[];
      lockCar: boolean;
      comprobante: File | null;
      setComprobante: (f: File | null) => void;
    } | null;
  } | null;

  reportes: {
    net: string;
    netColor: string;
    ing: string;
    egr: string;
    nMovs: number;
    cats: { cat: string; w: number; color: string; short: string }[];
    exportXls: () => void;
    exportPdf: () => void;
  };

  ranking: { rows: RankRow[]; byAuto: boolean; setAuto: () => void; setModelo: () => void; hint: string };

  search: {
    q: string;
    setQ: (v: string) => void;
    clearQ: () => void;
    emptyState: boolean;
    shortcuts: Chip[];
    hasShortcut: boolean;
    shortcutTitle: string;
    shortcutRows: SearchRow[];
    shortcutEmpty: boolean;
    resCars: SearchRow[];
    hasResCars: boolean;
    resDrivers: SearchRow[];
    hasResDrivers: boolean;
    resMovs: SearchRow[];
    hasResMovs: boolean;
    noResults: boolean;
    noResTxt: string;
    recents: { label: string; pick: () => void }[];
    hasRecents: boolean;
  };

  estadoSheet: {
    open: boolean;
    close: () => void;
    opts: { label: string; sub: string; bg: string; fg: string; subFg: string; bd: string; pick: () => void }[];
  };

  choferSheet: {
    open: boolean;
    close: () => void;
    title: string;
    name: string;
    setName: (v: string) => void;
    cuota: string;
    setCuota: (v: string) => void;
    guardar: () => void;
    hasDriver: boolean;
    desvincular: () => void;
  };

  toast: string;
}

export function useMobileView(
  cars: Car[],
  movs: Mov[],
  pagos: Pago[],
  state: MobileState,
  update: (patch: Partial<MobileState> | ((s: MobileState) => Partial<MobileState>)) => void,
  persist: Pick<FleetStore, 'patchCar' | 'addCar' | 'addPago' | 'addEgreso'>,
): MobileView {
  const toast = (msg: string) => update({ toast: msg });
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => update({ toast: '' }), 2600);
    return () => clearTimeout(t);
  }, [state.toast]);

  // ---- navegación + historial del navegador ------------------------------
  // Sin esto, el botón físico de "atrás" en Android (o el swipe de iOS) sale
  // de la página en vez de volver a la pantalla anterior. Los sheets no se
  // integran con el historial a propósito: solo se cierran con la X o tocando
  // afuera, para no complicar la pila con entradas que no son pantallas.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state as { screen: Screen; backTo: Screen; carId: string | null } | null;
      update(s ? { screen: s.screen, backTo: s.backTo, carId: s.carId } : { screen: 'dashboard', backTo: 'dashboard', carId: null });
    };
    window.addEventListener('popstate', onPop);
    history.replaceState({ screen: state.screen, backTo: state.backTo, carId: state.carId }, '');
    return () => window.removeEventListener('popstate', onPop);
    // eslint: solo corre al montar — el resto de la sincronización pasa por push/pop, no por este efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (screen: Screen, patch: Partial<MobileState> = {}) => {
    const backTo = state.screen;
    update({ screen, backTo, ...patch });
    history.pushState({ screen, backTo, carId: patch.carId ?? state.carId }, '');
  };
  const replaceTab = (screen: Screen) => {
    update({ screen, backTo: screen, carId: null });
    history.replaceState({ screen, backTo: screen, carId: null }, '');
  };
  const back = () => history.back();

  const active = cars.filter((c) => c.estado !== 'baja');
  const carDe = new Map(cars.map((c) => [c.id, c]));
  const cuotas = movs.filter((m) => m.type === 'ingreso');
  const choferDeCuota = (m: Mov) => {
    const c = carDe.get(m.carId);
    return c ? paidBy(m, c) : (m.driver ?? 'Sin chofer');
  };
  const { aplicaciones, cobrado } = imputar(cuotas, pagos, choferDeCuota);
  const cobradoDe = (m: Mov) => cobrado.get(m.id) ?? 0;
  const deudaDe = (m: Mov) => m.amount - cobradoDe(m);

  const r = range(state.period, state.cFrom, state.cTo);
  const days = Math.max(1, Math.round((+iniDia(r.end) - +iniDia(r.start)) / 864e5) + 1);
  const prevEnd = finDia(addD(r.start, -1));
  const prevStart = iniDia(addD(prevEnd, -(days - 1)));
  const inR = (m: Mov) => m.date >= r.start && m.date <= r.end;
  const inPrev = (m: Mov) => m.date >= prevStart && m.date <= prevEnd;
  const inRA = (a: Aplicacion) => a.fecha >= r.start && a.fecha <= r.end;
  const inPrevA = (a: Aplicacion) => a.fecha >= prevStart && a.fecha <= prevEnd;

  const tot = stats(movs, aplicaciones, inR, inRA);
  const prev = stats(movs, aplicaciones, inPrev, inPrevA);

  const alerts = buildAlerts(active);
  const alertsByCar = new Map<string, Alerta[]>();
  alerts.forEach((a) => {
    const arr = alertsByCar.get(a.car.id) ?? [];
    arr.push(a);
    alertsByCar.set(a.car.id, arr);
  });

  const perCarNet = (c: Car) => stats(movs, aplicaciones, (m) => m.carId === c.id && inR(m), (a) => a.carId === c.id && inRA(a)).net;
  const sorted = active.map((c) => ({ c, n: perCarNet(c) })).sort((a, b) => b.n - a.n);
  const maxAbs = Math.max(...sorted.map((x) => Math.abs(x.n)), 1);

  const deudaPorChofer = new Map<string, number>();
  cuotas.forEach((m) => {
    const falta = deudaDe(m);
    if (falta <= 0) return;
    const d = choferDeCuota(m);
    if (d === 'Sin chofer') return;
    deudaPorChofer.set(d, (deudaPorChofer.get(d) ?? 0) + falta);
  });

  const car = state.carId ? cars.find((c) => c.id === state.carId) : undefined;

  // ---- period sheet --------------------------------------------------------
  const periodOpts: [MobileState['period'], string][] = [
    ['semana', '7 días'],
    ['mes', 'Agosto'],
    ['jul', 'Julio'],
    ['d90', '90 días'],
    ['custom', 'Rango'],
  ];

  // ---- dashboard -------------------------------------------------------
  const donutCats = CATS.map((cat) => ({ cat, v: tot.byCat[cat] || 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  let acc = 0;
  const donut = donutCats.map((x) => {
    const pct = (x.v / (tot.egr || 1)) * 100;
    const seg = { cat: x.cat, color: CATCOLORS[x.cat], dash: pct.toFixed(2) + ' ' + (100 - pct).toFixed(2), off: String(-acc.toFixed(2)), pctTxt: Math.round(pct) + '%' };
    acc += pct;
    return seg;
  });
  const bars = sorted.slice(0, 7).map((x) => ({ plate: x.c.plate, w: Math.max(4, Math.round((Math.abs(x.n) / maxAbs) * 100)), color: statusColor(x.n, UMBRAL_VERDE), short: fmtShort(x.n) }));

  const baseMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const monthNets: number[] = [];
  const monthLbls: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = addM(baseMonth, -i);
    const y = d.getFullYear();
    const mo = d.getMonth();
    const fm = (m: Mov) => m.date.getFullYear() === y && m.date.getMonth() === mo;
    const fa = (a: Aplicacion) => a.fecha.getFullYear() === y && a.fecha.getMonth() === mo;
    monthNets.push(stats(movs, aplicaciones, fm, fa).net);
    monthLbls.push(MESES_ABR[mo][0].toUpperCase() + MESES_ABR[mo].slice(1));
  }
  const tMin = Math.min(...monthNets);
  const tMax = Math.max(...monthNets);
  const X = (i: number) => 8 + i * (324 / 5);
  const Y = (v: number) => 86 - ((v - tMin) / (tMax - tMin || 1)) * 76;
  const trendPts = monthLbls.map((lbl, i) => ({ lbl, x: X(i).toFixed(1), y: Y(monthNets[i]).toFixed(1) }));
  const linePoints = trendPts.map((p) => p.x + ',' + p.y).join(' ');
  const areaPoints = linePoints + ' ' + X(5).toFixed(1) + ',94 8,94';

  const nAlertCars = alertsByCar.size;
  const nLossCars = sorted.filter((x) => x.n <= 0).length;
  const health = Math.max(20, 100 - nAlertCars * 4 - nLossCars * 9);
  const healthLbl = health >= 80 ? 'Buena' : health >= 60 ? 'Atención' : 'Crítica';

  // ---- flota -------------------------------------------------------
  const fleetFiltered = cars.filter((c) => {
    if (state.fleetFilter === 'todos') return true;
    if (state.fleetFilter === 'alerta') return alertsByCar.has(c.id);
    return c.estado === state.fleetFilter;
  });
  const flotaCars: CarCardView[] = fleetFiltered.map((c) => {
    const n = perCarNet(c);
    const col = c.estado === 'baja' ? '#6b665c' : statusColor(n, UMBRAL_VERDE);
    return {
      id: c.id,
      plate: c.plate,
      model: c.model,
      driver: c.driver,
      initials: initials(c.driver),
      estado: TAG[c.estado][0],
      tagBg: TAG[c.estado][1],
      tagFg: TAG[c.estado][2],
      net: fmtShort(n),
      color: col,
      open: () => push('detalle', { carId: c.id }),
    };
  });
  const FILT: [FleetFilter, string][] = [
    ['todos', 'Todos'],
    ['activo', 'Activos'],
    ['taller', 'En taller'],
    ['alerta', 'Con alerta'],
  ];

  // ---- detalle -------------------------------------------------------
  let detalle: DetalleView | null = null;
  if (car) {
    const cs = stats(movs, aplicaciones, (m) => m.carId === car.id && inR(m), (a) => a.carId === car.id && inRA(a));
    const carAlerts = alertsByCar.get(car.id) ?? [];
    const carMovs = movs.filter((m) => m.carId === car.id).sort((a, b) => +b.date - +a.date);
    const timeline: MovRowView[] = carMovs.slice(0, 40).map((m) => {
      const isIng = m.type === 'ingreso';
      const deuda = isIng ? deudaDe(m) : 0;
      const cobradoM = isIng ? cobradoDe(m) : 0;
      const showTag = isIng && deuda > 0;
      const tag = showTag ? (cobradoM > 0 ? 'Parcial' : 'Pendiente') : '';
      const tagColors = tag === 'Parcial' ? ['#fdf0dd', '#9a6a12'] : ['#fdeeea', '#a8412f'];
      return {
        id: m.id,
        desc: m.desc,
        sub: dLbl(m.date) + ' · ' + (isIng ? paidBy(m, car) : (m.cat ?? '') + (m.comprobante ? ' · comprobante' : '')),
        icon: isIng ? '↓' : '↑',
        iconBg: isIng ? '#e7f2ec' : '#fdeeea',
        amt: (isIng ? '+' : '−') + fmtShort(isIng ? cobradoM : m.amount).replace('−', ''),
        color: isIng ? COLORS.pos : COLORS.neg,
        showTag,
        tag,
        tagBg: tagColors[0],
        tagFg: tagColors[1],
      };
    });
    detalle = {
      car,
      plate: car.plate,
      model: car.model,
      year: car.year,
      driver: car.driver,
      initials: initials(car.driver),
      estado: TAG[car.estado][0],
      tagBg: TAG[car.estado][1],
      tagFg: TAG[car.estado][2],
      ing: fmtShort(cs.ing),
      egr: fmtShort(cs.egr),
      net: fmtShort(cs.net),
      netColor: cs.ing === 0 && cs.egr === 0 ? '#6b665c' : statusColor(cs.net, UMBRAL_VERDE),
      cuotaFmt: car.cuota ? fmt(car.cuota) : '—',
      driverAction: car.driver === 'Sin chofer' ? 'Asignar' : 'Cambiar',
      driverTitle: car.driver === 'Sin chofer' ? 'Asignar chofer' : 'Chofer de ' + car.plate,
      alerts: carAlerts.map((a) => ({
        txt: a.text,
        sub: a.kind,
        color: a.sev === 2 ? COLORS.neg : COLORS.warn,
        bg: a.sev === 2 ? '#fdeeea' : '#fdf6e8',
        bd: a.sev === 2 ? '#f4d9d2' : '#f2e4c6',
        iconBg: a.sev === 2 ? '#fbe1da' : '#f9ead0',
      })),
      hasAlerts: carAlerts.length > 0,
      movs: timeline,
      noMovs: carMovs.length === 0,
      movCount: carMovs.length + ' en total',
      goCobro: () => goRegistrar('cobro', car.id),
      goGasto: () => goRegistrar('gasto', car.id),
      openEstadoSheet: () => update({ estadoSheet: true }),
      openChoferSheet: () => update({ choferSheet: true, choferForm: { name: car.driver === 'Sin chofer' ? '' : car.driver, cuota: car.cuota ? String(car.cuota) : '' } }),
    };
  }

  // ---- registrar -------------------------------------------------------
  const f = state.registrar;
  function goRegistrar(tab: RegistrarTab, carId?: string) {
    const resolvedCar = carId ?? car?.id ?? active[0]?.id ?? '';
    const driver = carDe.get(resolvedCar)?.driver ?? '';
    push('registrar', { registrar: blankRegistrarForm(tab, resolvedCar, driver === 'Sin chofer' ? '' : driver) });
  }
  const goRegistrarCobro = (carId?: string) => goRegistrar('cobro', carId);
  const goRegistrarGasto = (carId?: string) => goRegistrar('gasto', carId);

  let registrarView: MobileView['registrar'] = null;
  if (f) {
    const setF = (patch: Partial<typeof f>) => update((s) => ({ registrar: s.registrar && { ...s.registrar, ...patch } }));
    const amountNum = parseInt(f.digits || '0', 10);
    const press = (k: string) =>
      setF({
        digits: k === 'del' ? f.digits.slice(0, -1) : k === '000' ? (f.digits ? (f.digits + '000').slice(0, 10) : f.digits) : f.digits.length < 10 ? (f.digits === '' && k === '0' ? '' : f.digits + k) : f.digits,
      });
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => ({ label: k === 'del' ? '⌫' : k, press: () => press(k) }));

    let cobro: NonNullable<MobileView['registrar']>['cobro'] = null;
    if (f.tab === 'cobro') {
      const nombres = [...new Set([...deudaPorChofer.keys(), ...cars.filter((c) => c.driver !== 'Sin chofer').map((c) => c.driver)])].sort(
        (a, b) => (deudaPorChofer.get(b) ?? 0) - (deudaPorChofer.get(a) ?? 0) || a.localeCompare(b),
      );
      const debe = deudaPorChofer.get(f.driver) ?? 0;
      cobro = {
        driver: f.driver,
        setDriver: (v) => setF({ driver: v }),
        opciones: nombres.map((n) => ({ id: n, label: n + (deudaPorChofer.get(n) ? ' — debe ' + fmtShort(deudaPorChofer.get(n)!) : ' — al día') })),
        tipoOpts: (['pago', 'ajuste'] as const).map((k) => ({ label: k === 'pago' ? 'Pago' : 'Ajuste', ...chipStyle(f.tipo === k), pick: () => setF({ tipo: k }) })),
        destino: !f.driver
          ? 'Elegí un chofer para ver a qué se imputa'
          : !amountNum
            ? debe
              ? 'Debe ' + fmt(debe) + ' · se cancela de lo más viejo primero'
              : 'No debe nada · lo que cargues queda a favor'
            : amountNum >= debe
              ? (debe ? 'Cancela los ' + fmt(debe) + ' que debe' : 'No debe nada') + (amountNum > debe ? ' · quedan ' + fmt(amountNum - debe) + ' a favor' : ' y queda al día')
              : 'Cancela ' + fmt(amountNum) + ' de los ' + fmt(debe) + ' que debe · le quedan ' + fmt(debe - amountNum),
      };
    }

    let gasto: NonNullable<MobileView['registrar']>['gasto'] = null;
    if (f.tab === 'gasto') {
      gasto = {
        catChips: CATS.map((name) => ({ label: name, ...chipStyle(f.cat === name, 'amber'), pick: () => setF({ cat: name }) })),
        carId: f.carId,
        setCarId: (v) => setF({ carId: v }),
        selCars: active.map((c) => ({ id: c.id, label: c.plate + ' · ' + c.driver })),
        lockCar: !!car,
        comprobante: f.comprobante,
        setComprobante: (file) => setF({ comprobante: file }),
      };
    }

    const submit = () => {
      if (f.guardando) return;
      if (!amountNum) return toast(f.tab === 'cobro' ? 'Ingresá cuánto pagó' : 'Indicá cuánto se gastó');
      if (f.fecha > isoLocal(TODAY)) return toast('La fecha no puede ser futura');
      if (f.tab === 'cobro') {
        if (!f.driver) return toast('Elegí de qué chofer es el pago');
        setF({ guardando: true });
        persist
          .addPago({ driver: f.driver, carId: cars.find((c) => c.driver === f.driver)?.id ?? null, fecha: f.fecha, monto: amountNum, tipo: f.tipo, nota: f.nota.trim() || undefined })
          .then(() => {
            toast((f.tipo === 'ajuste' ? 'Ajuste registrado · ' : 'Pago registrado · ') + f.driver + ' · ' + fmt(amountNum));
            back();
          })
          .catch((e: Error) => {
            setF({ guardando: false });
            toast('No se pudo registrar: ' + e.message);
          });
      } else {
        if (!f.carId) return toast('Elegí a qué auto corresponde');
        if (!f.nota.trim()) return toast('Contá de qué es el gasto');
        setF({ guardando: true });
        const plate = carDe.get(f.carId)?.plate ?? '';
        persist
          .addEgreso(f.carId, { razon: f.nota.trim(), monto: amountNum, cat: f.cat, comprobante: f.comprobante })
          .then(() => {
            toast('Gasto registrado · ' + plate + ' · ' + fmt(amountNum));
            back();
          })
          .catch((e: Error) => {
            setF({ guardando: false });
            toast('No se pudo registrar: ' + e.message);
          });
      }
    };

    registrarView = {
      tab: f.tab,
      setTab: (t) => setF({ tab: t }),
      amountDisplay: amountNum ? fmt(amountNum) : '₲ 0',
      amountColor: amountNum ? (f.tab === 'cobro' ? COLORS.pos : COLORS.neg) : '#b3aa99',
      amountHint: amountNum ? (f.tab === 'cobro' ? 'Cobro al chofer' : 'Gasto del auto') : 'Usá el teclado para escribir el monto',
      keys,
      fecha: f.fecha,
      setFecha: (iso) => setF({ fecha: iso }),
      hoy: isoLocal(TODAY),
      nota: f.nota,
      setNota: (v) => setF({ nota: v }),
      notaPh: f.tab === 'cobro' ? 'Opcional' : 'De qué es el gasto',
      cta: { label: f.tab === 'cobro' ? 'Registrar cobro' : 'Registrar gasto', bg: amountNum ? COLORS.ink : '#e2dbcc', fg: amountNum ? COLORS.paper : '#6b665c' },
      submit,
      guardando: f.guardando,
      cobro,
      gasto,
    };
  }

  // ---- reportes -------------------------------------------------------
  const repMax = Math.max(...CATS.map((c) => tot.byCat[c] || 0), 1);
  const exportXls = () => {
    import('xlsx')
      .then((XLSX) => {
        const rows = movs.filter(inR).map((m) => [dLbl(m.date), m.type === 'ingreso' ? 'Cobro' : 'Gasto', m.desc, m.cat ?? '—', m.amount]);
        const ws = XLSX.utils.aoa_to_sheet([['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto'], ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
        XLSX.writeFile(wb, 'movimientos-' + isoLocal(TODAY) + '.xlsx');
      })
      .catch(() => toast('No se pudo generar la planilla'));
  };
  const exportPdf = () => toast('Función en camino');

  // ---- ranking -------------------------------------------------------
  let rankRows: RankRow[];
  if (state.rankBy === 'modelo') {
    const byModel = new Map<string, { model: string; n: number; count: number }>();
    active.forEach((c) => {
      const g = byModel.get(c.model) ?? { model: c.model, n: 0, count: 0 };
      g.n += perCarNet(c);
      g.count++;
      byModel.set(c.model, g);
    });
    const groups = [...byModel.values()].sort((a, b) => b.n / b.count - a.n / a.count);
    const gMax = Math.max(...groups.map((g) => Math.abs(g.n / g.count)), 1);
    rankRows = groups.map((g, i) => {
      const avg = g.n / g.count;
      return {
        pos: String(i + 1),
        posColor: i < 3 ? COLORS.ink : '#6b665c',
        name: g.model,
        sub: g.count + (g.count === 1 ? ' auto · prom. ' : ' autos · prom. ') + fmtShort(avg),
        net: fmtShort(g.n),
        w: Math.max(4, Math.round((Math.abs(avg) / gMax) * 100)),
        color: statusColor(avg, UMBRAL_VERDE),
        initials: initials(g.model),
        open: () => {},
      };
    });
  } else {
    rankRows = sorted.map((x, i) => ({
      pos: String(i + 1),
      posColor: i < 3 ? COLORS.ink : '#6b665c',
      name: x.c.plate,
      sub: x.c.driver,
      net: fmtShort(x.n),
      w: Math.max(4, Math.round((Math.abs(x.n) / maxAbs) * 100)),
      color: statusColor(x.n, UMBRAL_VERDE),
      initials: initials(x.c.driver),
      open: () => push('detalle', { carId: x.c.id }),
    }));
  }

  // ---- search -------------------------------------------------------
  const qTrim = state.q.trim();
  const qLower = qTrim.toLowerCase();
  const resCarsRaw = qTrim ? cars.filter((c) => (c.plate + ' ' + c.model).toLowerCase().includes(qLower)) : [];
  const resDriversRaw = qTrim ? cars.filter((c) => c.driver !== 'Sin chofer' && c.driver.toLowerCase().includes(qLower)) : [];
  const resMovsRaw = qTrim
    ? movs
        .filter((m) => matches(state.q, m.desc, m.cat, carDe.get(m.carId)?.plate))
        .sort((a, b) => +b.date - +a.date)
        .slice(0, 12)
    : [];
  const resCars: SearchRow[] = resCarsRaw.map((c) => {
    const n = perCarNet(c);
    return {
      desc: c.plate,
      sub: c.model + ' ' + c.year + ' · ' + c.driver,
      amt: fmtShort(n),
      color: c.estado === 'baja' ? '#6b665c' : statusColor(n, UMBRAL_VERDE),
      iconBg: '#f4f0e8',
      icon: initials(c.driver),
      open: () => push('detalle', { carId: c.id }),
    };
  });
  const resDrivers: SearchRow[] = resDriversRaw.map((c) => {
    const debe = deudaPorChofer.get(c.driver) ?? 0;
    return {
      desc: c.driver,
      sub: c.plate + ' · ' + (debe ? 'debe ' + fmtShort(debe) : 'al día'),
      amt: debe ? fmtShort(debe) : fmtShort(perCarNet(c)),
      color: debe ? COLORS.warn : COLORS.pos,
      iconBg: '#f4f0e8',
      icon: initials(c.driver),
      open: () => push('detalle', { carId: c.id }),
    };
  });
  const resMovs: SearchRow[] = resMovsRaw.map((m) => {
    const c = carDe.get(m.carId);
    const isIng = m.type === 'ingreso';
    return {
      desc: m.desc,
      sub: dLbl(m.date) + ' · ' + (c?.plate ?? '') + ' · ' + (isIng ? 'cobro' : m.cat),
      amt: (isIng ? '+' : '−') + fmtShort(m.amount).replace('−', ''),
      color: isIng ? COLORS.pos : COLORS.neg,
      iconBg: isIng ? '#e7f2ec' : '#fdeeea',
      icon: isIng ? '↓' : '↑',
      open: () => push('detalle', { carId: m.carId }),
    };
  });

  function shortcutRows(kind: string): SearchRow[] {
    if (kind === 'pendientes') {
      return cuotas
        .filter((m) => deudaDe(m) > 0 && inR(m))
        .sort((a, b) => +b.date - +a.date)
        .slice(0, 20)
        .map((m) => {
          const c = carDe.get(m.carId)!;
          return {
            desc: c.plate + ' · ' + paidBy(m, c),
            sub: dLbl(m.date) + ' · debe ' + fmtShort(deudaDe(m)),
            amt: fmtShort(deudaDe(m)),
            color: COLORS.warn,
            iconBg: '#fdf0dd',
            icon: '!',
            open: () => push('detalle', { carId: c.id }),
          };
        });
    }
    if (kind === 'perdida') {
      return sorted
        .filter((x) => x.n <= 0)
        .map((x) => ({ desc: x.c.plate + ' · ' + x.c.driver, sub: x.c.model + ' ' + x.c.year, amt: fmtShort(x.n), color: COLORS.neg, iconBg: '#fdeeea', icon: '↓', open: () => push('detalle', { carId: x.c.id }) }));
    }
    return active
      .filter((c) => svcDaysLeft(c) <= SVC_AVISO_DIAS)
      .sort((a, b) => svcDaysLeft(a) - svcDaysLeft(b))
      .map((c) => {
        const d = svcDaysLeft(c);
        return {
          desc: c.plate + ' · ' + c.model,
          sub: d <= 0 ? 'vencido hace ' + durLbl(d) : 'en ' + durLbl(d),
          amt: '',
          color: d <= 0 ? COLORS.neg : COLORS.warn,
          iconBg: '#fdf0dd',
          icon: '⚙',
          open: () => push('detalle', { carId: c.id }),
        };
      });
  }

  // ---- sheets -------------------------------------------------------
  const estadoOpts: [Car['estado'], string, string][] = [
    ['activo', 'Activo', 'En circulación, generando cuota'],
    ['taller', 'En taller', 'Fuera de servicio temporalmente'],
    ['baja', 'Baja', 'Fuera de la flota, no entra en los cálculos'],
  ];

  const headerByScreen: Record<Screen, [string, string]> = {
    dashboard: ['MiFlota', 'Actualizado · ' + r.label],
    flota: ['Vehículos', active.length + ' activos · ' + (cars.length - active.length) + ' de baja'],
    ranking: ['Rentabilidad', 'De más a menos rentable'],
    reportes: ['Reportes', 'Exportá para tu contador'],
    detalle: ['Detalle del vehículo', ''],
    nuevoVehiculo: ['Nuevo vehículo', ''],
    registrar: [f?.tab === 'gasto' ? 'Registrar gasto' : 'Registrar cobro', ''],
    search: ['Buscar', ''],
  };

  const isTab = ['dashboard', 'flota', 'ranking', 'reportes'].includes(state.screen);
  const isSub = ['detalle', 'nuevoVehiculo', 'registrar'].includes(state.screen);
  const isSearch = state.screen === 'search';

  return {
    screen: state.screen,
    isTab,
    isSub,
    isSearch,
    headerTitle: headerByScreen[state.screen][0],
    headerSub: headerByScreen[state.screen][1],
    back,
    navDash: () => replaceTab('dashboard'),
    navFlota: () => replaceTab('flota'),
    navRanking: () => replaceTab('ranking'),
    navReportes: () => replaceTab('reportes'),
    tabActive: { dash: state.screen === 'dashboard', flota: state.screen === 'flota' || state.screen === 'detalle', ranking: state.screen === 'ranking', reportes: state.screen === 'reportes' },
    openSearch: () => push('search'),
    goDetalle: (carId) => push('detalle', { carId }),
    goNuevoVehiculo: () => push('nuevoVehiculo', { carId: null, nuevoVehiculo: { plate: '', model: '', year: '2018' } }),
    goRegistrarCobro,
    goRegistrarGasto,
    hide: false,

    period: {
      label: r.label,
      short: r.short,
      days: days + ' d',
      chips: periodOpts.map(([k, label]) => ({ label, ...chipStyle(state.period === k), pick: () => update({ period: k }) })),
      cFrom: state.cFrom,
      cTo: state.cTo,
      setFrom: (iso) => update({ cFrom: iso, period: 'custom' }),
      setTo: (iso) => update({ cTo: iso, period: 'custom' }),
      open: state.periodSheet,
      openSheet: () => update({ periodSheet: true }),
      closeSheet: () => update({ periodSheet: false }),
    },

    dashboard: {
      heroNet: fmt(tot.net),
      heroColor: tot.net >= 0 ? COLORS.ink : COLORS.neg,
      deltaTxt: delta(tot.net, prev.net),
      heroIng: fmt(tot.ing),
      heroEgr: fmt(tot.egr),
      egrBarW: Math.min(100, Math.round((tot.egr / (tot.ing || 1)) * 100)),
      linePoints,
      areaPoints,
      trendPts,
      lastPt: trendPts[5],
      donut,
      donutTotal: fmtShort(tot.egr),
      bars,
      health: String(health),
      healthLbl,
      healthSub: nAlertCars + ' autos con mantenimiento pendiente · ' + nLossCars + ' en pérdida',
    },

    flota: { filters: FILT.map(([k, label]) => ({ label, ...chipStyle(state.fleetFilter === k), pick: () => update({ fleetFilter: k }) })), cars: flotaCars },

    detalle,

    nuevoVehiculo: {
      plate: state.nuevoVehiculo.plate,
      model: state.nuevoVehiculo.model,
      year: state.nuevoVehiculo.year,
      setPlate: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, plate: v } })),
      setModel: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, model: v } })),
      setYear: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, year: v } })),
      guardar: () => {
        const n = state.nuevoVehiculo;
        const plate = n.plate.trim().toUpperCase();
        if (!plate) return toast('Ingresá la chapa del vehículo');
        if (!n.model.trim()) return toast('Ingresá la marca y el modelo');
        if (cars.some((c) => c.plate.toUpperCase() === plate)) return toast('Esa chapa ya está en la flota');
        persist
          .addCar({ plate, model: n.model.trim(), year: numFromInput(n.year) || 2018 })
          .then((creado) => {
            toast('Vehículo agregado · ' + plate);
            push('detalle', { carId: creado.id, backTo: 'flota' });
          })
          .catch((e: Error) => toast('No se pudo agregar: ' + e.message));
      },
    },

    registrar: registrarView,

    reportes: {
      net: fmt(tot.net),
      netColor: tot.net >= 0 ? COLORS.ink : COLORS.neg,
      ing: fmtShort(tot.ing),
      egr: fmtShort(tot.egr),
      nMovs: movs.filter(inR).length,
      cats: CATS.map((c) => ({ cat: c, v: tot.byCat[c] || 0 }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .map((x) => ({ cat: x.cat, w: Math.max(4, Math.round((x.v / repMax) * 100)), color: CATCOLORS[x.cat], short: fmtShort(x.v) })),
      exportXls,
      exportPdf,
    },

    ranking: {
      rows: rankRows,
      byAuto: state.rankBy === 'auto',
      setAuto: () => update({ rankBy: 'auto' }),
      setModelo: () => update({ rankBy: 'modelo' }),
      hint: state.rankBy === 'auto' ? 'Neto por auto en el período' : 'Neto total y promedio por modelo',
    },

    search: {
      q: state.q,
      setQ: (v) => update({ q: v, shortcut: '' }),
      clearQ: () => update({ q: '', shortcut: '' }),
      emptyState: !qTrim && !state.shortcut,
      shortcuts: [
        ['pendientes', 'Pagos pendientes'],
        ['perdida', 'Autos en pérdida'],
        ['service', 'Service vencido o próximo'],
      ].map(([k, label]) => ({ label, ...chipStyle(state.shortcut === k), pick: () => update({ shortcut: k, q: '' }) })),
      hasShortcut: !!state.shortcut,
      shortcutTitle: state.shortcut === 'pendientes' ? 'Pagos pendientes · ' + r.label : state.shortcut === 'perdida' ? 'Autos en pérdida · ' + r.label : state.shortcut === 'service' ? 'Service vencido o próximo' : '',
      shortcutRows: state.shortcut ? shortcutRows(state.shortcut) : [],
      shortcutEmpty: !!state.shortcut && shortcutRows(state.shortcut).length === 0,
      resCars,
      hasResCars: resCars.length > 0,
      resDrivers,
      hasResDrivers: resDrivers.length > 0,
      resMovs,
      hasResMovs: resMovs.length > 0,
      noResults: !!qTrim && !resCars.length && !resDrivers.length && !resMovs.length,
      noResTxt: 'Sin resultados para "' + qTrim + '"',
      recents: state.recents.map((rec) => ({ label: rec, pick: () => update({ q: rec, shortcut: '' }) })),
      hasRecents: state.recents.length > 0,
    },

    estadoSheet: {
      open: state.estadoSheet,
      close: () => update({ estadoSheet: false }),
      opts: estadoOpts.map(([k, label, sub]) => {
        const on = car?.estado === k;
        return {
          label,
          sub,
          bg: on ? COLORS.ink : COLORS.paper,
          fg: on ? COLORS.paper : '#3d3a34',
          subFg: on ? '#bdb6a4' : '#6b665c',
          bd: on ? COLORS.ink : '#e6ded0',
          pick: () => {
            if (!car) return;
            persist.patchCar(car.id, { estado: k });
            update({ estadoSheet: false });
            toast('Estado actualizado · ' + label);
          },
        };
      }),
    },

    choferSheet: {
      open: state.choferSheet,
      close: () => update({ choferSheet: false }),
      title: car ? (car.driver === 'Sin chofer' ? 'Asignar chofer' : 'Chofer de ' + car.plate) : '',
      name: state.choferForm.name,
      setName: (v) => update((s) => ({ choferForm: { ...s.choferForm, name: v } })),
      cuota: state.choferForm.cuota,
      setCuota: (v) => update((s) => ({ choferForm: { ...s.choferForm, cuota: miles(v) } })),
      guardar: () => {
        if (!car) return;
        const name = state.choferForm.name.trim();
        if (!name) return toast('Ingresá el nombre del chofer');
        const cuota = numFromInput(state.choferForm.cuota);
        persist.patchCar(car.id, { driver: name, cuota: cuota || car.cuota });
        update({ choferSheet: false });
        toast('Chofer asignado · ' + name);
      },
      hasDriver: car?.driver !== 'Sin chofer',
      desvincular: () => {
        if (!car) return;
        persist.patchCar(car.id, { driver: 'Sin chofer', cuota: 0 });
        update({ choferSheet: false });
        toast('Chofer desvinculado');
      },
    },

    toast: state.toast,
  };
}
