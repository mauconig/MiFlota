import { useEffect, useRef } from 'react';
import { BackHandler, Keyboard, Linking } from 'react-native';
import type { AdminNotificationRoute, Car, Mov, Pago, MobileState, Screen, RegistrarTab, FleetFilter, PickedFile, CarLocation, ReportCategorySelection, ReportInclude, ReportSelection, ReportStep } from './types';
import { imputar, type Aplicacion } from './cobranza';
import { CATS, CATCOLORS } from './data';
import { COLORS, TODAY, addD, addM, daysBetween, durLbl, dLbl, dLblFull, fmt, fmtShort, initials, statusColor, numFromInput, miles, isoLocal } from './format';
import { getAuthHeaders, type FleetStore, type NuevoCarPayload } from './api';
import { API_BASE } from './config';

const UMBRAL_VERDE = 2500000;
const SVC_AVISO_DIAS = 15;
/** Tope de meses entre renovaciones de la póliza. Coincide con el del servidor. */
const SEG_CADA_MAX = 120;
const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const REG_CATS = CATS;

// --------------------------------------------------------------------------
// Helpers puros, portados de apps/admin-web/src/useFleetView.ts. Los datos
// nuevos usan la fecha local real del teléfono; las fechas de la demo sólo
// sirven para los registros sembrados en la base.

const svcConfigured = (c: Car) => c.serviceCada > 0 && c.lastServiceDate.getFullYear() > 1970;
const svcNextDate = (c: Car) => (c.serviceUnidad === 'meses' ? addM(c.lastServiceDate, c.serviceCada) : addD(c.lastServiceDate, c.serviceCada));
const svcDaysLeft = (c: Car) => daysBetween(TODAY, svcNextDate(c));
/** Una cuota es de quien manejaba el auto cuando se emitió, no de quien lo
 *  maneja hoy: si el auto cambió de chofer, los cobros viejos no cambian de dueño. */
const paidBy = (m: Mov, c: Car) => m.driver || c.driver;

/** Identidad estable del chofer: su `driverId` si lo tiene, o el nombre como
 *  fallback en datos previos a ese campo. Siempre string (los números viajan
 *  serializados en los selects), para que la clave del Map y la del formulario
 *  coincidan. Agrupa deuda e imputa pagos por chofer aunque cambie de vehículo. */
const claveChofer = (m: Mov, c?: Car): string => {
  const id = m.driverId != null ? m.driverId : c?.driverId != null ? c.driverId : null;
  return id != null ? String(id) : m.driver || c?.driver || 'Sin chofer';
};
const claveDeCar = (c: Car): string => (c.driverId != null ? String(c.driverId) : c.driver);

function stats(
  movs: Mov[],
  aplicaciones: Aplicacion[],
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
    if (m.type === 'ingreso') fact += m.amount;
    else {
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
    aplicaciones.forEach((a) => {
      if (a.tipo === 'pago' && fa(a)) ing += a.monto;
    });
  }
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
  kind: 'Service' | 'Seguro' | 'Taller' | 'Kilometraje';
  sev: number;
  text: string;
}

function buildAlerts(active: Car[]): Alerta[] {
  const list: Alerta[] = [];
  active.forEach((c) => {
    const dLeft = svcDaysLeft(c);
    if (svcConfigured(c) && dLeft <= SVC_AVISO_DIAS) {
      list.push({ car: c, kind: 'Service', sev: dLeft < 0 ? 2 : 1, text: 'Service ' + (dLeft < 0 ? 'vencido hace ' + durLbl(dLeft) : dLeft === 0 ? 'vence hoy' : 'vence en ' + durLbl(dLeft)) });
    }
    const segLeft = daysBetween(TODAY, c.seguroDate);
    if (c.seguroCada > 0 && c.seguroNombre.trim() && c.seguroDate.getFullYear() > 1970 && segLeft === 0) {
      list.push({ car: c, kind: 'Seguro', sev: 1, text: 'Seguro vence hoy' });
    }
    if (c.estado === 'taller') list.push({ car: c, kind: 'Taller', sev: 1, text: 'En taller, sin generar cuota' });
    const kmDays = c.kilometrajeActualizado ? daysBetween(new Date(c.kilometrajeActualizado + 'T12:00:00'), TODAY) : Number.POSITIVE_INFINITY;
    if (!c.kilometrajeActualizado || kmDays > 7) list.push({ car: c, kind: 'Kilometraje', sev: 1, text: c.kilometraje ? 'Kilometraje pendiente de actualizar' : 'Falta cargar el kilometraje' });
  });
  list.sort((a, b) => b.sev - a.sev);
  return list;
}

const TAG: Record<Car['estado'], [string, string, string]> = {
  activo: ['Activo', '#e7f2ec', '#256b4d'],
  taller: ['En taller', '#fdf0dd', '#9a6a12'],
  baja: ['Baja', '#f0ece3', '#6b665c'],
};

export function blankRegistrarForm(tab: RegistrarTab, carId: string, driver: string, lockCar = false, serviceMode = false): import('./types').RegistrarForm {
  return {
    tab,
    serviceMode,
    carId,
    digits: '',
    fecha: isoLocal(TODAY),
    nota: '',
    driver,
    tipo: 'pago',
    cat: '',
    comprobante: null,
    items: [{ nombre: '', cantidad: '1', costoUnitario: '' }],
    manoObra: '',
    step: lockCar ? 1 : 0,
    repuestos: null,
    otroItem: null,
    lockCar,
    guardando: false,
    success: null,
  };
}

function blankNuevoVehiculo(): import('./types').NuevoVehiculoForm {
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

function nuevoVehiculoDesdeCar(car: Car): import('./types').NuevoVehiculoForm {
  return {
    plate: car.plate,
    model: car.model,
    year: String(car.year),
    gpsTag: car.gpsTag,
    kilometraje: car.kilometraje ? String(car.kilometraje) : '',
    lastService: car.lastServiceDate.getFullYear() > 1970 ? isoLocal(car.lastServiceDate) : '',
    serviceCada: car.serviceCada ? String(car.serviceCada) : '',
    serviceUnidad: car.serviceUnidad,
    seguroVence: car.seguroDate.getFullYear() > 1970 ? isoLocal(car.seguroDate) : '',
    seguroNombre: car.seguroNombre,
    seguroCada: car.seguroCada ? String(car.seguroCada) : '',
  };
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
    movementDetailId: null,
    quotaDetailId: null,
    estadoSheet: false,
    tallerForm: null,
    kilometrajeSheet: null,
    choferSheet: false,
    choferForm: { name: '', cuota: '' },
    choferCredentials: null,
    choferCredentialsLoading: false,
    nuevoVehiculo: blankNuevoVehiculo(),
    nuevoVehiculoConfirm: false,
    nuevoVehiculoGuardando: false,
    registrar: null,
    registroChoice: false,
    gastosStep: 'vehicle',
    gastosCarIds: 'todos',
    gastosCat: 'todas',
    gastosExpanded: {},
    reportesStep: 'include',
    reportesInclude: null,
    reportesCarIds: 'todos',
    reportesCategories: 'todas',
    reportesExportando: false,
    reportesError: '',
    toast: '',
    fleetFilter: 'todos',
    rankBy: 'auto',
    perfil: { actual: '', nueva: '', repetir: '', guardando: false },
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
  id: string;
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
  onPress?: () => void;
}

export interface MovementDetailView {
  id: string;
  title: string;
  type: string;
  typeBg: string;
  typeFg: string;
  amount: string;
  amountColor: string;
  date: string;
  vehicle: string;
  driver: string;
  category: string;
  medio: string;
  note: string;
  comprobanteName: string;
  comprobante: { uri: string; name: string; type: string; headers?: Record<string, string> } | null;
  items: { nombre: string; cantidad: number; costoUnitario: string; subtotal: string }[];
  manoObra: string;
  close: () => void;
}

export interface QuotaPaymentView {
  id: number;
  title: string;
  date: string;
  applied: string;
  total: string;
  medio: string;
  note: string;
  onPress: () => void;
}

export interface QuotaDetailView {
  title: string;
  date: string;
  driver: string;
  amount: string;
  paid: string;
  remaining: string;
  status: string;
  statusBg: string;
  statusFg: string;
  payments: QuotaPaymentView[];
  close: () => void;
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
  edit: () => void;
  alerts: AlertCardView[];
  hasAlerts: boolean;
  movs: MovRowView[];
  noMovs: boolean;
  movCount: string;
  cuotas: MovRowView[];
  noCuotas: boolean;
  cuotaCount: string;
  goCobro: () => void;
  goGasto: () => void;
  openEstadoSheet: () => void;
  openChoferSheet: () => void;
  location: {
    age: string;
    stale: boolean;
    accuracy: number | null;
    mapsUrl: string;
  } | null;
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

interface GastoRowView {
  id: string;
  desc: string;
  cat: string;
  date: string;
  amount: string;
  repuestos: string;
  manoObra: string;
  items: { nombre: string; cantidad: string; costoUnitario: string; subtotal: string }[];
  expanded: boolean;
  toggle: () => void;
}

interface GastoGroupView {
  carId: string;
  plate: string;
  total: string;
  rows: GastoRowView[];
  expanded: boolean;
  toggle: () => void;
}

interface GastoChoiceView {
  id: string;
  label: string;
  sub: string;
  selected: boolean;
  pick: () => void;
}

interface ReportPreviewItem {
  nombre: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

interface ReportPreviewRow {
  id: string;
  tipo: 'Ingreso' | 'Gasto';
  fecha: string;
  vehiculo: string;
  chofer: string;
  categoria: string;
  detalle: string;
  monto: number;
  medio: string;
  nota: string;
  items: ReportPreviewItem[];
  manoObra: number;
}

interface AlertView {
  carId: string;
  plate: string;
  kind: string;
  text: string;
  sev: number;
  open: () => void;
}

interface ChoferView {
  key: string;
  name: string;
  initials: string;
  cars: string;
  carId: string;
  cuota: string;
  open: () => void;
}

export interface MobileView {
  screen: Screen;
  isTab: boolean;
  isSub: boolean;
  isAssistant: boolean;
  headerTitle: string;
  headerSub: string;
  back: () => void;

  navDash: () => void;
  navFlota: () => void;
  navGastos: () => void;
  navMas: () => void;
  navReportes: () => void;
  navAlertas: () => void;
  navChoferes: () => void;
  openNotification: (route: AdminNotificationRoute) => void;
  tabActive: { dash: boolean; flota: boolean; gastos: boolean; mas: boolean };
  registroChoice: { open: boolean; show: () => void; close: () => void; cobro: () => void; gasto: () => void; service: () => void };

  openAssistant: () => void;
  goDetalle: (carId: string) => void;
  goNuevoVehiculo: () => void;
  goRegistrarCobro: (carId?: string) => void;
  goRegistrarGasto: (carId?: string) => void;
  goRegistrarService: (carId?: string) => void;
  goPerfil: () => void;

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

  gastos: {
    step: 'vehicle' | 'category' | 'results';
    carOptions: GastoChoiceView[];
    categoryOptions: GastoChoiceView[];
    selectedCarLabel: string;
    selectedCategoryLabel: string;
    back: () => void;
    carFilters: Chip[];
    catFilters: Chip[];
    groups: GastoGroupView[];
    empty: boolean;
    vehicleSelectionValid: boolean;
    continueVehicles: () => void;
  };

  mas: { alertCount: number; driverCount: number; navAlertas: () => void; navChoferes: () => void; navReportes: () => void; goPerfil: () => void };
  alertas: { items: AlertView[] };
  choferes: { items: ChoferView[] };

  detalle: DetalleView | null;
  movementDetail: MovementDetailView | null;
  quotaDetail: QuotaDetailView | null;

  nuevoVehiculo: {
    editando: boolean;
    plate: string;
    model: string;
    year: string;
    gpsTag: string;
    kilometraje: string;
    setPlate: (v: string) => void;
    setModel: (v: string) => void;
    setYear: (v: string) => void;
    setGpsTag: (v: string) => void;
    setKilometraje: (v: string) => void;
    lastService: string;
    setLastService: (iso: string) => void;
    hoy: string;
    serviceCada: string;
    setServiceCada: (v: string) => void;
    unidadOpts: Chip[];
    seguroVence: string;
    setSeguroVence: (iso: string) => void;
    seguroNombre: string;
    setSeguroNombre: (v: string) => void;
    seguroCada: string;
    setSeguroCada: (v: string) => void;
    /** Palabra al lado de "Renovar cada": sigue al chip Mensual/Anual (solo la
     *  etiqueta — el valor guardado siempre son meses, ver `NuevoVehiculoForm`). */
    cadaUnitLabel: string;
    guardar: () => void;
    confirm: {
      open: boolean;
      resumen: { label: string; value: string }[];
      guardando: boolean;
      confirmar: () => void;
      cancelar: () => void;
    };
  };

  registrar: {
    tab: RegistrarTab;
    setTab: (t: RegistrarTab) => void;
    step: number;
    progressStep: number;
    totalSteps: number;
    stepTitle: string;
    stepHint: string;
    backStep: () => void;
    next: () => void;
    nextLabel: string;
    nextDisabled: boolean;
    success: import('./types').RegistrarSuccess | null;
    finish: () => void;
    again: () => void;
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
      carId: string;
      setCarId: (v: string) => void;
      selCars: { id: string; label: string }[];
      lockCar: boolean;
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
      comprobante: PickedFile | null;
      setComprobante: (f: PickedFile | null) => void;
      items: { nombre: string; cantidad: string; costoUnitario: string }[];
      setItem: (index: number, patch: Partial<{ nombre: string; cantidad: string; costoUnitario: string }>) => void;
      addItem: () => void;
      removeItem: (index: number) => void;
      manoObra: string;
      setManoObra: (v: string) => void;
    } | null;
    service: {
      carId: string;
      setCarId: (v: string) => void;
      selCars: { id: string; label: string }[];
      lockCar: boolean;
      kilometraje: string;
      setKilometraje: (v: string) => void;
      tieneCosto: boolean;
      comprobante: PickedFile | null;
      setComprobante: (f: PickedFile | null) => void;
    } | null;
  } | null;

  reportes: {
    step: ReportStep;
    include: ReportInclude | null;
    setInclude: (value: ReportInclude) => void;
    carSelection: ReportSelection;
    carOptions: { id: string; label: string; sub: string; selected: boolean; toggle: () => void }[];
    selectAllCars: () => void;
    categorySelection: ReportCategorySelection;
    categoryOptions: { label: string; selected: boolean; toggle: () => void }[];
    selectAllCategories: () => void;
    selectedCarLabels: string[];
    selectedCategoryLabels: string[];
    previewRows: ReportPreviewRow[];
    next: () => void;
    previous: () => void;
    reset: () => void;
    periodLabel: string;
    counts: { ingresos: number; gastos: number; total: number };
    exporting: boolean;
    error: string;
    exportFile: (format: 'pdf' | 'xlsx') => void;
  };

  ranking: { rows: RankRow[]; byAuto: boolean; setAuto: () => void; setModelo: () => void; hint: string };

  estadoSheet: {
    open: boolean;
    close: () => void;
    opts: { label: string; sub: string; bg: string; fg: string; subFg: string; bd: string; pick: () => void }[];
    taller: {
      plate: string;
      razon: string;
      setRazon: (v: string) => void;
      monto: string;
      setMonto: (v: string) => void;
      comprobante: PickedFile | null;
      setComprobante: (f: PickedFile | null) => void;
      guardando: boolean;
      guardar: () => void;
      cancelar: () => void;
    } | null;
  };

  kilometrajeSheet: {
    open: boolean;
    plate: string;
    model: string;
    actual: string;
    valor: string;
    setValor: (v: string) => void;
    close: () => void;
    guardar: () => void;
  };

  choferSheet: {
    open: boolean;
    close: () => void;
    title: string;
    carLabel: string;
    name: string;
    setName: (v: string) => void;
    cuota: string;
    setCuota: (v: string) => void;
    credentials: { username: string; password: string } | null;
    credentialsLoading: boolean;
    needsCredentials: boolean;
    continuar: () => void;
    volver: () => void;
    guardar: () => void;
    hasDriver: boolean;
    desvincular: () => void;
  };

  perfil: {
    actual: string;
    setActual: (v: string) => void;
    nueva: string;
    setNueva: (v: string) => void;
    repetir: string;
    setRepetir: (v: string) => void;
    guardando: boolean;
    guardar: () => void;
  };

  toast: string;
}

export function useMobileView(
  cars: Car[],
  movs: Mov[],
  pagos: Pago[],
  locations: CarLocation[],
  state: MobileState,
  update: (patch: Partial<MobileState> | ((s: MobileState) => Partial<MobileState>)) => void,
  persist: Pick<FleetStore, 'patchCar' | 'previewDriverCredentials' | 'assignDriver' | 'addCar' | 'addPago' | 'addEgreso' | 'mandarATaller' | 'exportReport'>,
  cambiarPassword: (actual: string, nueva: string) => Promise<void>,
): MobileView {
  const toast = (msg: string) => update({ toast: msg });
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => update({ toast: '' }), 2600);
    return () => clearTimeout(t);
  }, [state.toast]);

  // ---- navegación + botón físico de "atrás" de Android --------------------
  // No hay History API en React Native: la pila de pantallas se mantiene acá
  // a mano. Cada `push` guarda una foto de dónde estábamos parados antes de
  // saltar, y `back` la restaura — así una cadena de pushes vuelve pantalla
  // por pantalla, igual que hacía `history.back()` en la versión web. Los
  // sheets no entran en la pila a propósito: solo se cierran con la X o
  // tocando afuera, para no complicarla con entradas que no son pantallas.
  const stackRef = useRef<{ screen: Screen; backTo: Screen; carId: string | null }[]>([]);

  // Si queda un input enfocado cuando se cambia de pantalla, el teclado se
  // cierra recién cuando el sistema nota que el campo se desmontó — ese
  // desfasaje es lo que dejaba a KeyboardAvoidingView con el padding de abajo
  // trabado (el BottomNav quedaba con un hueco de más). Cerrarlo a mano antes
  // de cualquier navegación saca la carrera de encima.
  const push = (screen: Screen, patch: Partial<MobileState> = {}) => {
    Keyboard.dismiss();
    stackRef.current.push({ screen: state.screen, backTo: state.backTo, carId: state.carId });
    const backTo = state.screen;
    update({ screen, backTo, ...patch });
  };
  const replaceTab = (screen: Screen) => {
    Keyboard.dismiss();
    stackRef.current = [];
    update({ screen, backTo: screen, carId: null, ...(screen === 'gastos' ? { gastosStep: 'vehicle' } : {}) });
  };
  const back = () => {
    Keyboard.dismiss();
    if (state.screen === 'registrar' && state.registrar && !state.registrar.success) {
      const firstStep = state.registrar.tab === 'gasto' && state.registrar.lockCar ? 1 : 0;
      if (state.registrar.step > firstStep) {
        let previousStep = state.registrar.step - 1;
        update((s) => ({ registrar: s.registrar && { ...s.registrar, step: previousStep } }));
        return;
      }
    }
    if (state.screen === 'reportes') {
      const previousReportStep: Partial<Record<ReportStep, ReportStep>> = {
        cars: 'include',
        categories: 'cars',
        review: state.reportesInclude === 'gastos' || state.reportesInclude === 'ambos' ? 'categories' : 'cars',
      };
      const previousStep = previousReportStep[state.reportesStep];
      if (previousStep) {
        update({ reportesStep: previousStep, reportesError: '' });
        return;
      }
    }
    if (state.screen === 'gastos') {
      const previousGastosStep: Partial<Record<MobileState['gastosStep'], MobileState['gastosStep']>> = {
        category: 'vehicle',
        results: 'category',
      };
      const previousStep = previousGastosStep[state.gastosStep];
      if (previousStep) {
        update({ gastosStep: previousStep });
        return;
      }
    }
    const prev = stackRef.current.pop();
    update(prev ?? { screen: 'dashboard', backTo: 'dashboard', carId: null });
  };

  const openNotification = (route: AdminNotificationRoute) => {
    Keyboard.dismiss();
    stackRef.current = [];
    const common = {
      backTo: 'dashboard' as Screen,
      periodSheet: false,
      estadoSheet: false,
      tallerForm: null,
      kilometrajeSheet: null,
      choferSheet: false,
      registroChoice: false,
      movementDetailId: null,
      quotaDetailId: null,
    };
    if (route.kind === 'alerts') {
      update({ ...common, screen: 'alertas', carId: null });
      return;
    }
    update({ ...common, screen: 'detalle', carId: route.carId, movementDetailId: 'pago-' + route.paymentId });
  };

  // Misma validación para el botón "Agregar a la flota" (decide si se abre
  // el resumen) y para "Confirmar" dentro del resumen (la corre de nuevo por
  // las dudas, es barata y así nunca manda algo que no pasó las reglas).
  const nuevoVehiculoValidar = () => {
    const n = state.nuevoVehiculo;
    const plate = n.plate.trim().toUpperCase();
    if (!plate) {
      toast('Ingresá la chapa del vehículo');
      return null;
    }
    if (!n.model.trim()) {
      toast('Ingresá la marca y el modelo');
      return null;
    }
    const kilometraje = numFromInput(n.kilometraje);
    if (cars.some((c) => c.id !== state.carId && c.plate.toUpperCase() === plate)) {
      toast('Esa chapa ya está en la flota');
      return null;
    }
    const cada = numFromInput(n.serviceCada);
    if (n.lastService && n.lastService > isoLocal(TODAY)) {
      toast('El último service no puede ser una fecha futura');
      return null;
    }
    const segCada = numFromInput(n.seguroCada);
    if (segCada > SEG_CADA_MAX) {
      toast('Cada cuánto se renueva el seguro: entre 1 y ' + SEG_CADA_MAX + ' meses');
      return null;
    }
    const payload: NuevoCarPayload = {
      plate,
      model: n.model.trim(),
      year: numFromInput(n.year) || 2018,
      gpsTag: n.gpsTag.trim(),
      ...(n.kilometraje.trim() ? { kilometraje } : {}),
      ...(n.lastService ? { lastServiceDate: n.lastService, serviceCada: cada, serviceUnidad: n.serviceUnidad } : n.serviceCada ? { serviceCada: cada, serviceUnidad: n.serviceUnidad } : {}),
      ...(n.seguroVence ? { seguroDate: n.seguroVence } : {}),
      ...(n.seguroNombre.trim() ? { seguroNombre: n.seguroNombre.trim() } : {}),
      ...(n.seguroCada ? { seguroCada: segCada } : {}),
    };
    return {
      plate,
      payload,
    };
  };

  const nuevoVehiculoResumen = () => {
    const n = state.nuevoVehiculo;
    const rows = [
      { label: 'Chapa', value: n.plate.trim().toUpperCase() || '—' },
      { label: 'Marca y modelo', value: n.model.trim() || '—' },
      { label: 'Año', value: n.year || '—' },
    ];
    if (n.gpsTag.trim()) rows.push({ label: 'GPS tag', value: n.gpsTag.trim() });
    rows.push({ label: 'Kilometraje', value: n.kilometraje || '—' });
    rows.push({ label: 'Último service', value: n.lastService ? dLblFull(new Date(n.lastService + 'T12:00:00')) : '—' });
    rows.push({ label: 'Service cada', value: (n.serviceCada || '—') + ' ' + (n.serviceUnidad === 'dias' ? 'días' : 'meses') });
    rows.push({ label: 'Seguro vence', value: n.seguroVence ? dLblFull(new Date(n.seguroVence + 'T12:00:00')) : '—' });
    rows.push({ label: 'Aseguradora', value: n.seguroNombre || '—' });
    rows.push({ label: 'Renovar cada', value: (n.seguroCada || '—') + ' meses' });
    return rows;
  };

  // El botón físico (o el gesto) de Android tiene que volver pantalla por
  // pantalla igual que el de la app; solo sale de la app si ya está en el
  // tab raíz sin nada en la pila. Se engancha una sola vez al montar y lee
  // el estado más nuevo por ref para no tener que reconectar el listener en
  // cada render.
  const onRoot = state.screen === 'dashboard' && stackRef.current.length === 0;
  const onRootRef = useRef(onRoot);
  onRootRef.current = onRoot;
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onRootRef.current) return false;
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const active = cars.filter((c) => c.estado !== 'baja');
  const carDe = new Map(cars.map((c) => [c.id, c]));
  const cuotas = movs.filter((m) => m.type === 'ingreso');
  const choferDeCuota = (m: Mov) => {
    const c = carDe.get(m.carId);
    return claveChofer(m, c);
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
  const inRP = (p: Pago) => p.fecha >= r.start && p.fecha <= r.end;
  const inPrevP = (p: Pago) => p.fecha >= prevStart && p.fecha <= prevEnd;

  const tot = stats(movs, aplicaciones, inR, inRA, pagos, inRP);
  const prev = stats(movs, aplicaciones, inPrev, inPrevA, pagos, inPrevP);

  const alerts = buildAlerts(active);
  const alertsByCar = new Map<string, Alerta[]>();
  alerts.forEach((a) => {
    const arr = alertsByCar.get(a.car.id) ?? [];
    arr.push(a);
    alertsByCar.set(a.car.id, arr);
  });

  const perCarNet = (c: Car) => stats(movs, aplicaciones, (m) => m.carId === c.id && inR(m), (a) => a.carId === c.id && inRA(a), pagos, (p) => p.carId === c.id && inRP(p)).net;
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
  // Choferes por identidad estable, para el formulario de pago y la pantalla de
  // choferes: un mismo `driverId` puede aparecer en varios autos si se reasignó.
  const choferKeys = new Map<string, Car>();
  cars.forEach((c) => {
    if (c.driver === 'Sin chofer') return;
    const k = claveDeCar(c);
    if (!choferKeys.has(k)) choferKeys.set(k, c);
  });
  deudaPorChofer.forEach((_, k) => {
    if (!choferKeys.has(String(k))) choferKeys.set(String(k), { ...({} as Car), driver: String(k) });
  });

  const car = state.carId ? cars.find((c) => c.id === state.carId) : undefined;

  // Última posición conocida del auto. Misma lógica que admin-web: la edad se
  // calcula desde `recorded_at` y pasada una hora se avisa que está vieja.
  const carLocation = car ? locations.find((l) => l.carId === car.id) : undefined;
  const locationView = (() => {
    if (!carLocation) return null;
    const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(carLocation.recordedAt).getTime()) / 60_000));
    const age = ageMinutes < 2 ? 'hace un momento' : ageMinutes < 60 ? 'hace ' + ageMinutes + ' min' : 'hace ' + Math.floor(ageMinutes / 60) + ' h';
    return {
      age,
      stale: ageMinutes > 60,
      accuracy: carLocation.accuracy ?? null,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${carLocation.latitude},${carLocation.longitude}`,
    };
  })();

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
  const bars = sorted.map((x) => ({ plate: x.c.plate, w: Math.max(4, Math.round((Math.abs(x.n) / maxAbs) * 100)), color: statusColor(x.n, UMBRAL_VERDE), short: fmtShort(x.n) }));

  const baseMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const monthNets: number[] = [];
  const monthLbls: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = addM(baseMonth, -i);
    const y = d.getFullYear();
    const mo = d.getMonth();
    const fm = (m: Mov) => m.date.getFullYear() === y && m.date.getMonth() === mo;
    const fa = (a: Aplicacion) => a.fecha.getFullYear() === y && a.fecha.getMonth() === mo;
    monthNets.push(stats(movs, aplicaciones, fm, fa, pagos, (p) => p.fecha.getFullYear() === y && p.fecha.getMonth() === mo).net);
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

  // ---- gastos -------------------------------------------------------
  // Los movimientos siguen siendo la fuente de verdad. Esta pantalla solo
  // cambia la forma de leerlos: primero por vehículo y después por gasto.
  const expenseCars = active.filter((c) => movs.some((m) => m.type === 'egreso' && m.carId === c.id && inR(m)));
  const gastoGroups: GastoGroupView[] = expenseCars
    .filter((c) => state.gastosCarIds === 'todos' || state.gastosCarIds.includes(c.id))
    .map((c) => {
      const movements = movs.filter((m) => m.type === 'egreso' && m.carId === c.id && inR(m) && (state.gastosCat === 'todas' || (m.cat || 'Otro') === state.gastosCat));
      const groupKey = 'car:' + c.id;
      return {
        carId: c.id,
        plate: c.plate,
        total: fmt(movements.reduce((sum, m) => sum + m.amount, 0)),
        expanded: state.gastosExpanded[groupKey] !== false,
        toggle: () => update((s) => ({ gastosExpanded: { ...s.gastosExpanded, [groupKey]: !(s.gastosExpanded[groupKey] !== false) } })),
        rows: movements.map((m) => {
          const items = m.items || [];
          const repuestos = items.reduce((sum, item) => sum + item.subtotal, 0);
          const rowKey = 'mov:' + m.id;
          return {
            id: rowKey,
            desc: m.desc,
            cat: m.cat || 'Otro',
            date: dLbl(m.date),
            amount: fmt(m.amount),
            repuestos: fmt(repuestos),
            manoObra: m.manoObra ? fmt(m.manoObra) : '',
            items: items.map((item) => ({ nombre: item.nombre, cantidad: String(item.cantidad), costoUnitario: fmt(item.costoUnitario), subtotal: fmt(item.subtotal) })),
            expanded: !!state.gastosExpanded[rowKey],
            toggle: () => update((s) => ({ gastosExpanded: { ...s.gastosExpanded, [rowKey]: !s.gastosExpanded[rowKey] } })),
          };
        }),
      };
    })
    .filter((g) => g.rows.length > 0);

  const gastoCarFilters: Chip[] = [
    { label: 'Todos los vehículos', ...chipStyle(state.gastosCarIds === 'todos'), pick: () => update({ gastosCarIds: 'todos' }) },
    ...active.map((c) => ({
      label: c.plate,
      ...chipStyle(state.gastosCarIds !== 'todos' && state.gastosCarIds.includes(c.id)),
      pick: () => update((s) => ({ gastosCarIds: s.gastosCarIds === 'todos' ? [c.id] : s.gastosCarIds.includes(c.id) ? s.gastosCarIds.filter((id) => id !== c.id) : [...s.gastosCarIds, c.id] })),
    })),
  ];
  const gastoCatFilters: Chip[] = [
    { label: 'Todas', ...chipStyle(state.gastosCat === 'todas', 'amber'), pick: () => update({ gastosCat: 'todas' }) },
    ...CATS.map((cat) => ({ label: cat, ...chipStyle(state.gastosCat === cat, 'amber'), pick: () => update({ gastosCat: cat }) })),
  ];
  const selectedGastoCars = state.gastosCarIds === 'todos' ? active : active.filter((c) => state.gastosCarIds.includes(c.id));
  const selectedGastoCarLabel = state.gastosCarIds === 'todos'
    ? 'Todos los vehículos'
    : selectedGastoCars.length === 0
      ? 'Ningún vehículo'
      : selectedGastoCars.length <= 2
        ? selectedGastoCars.map((c) => c.plate).join(' · ')
        : `${selectedGastoCars.length} vehículos seleccionados`;
  const selectedGastoCategoryLabel = state.gastosCat === 'todas' ? 'Todas las categorías' : state.gastosCat;
  const gastoCarOptions: GastoChoiceView[] = [
    {
      id: 'todos',
      label: 'Todos los vehículos',
      sub: `${active.length} vehículo${active.length === 1 ? '' : 's'} activos`,
      selected: state.gastosCarIds === 'todos',
      pick: () => update({ gastosCarIds: 'todos' }),
    },
    ...active.map((c) => ({
      id: c.id,
      label: c.plate,
      sub: c.model || 'Vehículo de la flota',
      selected: state.gastosCarIds !== 'todos' && state.gastosCarIds.includes(c.id),
      pick: () => update((s) => ({ gastosCarIds: s.gastosCarIds === 'todos' ? [c.id] : s.gastosCarIds.includes(c.id) ? s.gastosCarIds.filter((id) => id !== c.id) : [...s.gastosCarIds, c.id] })),
    })),
  ];
  const gastoCategoryOptions: GastoChoiceView[] = [
    {
      id: 'todas',
      label: 'Todas las categorías',
      sub: 'Mostrar todos los gastos',
      selected: state.gastosCat === 'todas',
      pick: () => update({ gastosCat: 'todas', gastosStep: 'results', gastosExpanded: {} }),
    },
    ...CATS.map((cat) => ({
      id: cat,
      label: cat,
      sub: 'Mostrar sólo esta categoría',
      selected: state.gastosCat === cat,
      pick: () => update({ gastosCat: cat, gastosStep: 'results', gastosExpanded: {} }),
    })),
  ];

  const continueGastoVehicles = () => {
    if (state.gastosCarIds !== 'todos' && state.gastosCarIds.length === 0) {
      toast('Elegí al menos un vehículo');
      return;
    }
    update({ gastosStep: 'category', gastosExpanded: {} });
  };

  const alertViews: AlertView[] = alerts.map((a) => ({
    carId: a.car.id,
    plate: a.car.plate,
    kind: a.kind,
    text: a.text,
    sev: a.sev,
    open: () => {
      if (a.kind === 'Service') return goRegistrarService(a.car.id);
      if (a.kind === 'Kilometraje') {
        return update({ kilometrajeSheet: { carId: a.car.id, valor: a.car.kilometraje ? miles(String(a.car.kilometraje)) : '' } });
      }
      if (a.kind === 'Taller') return push('detalle', { carId: a.car.id, estadoSheet: true });
      push('detalle', { carId: a.car.id });
    },
  }));

  const driverGroups = new Map<string, { name: string; cars: Car[] }>();
  active.forEach((c) => {
    const key = c.driver === 'Sin chofer' ? 'none:' + c.id : claveDeCar(c);
    const current = driverGroups.get(key) ?? { name: c.driver, cars: [] };
    current.cars.push(c);
    driverGroups.set(key, current);
  });
  const choferViews: ChoferView[] = [...driverGroups.entries()].map(([key, g]) => ({
    key,
    name: g.name,
    initials: initials(g.name),
    cars: g.cars.map((c) => c.plate).join(' · '),
    carId: g.cars[0].id,
    cuota: g.cars[0].cuota ? fmt(g.cars[0].cuota) + ' por día' : 'Sin cuota cargada',
    open: () => push('detalle', { carId: g.cars[0].id }),
  }));

  // ---- detalle -------------------------------------------------------
  let detalle: DetalleView | null = null;
  let movementDetail: MovementDetailView | null = null;
  let quotaDetail: QuotaDetailView | null = null;
  if (car) {
    const cs = stats(movs, aplicaciones, (m) => m.carId === car.id && inR(m), (a) => a.carId === car.id && inRA(a), pagos, (p) => p.carId === car.id && inRP(p));
    const carAlerts = alertsByCar.get(car.id) ?? [];
    const carMovs = movs.filter((m) => m.carId === car.id).sort((a, b) => +b.date - +a.date);
    const cuotaRows: MovRowView[] = carMovs.filter((m) => m.type === 'ingreso').map((m) => {
      const isIng = m.type === 'ingreso';
      const deuda = isIng ? deudaDe(m) : 0;
      const cobradoM = isIng ? cobradoDe(m) : 0;
      const showTag = isIng;
      const tag = deuda <= 0 ? 'Pagada' : cobradoM > 0 ? 'Parcial' : 'Pendiente';
      const tagColors = tag === 'Pagada' ? ['#e7f2ec', '#256b4d'] : tag === 'Parcial' ? ['#fdf0dd', '#9a6a12'] : ['#fdeeea', '#a8412f'];
      return {
        id: 'cuota-' + m.id,
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
        onPress: () => update({ quotaDetailId: m.id }),
      };
    });
    const movementRowsWithDate: { fecha: Date; row: MovRowView }[] = [
      ...pagos.filter((p) => p.carId === car.id).map((p) => ({
        fecha: p.fecha,
        row: {
          id: 'pago-' + p.id,
          desc: p.tipo === 'ajuste' ? 'Ajuste registrado' : 'Pago recibido',
          sub: dLbl(p.fecha) + ' · ' + (p.driver || car.driver) + (p.nota ? ' · ' + p.nota : ''),
          icon: '↓',
          iconBg: '#e7f2ec',
          color: COLORS.pos,
          amt: '+' + fmtShort(p.monto),
          showTag: false,
          tag: '',
          tagBg: '#e7f2ec',
          tagFg: '#256b4d',
          onPress: () => update({ movementDetailId: 'pago-' + p.id }),
        },
      })),
      ...carMovs.filter((m) => m.type === 'egreso').map((m) => ({
        fecha: m.date,
        row: {
          id: 'gasto-' + m.id,
          desc: m.desc,
          sub: dLbl(m.date) + ' · ' + (m.cat ?? '') + (m.comprobante ? ' · comprobante' : ''),
          icon: '↑',
          iconBg: '#fdeeea',
          color: COLORS.neg,
          amt: '−' + fmtShort(m.amount),
          showTag: false,
          tag: '',
          tagBg: '#fdeeea',
          tagFg: '#a8412f',
          onPress: () => update({ movementDetailId: 'gasto-' + m.id }),
        },
      })),
    ];
    const timeline = movementRowsWithDate.sort((a, b) => +b.fecha - +a.fecha).map((item) => item.row);
    movementDetail = (() => {
      const selectedPago = state.movementDetailId?.startsWith('pago-')
        ? pagos.find((p) => 'pago-' + p.id === state.movementDetailId)
        : undefined;
      const selectedGasto = state.movementDetailId?.startsWith('gasto-')
        ? carMovs.find((m) => 'gasto-' + m.id === state.movementDetailId)
        : undefined;
      if (selectedPago) {
        const ajuste = selectedPago.tipo === 'ajuste';
        return {
          id: 'pago-' + selectedPago.id,
          title: ajuste ? 'Ajuste registrado' : 'Pago recibido',
          type: ajuste ? 'Ajuste' : 'Ingreso',
          typeBg: '#e7f2ec',
          typeFg: '#256b4d',
          amount: '+' + fmtShort(selectedPago.monto),
          amountColor: COLORS.pos,
          date: dLblFull(selectedPago.fecha),
          vehicle: car.plate,
          driver: selectedPago.driver || car.driver,
          category: ajuste ? 'Ajuste' : 'Pago',
          medio: selectedPago.medio || 'Sin especificar',
          note: selectedPago.nota || '',
          comprobanteName: selectedPago.comprobante?.nombre || '',
          comprobante: selectedPago.comprobante ? { uri: API_BASE + '/api/comprobantes/' + encodeURIComponent(selectedPago.comprobante.id), name: selectedPago.comprobante.nombre, type: selectedPago.comprobante.tipo, headers: getAuthHeaders() } : null,
          items: [],
          manoObra: '',
          close: () => update({ movementDetailId: null }),
        };
      }
      if (!selectedGasto) return null;
      return {
        id: 'gasto-' + selectedGasto.id,
        title: selectedGasto.desc,
        type: 'Gasto',
        typeBg: '#fdeeea',
        typeFg: '#a8412f',
        amount: '−' + fmtShort(selectedGasto.amount),
        amountColor: COLORS.neg,
        date: dLblFull(selectedGasto.date),
        vehicle: car.plate,
        driver: selectedGasto.driver || car.driver || 'Sin chofer',
        category: selectedGasto.cat || 'Otros',
        medio: 'Sin especificar',
        note: selectedGasto.desc,
        comprobanteName: selectedGasto.comprobante?.nombre || '',
        comprobante: selectedGasto.comprobante ? { uri: API_BASE + '/api/comprobantes/' + encodeURIComponent(selectedGasto.comprobante.id), name: selectedGasto.comprobante.nombre, type: selectedGasto.comprobante.tipo, headers: getAuthHeaders() } : null,
        items: (selectedGasto.items || []).map((item) => ({ nombre: item.nombre, cantidad: item.cantidad, costoUnitario: fmt(item.costoUnitario), subtotal: fmt(item.subtotal) })),
        manoObra: selectedGasto.manoObra ? fmt(selectedGasto.manoObra) : '',
        close: () => update({ movementDetailId: null }),
      };
    })();
    quotaDetail = (() => {
      const cuotaId = state.quotaDetailId;
      if (cuotaId == null) return null;
      const cuota = carMovs.find((m) => m.type === 'ingreso' && m.id === cuotaId);
      if (!cuota) return null;

      const paid = cobradoDe(cuota);
      const remaining = Math.max(0, cuota.amount - paid);
      const status = remaining <= 0 ? 'Pagada' : paid > 0 ? 'Parcial' : 'Pendiente';
      const statusColors = status === 'Pagada' ? ['#e7f2ec', '#256b4d'] : status === 'Parcial' ? ['#fdf0dd', '#9a6a12'] : ['#fdeeea', '#a8412f'];
      const paymentById = new Map(pagos.map((p) => [p.id, p]));
      const payments = new Map<number, QuotaPaymentView & { appliedAmount: number }>();

      aplicaciones
        .filter((a) => a.movId === cuota.id)
        .sort((a, b) => +a.fecha - +b.fecha)
        .forEach((a) => {
          const pago = paymentById.get(a.pagoId);
          if (!pago) return;
          const existing = payments.get(pago.id);
          if (existing) {
            existing.appliedAmount += a.monto;
            existing.applied = fmtShort(existing.appliedAmount);
            return;
          }
          payments.set(pago.id, {
            id: pago.id,
            title: pago.tipo === 'ajuste' ? 'Ajuste aplicado' : 'Pago aplicado',
            date: dLblFull(pago.fecha),
            applied: fmtShort(a.monto),
            total: fmtShort(pago.monto),
            medio: pago.medio || 'Sin especificar',
            note: pago.nota || '',
            appliedAmount: a.monto,
            onPress: () => update({ quotaDetailId: null, movementDetailId: 'pago-' + pago.id }),
          });
        });

      return {
        title: cuota.desc,
        date: dLblFull(cuota.date),
        driver: paidBy(cuota, car),
        amount: fmtShort(cuota.amount),
        paid: fmtShort(paid),
        remaining: fmtShort(remaining),
        status,
        statusBg: statusColors[0],
        statusFg: statusColors[1],
        payments: [...payments.values()],
        close: () => update({ quotaDetailId: null }),
      };
    })();
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
      edit: () => push('nuevoVehiculo', { carId: car.id, nuevoVehiculo: nuevoVehiculoDesdeCar(car), nuevoVehiculoConfirm: false, nuevoVehiculoGuardando: false }),
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
      noMovs: timeline.length === 0,
      movCount: timeline.length + ' en total',
      cuotas: cuotaRows,
      noCuotas: cuotaRows.length === 0,
      cuotaCount: cuotaRows.length + ' en total',
      goCobro: () => goRegistrar('cobro', car.id),
      goGasto: () => goRegistrar('gasto', car.id),
      openEstadoSheet: () => update({ estadoSheet: true }),
      openChoferSheet: () =>
        update({
          choferSheet: true,
          choferForm: { name: car.driver === 'Sin chofer' ? '' : car.driver, cuota: car.cuota ? String(car.cuota) : '' },
          choferCredentials: null,
          choferCredentialsLoading: false,
        }),
      location: locationView,
    };
  }

  // ---- registrar -------------------------------------------------------
  const f = state.registrar;
  function goRegistrar(tab: RegistrarTab, carId?: string, serviceMode = false) {
    const contextCar = carId ?? car?.id;
    const resolvedCar = contextCar ?? '';
    const driver = carDe.get(resolvedCar)?.driver ?? '';
    const lockCar = Boolean(contextCar);
    push('registrar', { registrar: { ...blankRegistrarForm(tab, resolvedCar, driver === 'Sin chofer' ? '' : driver, lockCar, serviceMode), ...(serviceMode ? { cat: 'Service' } : {}) } });
  }
  const goRegistrarCobro = (carId?: string) => goRegistrar('cobro', carId);
  const goRegistrarGasto = (carId?: string) => goRegistrar('gasto', carId);
  const goRegistrarService = (carId?: string) => goRegistrar('gasto', carId, true);

  let registrarView: MobileView['registrar'] = null;
  if (f) {
    const setF = (patch: Partial<typeof f>) => update((s) => ({ registrar: s.registrar && { ...s.registrar, ...patch } }));
    const gastoItems = f.items
      .map((item) => ({ nombre: item.nombre.trim(), cantidad: numFromInput(item.cantidad), costoUnitario: numFromInput(item.costoUnitario) }))
      .filter((item) => item.nombre && item.cantidad > 0 && item.costoUnitario > 0)
      .map((item) => ({ ...item, subtotal: item.cantidad * item.costoUnitario }));
    const manoObraNum = numFromInput(f.manoObra);
    const gastoStructuredTotal = gastoItems.reduce((sum, item) => sum + item.subtotal, 0) + manoObraNum;
    const amountNum = f.serviceMode ? parseInt(f.digits || '0', 10) : f.tab === 'gasto' ? gastoStructuredTotal || parseInt(f.digits || '0', 10) : parseInt(f.digits || '0', 10);
    const press = (k: string) =>
      setF({
        digits: k === 'del' ? f.digits.slice(0, -1) : k === '000' ? (f.digits ? (f.digits + '000').slice(0, 10) : f.digits) : f.digits.length < 10 ? (f.digits === '' && k === '0' ? '' : f.digits + k) : f.digits,
      });
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => ({ label: k === 'del' ? '⌫' : k, press: () => press(k) }));

    let cobro: NonNullable<MobileView['registrar']>['cobro'] = null;
    if (f.tab === 'cobro') {
      const opciones = [...choferKeys.entries()].sort(
        (a, b) => (deudaPorChofer.get(b[0]) ?? 0) - (deudaPorChofer.get(a[0]) ?? 0) || a[1].driver.localeCompare(b[1].driver),
      );
      const debe = deudaPorChofer.get(f.driver) ?? 0;
      cobro = {
        carId: f.carId,
        setCarId: (v) => {
          const selected = carDe.get(v);
          setF({ carId: v, driver: selected ? claveDeCar(selected) : '' });
        },
        selCars: active.map((c) => ({ id: c.id, label: c.plate + ' · ' + c.driver })),
        lockCar: f.lockCar,
        driver: f.driver,
        setDriver: (v) => setF({ driver: v }),
        opciones: opciones.map(([k, c]) => ({ id: k, label: c.driver + (deudaPorChofer.get(k) ? ' — debe ' + fmtShort(deudaPorChofer.get(k)!) : ' — al día') })),
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
    if (f.tab === 'gasto' && !f.serviceMode) {
      gasto = {
        catChips: REG_CATS.map((name) => ({ label: name, ...chipStyle(f.cat === name, 'amber'), pick: () => setF({ cat: name }) })),
        carId: f.carId,
        setCarId: (v) => setF({ carId: v }),
        selCars: active.map((c) => ({ id: c.id, label: c.plate + ' · ' + c.driver })),
        lockCar: f.lockCar,
        comprobante: f.comprobante,
        setComprobante: (file) => setF({ comprobante: file }),
        items: f.items,
        setItem: (index, patch) => setF({ items: f.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }),
        addItem: () => setF({ items: [...f.items, { nombre: '', cantidad: '1', costoUnitario: '' }] }),
        removeItem: (index) => setF({ items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items }),
        manoObra: f.manoObra,
        setManoObra: (v) => setF({ manoObra: miles(v) }),
      };
    }

    let service: NonNullable<MobileView['registrar']>['service'] = null;
    if (f.serviceMode) {
      service = {
        carId: f.carId,
        setCarId: (v) => setF({ carId: v }),
        selCars: active.map((c) => ({ id: c.id, label: c.plate + ' · ' + c.driver })),
        lockCar: f.lockCar,
        kilometraje: f.manoObra,
        setKilometraje: (v) => setF({ manoObra: v.replace(/\D/g, '').slice(0, 10) }),
        tieneCosto: amountNum > 0,
        comprobante: f.comprobante,
        setComprobante: (file) => setF({ comprobante: file }),
      };
    }

    const finish = () => back();
    const again = () => update({ registrar: blankRegistrarForm(f.tab, f.carId, f.driver, f.lockCar, f.serviceMode) });

    const legacyNext = () => {
      if (f.guardando || f.success) return;
      if (f.tab === 'cobro') {
        if (f.step === 0 && !f.driver) return toast('Elegí de qué chofer es el pago');
        if (f.step === 1 && !amountNum) return toast('Ingresá cuánto pagó');
        if (f.step === 3 && f.fecha > isoLocal(TODAY)) return toast('La fecha no puede ser futura');
        if (f.step < 5) setF({ step: f.step + 1 });
        return;
      }
    };

    const legacySubmit = () => {
      if (f.guardando) return;
      if (!amountNum) return toast(f.tab === 'cobro' ? 'Ingresá cuánto pagó' : 'Agregá repuestos o mano de obra');
      if (f.fecha > isoLocal(TODAY)) return toast('La fecha no puede ser futura');
      if (f.tab === 'cobro') {
        if (!f.driver) return toast('Elegí de qué chofer es el pago');
        setF({ guardando: true });
        const carSel = cars.find((c) => claveDeCar(c) === f.driver);
        const nombre = carSel?.driver ?? f.driver;
        persist
          .addPago({ driver: f.driver, carId: carSel?.id ?? null, fecha: f.fecha, monto: amountNum, tipo: f.tipo, nota: f.nota.trim() || undefined })
          .then(() => {
            const amount = fmt(amountNum);
            update((s) => ({
              registrar: s.registrar && {
                ...s.registrar,
                guardando: false,
                success: { tab: 'cobro', title: f.tipo === 'ajuste' ? 'Ajuste registrado' : 'Pago registrado', detail: nombre, amount },
              },
            }));
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
          .addEgreso(f.carId, { razon: f.nota.trim(), monto: amountNum, cat: f.cat, comprobante: f.comprobante, items: gastoItems, manoObra: manoObraNum })
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

    void legacyNext;
    void legacySubmit;

    const next = () => {
      if (f.guardando || f.success) return;
      if (f.serviceMode) {
        if (f.step === 0 && !f.carId) return toast('Elegí a qué auto corresponde');
        if (f.step === 1 && !f.nota.trim()) return toast('Contá qué service se hizo');
        if (f.step < 5) setF({ step: f.step + 1 });
        return;
      }
      if (f.tab === 'cobro') {
        if (f.step === 0 && !f.carId) return toast('Elegí a qué auto corresponde');
        if (f.step === 1 && !amountNum) return toast('Ingresá cuánto ingresó');
        if (f.step < 2) setF({ step: f.step + 1 });
        return;
      }
      if (f.step === 0 && !f.carId) return toast('Elegí a qué auto corresponde');
      if (f.step === 0) return setF({ step: 1 });
      if (f.step === 1) {
        if (!f.cat) return toast('Elegí el tipo de egreso');
        return setF({ step: 2 });
      }
      if (f.step === 2 && !amountNum) return toast('Ingresá cuánto gastaste');
      if (f.step === 2) return setF({ step: 3 });
    };

    const submit = () => {
      if (f.guardando) return;
      if (f.serviceMode) {
        if (!f.carId) return toast('Elegí a qué auto corresponde');
        if (!f.nota.trim()) return toast('Contá qué service se hizo');
        if (f.fecha > isoLocal(TODAY)) return toast('La fecha no puede ser futura');
        const mileage = numFromInput(f.manoObra);
        const plate = carDe.get(f.carId)?.plate ?? '';
        setF({ guardando: true });
        const saveExpense = amountNum > 0
          ? persist.addEgreso(f.carId, { razon: f.nota.trim(), monto: amountNum, cat: 'Service', comprobante: f.comprobante, items: [], manoObra: amountNum })
          : Promise.resolve();
        saveExpense
          .then(() => {
            persist.patchCar(f.carId, { lastServiceDate: new Date(f.fecha + 'T12:00:00'), ...(mileage ? { kilometraje: mileage } : {}) });
            update((s) => ({ registrar: s.registrar && { ...s.registrar, guardando: false, success: { tab: 'gasto', title: 'Service registrado', detail: plate + ' · ' + f.nota.trim(), amount: amountNum ? fmt(amountNum) : 'Sin costo' } } }));
          })
          .catch((e: Error) => {
            setF({ guardando: false });
            toast('No se pudo registrar: ' + e.message);
          });
        return;
      }
      if (!amountNum) return toast(f.tab === 'cobro' ? 'Ingresá cuánto ingresó' : 'Ingresá cuánto gastaste');
      if (f.fecha > isoLocal(TODAY)) return toast('La fecha no puede ser futura');
      if (!f.carId) return toast('Elegí a qué auto corresponde');
      setF({ guardando: true });
      if (f.tab === 'cobro') {
        const carSel = cars.find((c) => c.id === f.carId);
        const driverKey = carSel ? claveDeCar(carSel) : '';
        if (!carSel || !driverKey || driverKey === 'Sin chofer') {
          setF({ guardando: false });
          return toast('El auto tiene que tener un chofer');
        }
        persist
          .addPago({ driver: driverKey, carId: carSel.id, fecha: f.fecha, monto: amountNum, tipo: 'pago', nota: f.nota.trim() || undefined })
          .then(() => update((s) => ({ registrar: s.registrar && { ...s.registrar, guardando: false, success: { tab: 'cobro', title: 'Ingreso registrado', detail: carSel.plate, amount: fmt(amountNum) } } })))
          .catch((e: Error) => {
            setF({ guardando: false });
            toast('No se pudo registrar: ' + e.message);
          });
        return;
      }
      const plate = carDe.get(f.carId)?.plate ?? '';
      const simpleItems = f.cat === 'Repuestos' && f.nota.trim()
        ? [{ nombre: f.nota.trim(), cantidad: 1, costoUnitario: amountNum, subtotal: amountNum }]
        : [];
      const descripcion = f.nota.trim() || f.cat;
      persist
        .addEgreso(f.carId, { razon: descripcion, monto: amountNum, cat: f.cat, comprobante: f.comprobante, items: simpleItems, manoObra: simpleItems.length ? 0 : undefined })
        .then(() => update((s) => ({ registrar: s.registrar && { ...s.registrar, guardando: false, success: { tab: 'gasto', title: 'Egreso registrado', detail: plate + ' · ' + descripcion, amount: fmt(amountNum) } } })))
        .catch((e: Error) => {
          setF({ guardando: false });
          toast('No se pudo registrar: ' + e.message);
        });
    };

    const cobroTitles = [
      ['¿De qué chofer es este pago?', 'Elegí el chofer al que corresponde el cobro.'],
      ['¿Cuánto pagó?', 'Ingresá el monto usando el teclado.'],
      ['¿Qué tipo de movimiento es?', 'Un pago entra en caja; un ajuste cancela deuda sin ingreso.'],
      ['¿Cuándo se recibió?', 'La fecha no puede ser posterior a hoy.'],
      ['¿Querés agregar una nota?', 'Este dato es opcional. Podés continuar sin escribir nada.'],
      ['Revisá el cobro', 'Confirmá los datos antes de guardarlo.'],
    ];
    const simpleCobroTitles = [
      ['¿De qué auto es el ingreso?', 'Elegí el auto al que corresponde el pago.'],
      ['¿Cuánto ingresó?', 'Ingresá el monto recibido.'],
      ['Revisá el ingreso', 'Confirmá los datos antes de guardarlo.'],
    ];
    void cobroTitles;
    const gastoTitles = [
      ['¿De qué auto es el egreso?', 'Elegí el auto al que corresponde el gasto.'],
      ['¿Qué tipo de egreso es?', 'Elegí una categoría para ordenar tus gastos.'],
      ['¿Qué repuesto compraste?', 'Escribí una descripción corta.'],
      ['¿Cuánto gastaste?', 'Ingresá el total del gasto.'],
      ['Revisá el egreso', 'Confirmá los datos antes de guardarlo.'],
    ];
    const serviceTitles = [
      ['¿De qué auto es el service?', 'Elegí el vehículo al que corresponde.'],
      ['¿Qué se hizo?', 'Escribí una descripción breve del mantenimiento.'],
      ['¿Cuánto costó? (opcional)', 'Si lo completás, también aparecerá en Gastos.'],
      ['¿Cuándo se hizo?', 'La fecha no puede ser posterior a hoy.'],
      ['¿Cuál era el kilometraje?', 'Podés dejarlo vacío si no lo sabés.'],
      ['Revisá el service', 'Confirmá los datos antes de guardarlo.'],
    ];
    const firstStep = f.lockCar ? 1 : 0;
    const viewStep = f.serviceMode ? Math.min(f.step, 5) : f.tab === 'gasto' ? Math.min(f.step, 3) : f.step;
    const progressStep = viewStep - firstStep;
    const totalSteps = f.serviceMode ? 6 - firstStep : f.tab === 'cobro' ? 3 - firstStep : 4 - firstStep;
    const gastoStepMeta = [gastoTitles[0], gastoTitles[1], gastoTitles[3], gastoTitles[4]][viewStep];
    const stepMeta = f.serviceMode ? serviceTitles[viewStep] : f.tab === 'cobro' ? simpleCobroTitles[f.step] : gastoStepMeta;
    registrarView = {
      tab: f.tab,
      setTab: (t) => setF({ tab: t }),
      step: viewStep,
      totalSteps,
      progressStep,
      stepTitle: stepMeta[0],
      stepHint: stepMeta[1],
      backStep: () => back(),
      next,
      nextLabel: f.serviceMode ? (f.step >= 5 ? 'Registrar service' : 'Continuar') : (f.tab === 'cobro' && f.step === 2) || (f.tab === 'gasto' && f.step >= 3) ? (f.tab === 'cobro' ? 'Registrar ingreso' : 'Registrar egreso') : 'Continuar',
      nextDisabled: false,
      success: f.success,
      finish,
      again,
      amountDisplay: amountNum ? fmt(amountNum) : '₲ 0',
      amountColor: amountNum ? (f.tab === 'cobro' ? COLORS.pos : COLORS.neg) : '#b3aa99',
      amountHint: amountNum ? (f.tab === 'cobro' ? 'Cobro al chofer' : f.serviceMode ? 'Costo del service' : 'Repuestos + mano de obra') : f.tab === 'gasto' ? 'Agregá el detalle del gasto' : 'Usá el teclado para escribir el monto',
      keys,
      fecha: f.fecha,
      setFecha: (iso) => setF({ fecha: iso }),
      hoy: isoLocal(TODAY),
      nota: f.nota,
      setNota: (v) => setF({ nota: v }),
      notaPh: f.tab === 'cobro' ? 'Opcional' : 'De qué es el gasto',
      cta: { label: f.tab === 'cobro' ? 'Registrar ingreso' : 'Registrar egreso', bg: amountNum ? COLORS.ink : '#e2dbcc', fg: amountNum ? COLORS.paper : '#6b665c' },
      submit,
      guardando: f.guardando,
      cobro,
      gasto,
      service,
    };
  }

  // ---- reportes -------------------------------------------------------
  const reportCarAllowed = (carId: string | null) => state.reportesCarIds === 'todos' || (carId !== null && state.reportesCarIds.includes(carId));
  const reportCategoryAllowed = (category: string) => state.reportesCategories === 'todas' || state.reportesCategories.includes(category);
  const reportIncludeExpenses = state.reportesInclude === 'gastos' || state.reportesInclude === 'ambos';
  const reportIncludeIncome = state.reportesInclude === 'ingresos' || state.reportesInclude === 'ambos';
  const reportExpenses = reportIncludeExpenses
    ? movs.filter((m) => m.type === 'egreso' && inR(m) && reportCarAllowed(m.carId) && reportCategoryAllowed(m.cat || 'Otros'))
    : [];
  const reportIncome = reportIncludeIncome ? pagos.filter((p) => p.tipo === 'pago' && p.fecha >= r.start && p.fecha <= r.end && reportCarAllowed(p.carId)) : [];
  const reportCounts = { ingresos: reportIncome.length, gastos: reportExpenses.length, total: reportIncome.length + reportExpenses.length };
  const reportCarOptions = cars.map((car) => ({
    id: car.id,
    label: car.plate,
    sub: `${car.model}${car.estado === 'baja' ? ' · Baja' : ''}`,
    selected: state.reportesCarIds === 'todos' || state.reportesCarIds.includes(car.id),
    toggle: () => update((s) => {
      if (s.reportesCarIds === 'todos') return { reportesCarIds: [car.id], reportesError: '' };
      const next = s.reportesCarIds.includes(car.id) ? s.reportesCarIds.filter((id) => id !== car.id) : [...s.reportesCarIds, car.id];
      return { reportesCarIds: next, reportesError: '' };
    }),
  }));
  const reportCategoryOptions = CATS.map((category) => ({
    label: category,
    selected: state.reportesCategories === 'todas' || state.reportesCategories.includes(category),
    toggle: () => update((s) => {
      if (s.reportesCategories === 'todas') return { reportesCategories: [category], reportesError: '' };
      const next = s.reportesCategories.includes(category) ? s.reportesCategories.filter((item) => item !== category) : [...s.reportesCategories, category];
      return { reportesCategories: next, reportesError: '' };
    }),
  }));
  const reportSelectedCarLabels = reportCarOptions.filter((car) => car.selected).map((car) => car.label);
  const reportSelectedCategoryLabels = reportCategoryOptions.filter((category) => category.selected).map((category) => category.label);
  const reportPreviewRows: ReportPreviewRow[] = [
    ...reportIncome.map((pago) => ({
      id: `ingreso-${pago.id}`,
      tipo: 'Ingreso' as const,
      fecha: dLblFull(pago.fecha),
      vehiculo: cars.find((car) => car.id === pago.carId)?.plate ?? 'Sin vehículo',
      chofer: pago.driver || 'Sin chofer',
      categoria: 'Cobrado',
      detalle: 'Ingreso cobrado',
      monto: pago.monto,
      medio: pago.medio || 'Sin especificar',
      nota: pago.nota || '',
      items: [],
      manoObra: 0,
    })),
    ...reportExpenses.map((mov) => ({
      id: `gasto-${mov.id}`,
      tipo: 'Gasto' as const,
      fecha: dLblFull(mov.date),
      vehiculo: cars.find((car) => car.id === mov.carId)?.plate ?? 'Vehículo eliminado',
      chofer: cars.find((car) => car.id === mov.carId)?.driver ?? 'Sin chofer',
      categoria: mov.cat || 'Otros',
      detalle: mov.desc,
      monto: mov.items?.length ? mov.items.reduce((sum, item) => sum + item.subtotal, 0) + (mov.manoObra ?? 0) : mov.amount,
      medio: '',
      nota: '',
      items: (mov.items ?? []).map((item) => ({ nombre: item.nombre, cantidad: item.cantidad, costoUnitario: item.costoUnitario, subtotal: item.subtotal })),
      manoObra: mov.manoObra ?? 0,
    })),
  ];
  const reportSetInclude = (value: ReportInclude) => update({ reportesInclude: value, reportesStep: 'include', reportesError: '' });
  const reportSelectAllCars = () => update({ reportesCarIds: 'todos', reportesError: '' });
  const reportSelectAllCategories = () => update({ reportesCategories: 'todas', reportesError: '' });
  const reportNext = () => {
    if (state.reportesStep === 'include') {
      if (!state.reportesInclude) return toast('Elegí qué querés incluir');
      return update({ reportesStep: 'cars', reportesError: '' });
    }
    if (state.reportesStep === 'cars') {
      if (state.reportesCarIds !== 'todos' && state.reportesCarIds.length === 0) return toast('Elegí al menos un vehículo');
      return update({ reportesStep: reportIncludeExpenses ? 'categories' : 'review', reportesError: '' });
    }
    if (state.reportesStep === 'categories') {
      if (state.reportesCategories !== 'todas' && state.reportesCategories.length === 0) return toast('Elegí al menos una categoría');
      return update({ reportesStep: 'review', reportesError: '' });
    }
  };
  const reportPrevious = () => {
    const previousReportStep: Partial<Record<ReportStep, ReportStep>> = {
      cars: 'include',
      categories: 'cars',
      review: reportIncludeExpenses ? 'categories' : 'cars',
    };
    const previousStep = previousReportStep[state.reportesStep];
    if (previousStep) update({ reportesStep: previousStep, reportesError: '' });
  };
  const reportReset = () => update({ reportesStep: 'include', reportesInclude: null, reportesCarIds: 'todos', reportesCategories: 'todas', reportesExportando: false, reportesError: '' });
  const reportExport = (format: 'pdf' | 'xlsx') => {
    if (!state.reportesInclude) return toast('Elegí qué querés incluir');
    if (!reportCounts.total) {
      update({ reportesError: 'No hay datos para los filtros elegidos.' });
      return;
    }
    update({ reportesExportando: true, reportesError: '' });
    persist.exportReport({
      period: { type: state.period, from: isoLocal(r.start), to: isoLocal(r.end) },
      include: state.reportesInclude,
      carIds: state.reportesCarIds,
      ...(reportIncludeExpenses ? { categories: state.reportesCategories } : {}),
      format,
    })
      .then((result) => {
        update({ reportesExportando: false });
        void Linking.openURL(API_BASE + result.file.url).catch(() => toast('No se pudo abrir el archivo'));
      })
      .catch((error: Error) => update({ reportesExportando: false, reportesError: error.message || 'No se pudo generar el reporte' }));
  };
  // La versión web genera el .xlsx con la librería `xlsx` y lo baja como Blob;
  // ninguna de las dos cosas existe en React Native. Se exporta desde
  // admin-web hasta que esto tenga una ruta propia (compartir un archivo con
  // expo-file-system/expo-sharing).
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

  // ---- sheets -------------------------------------------------------
  const estadoOpts: [Car['estado'], string, string][] = [
    ['activo', 'Activo', 'En circulación, generando cuota'],
    ['taller', 'En taller', 'Fuera de servicio temporalmente'],
    ['baja', 'Baja', 'Fuera de la flota, no entra en los cálculos'],
  ];

  const goReportes = () => push('reportes', { reportesStep: 'include', reportesInclude: null, reportesCarIds: 'todos', reportesCategories: 'todas', reportesExportando: false, reportesError: '' });

  const headerByScreen: Record<string, [string, string]> = {
    dashboard: ['MiFlota', 'Actualizado · ' + r.label],
    flota: ['Vehículos', active.length + ' activos · ' + (cars.length - active.length) + ' de baja'],
    ranking: ['Ganancia por vehículo', 'Comparación del período'],
    reportes: ['Reportes', 'Exportá para tu contador'],
    detalle: ['Detalle del vehículo', ''],
    nuevoVehiculo: [state.carId ? 'Editar vehículo' : 'Nuevo vehículo', ''],
    registrar: [f?.serviceMode ? 'Registrar service' : f?.tab === 'gasto' ? 'Registrar egreso' : 'Registrar ingreso', ''],
    assistant: ['MiFlota IA', ''],
    perfil: ['Perfil', ''],
  };

  Object.assign(headerByScreen, {
    dashboard: ['Inicio', 'Actualizado · ' + r.label],
    gastos: ['Gastos', 'Repuestos y mano de obra'],
    mas: ['Más', 'Accesos y configuración'],
    alertas: ['Alertas', alerts.length ? alerts.length + ' avisos para revisar' : 'Todo al día'],
    choferes: ['Choferes', choferViews.filter((d) => d.name !== 'Sin chofer').length + ' personas asignadas'],
    ranking: ['Ganancia por vehículo', 'Comparación del período'],
  });

  const isTab = ['dashboard', 'flota', 'gastos', 'mas'].includes(state.screen);
  const isSub = ['detalle', 'nuevoVehiculo', 'registrar', 'reportes', 'alertas', 'choferes', 'perfil'].includes(state.screen);
  const isAssistant = state.screen === 'assistant';

  return {
    screen: state.screen,
    isTab,
    isSub,
    isAssistant,
    headerTitle: headerByScreen[state.screen][0],
    headerSub: headerByScreen[state.screen][1],
    back,
    navDash: () => replaceTab('dashboard'),
    navFlota: () => replaceTab('flota'),
    navGastos: () => replaceTab('gastos'),
    navMas: () => replaceTab('mas'),
    navReportes: goReportes,
    navAlertas: () => push('alertas'),
    navChoferes: () => push('choferes'),
    openNotification,
    tabActive: {
      dash: state.screen === 'dashboard',
      flota: state.screen === 'flota' || state.screen === 'detalle' || state.screen === 'nuevoVehiculo',
      gastos: state.screen === 'gastos',
      mas: ['mas', 'alertas', 'choferes', 'reportes', 'perfil'].includes(state.screen),
    },
    registroChoice: {
      open: state.registroChoice,
      show: () => update({ registroChoice: true }),
      close: () => update({ registroChoice: false }),
      cobro: () => {
        update({ registroChoice: false });
        goRegistrarCobro();
      },
      gasto: () => {
        update({ registroChoice: false });
        goRegistrarGasto();
      },
      service: () => {
        update({ registroChoice: false });
        goRegistrarService();
      },
    },
    openAssistant: () => push('assistant'),
    goDetalle: (carId) => push('detalle', { carId }),
    goNuevoVehiculo: () =>
      push('nuevoVehiculo', { carId: null, nuevoVehiculo: blankNuevoVehiculo(), nuevoVehiculoConfirm: false, nuevoVehiculoGuardando: false }),
    goRegistrarCobro,
    goRegistrarGasto,
    goRegistrarService,
    goPerfil: () => push('perfil', { perfil: { actual: '', nueva: '', repetir: '', guardando: false } }),
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

    gastos: {
      step: state.gastosStep,
      carOptions: gastoCarOptions,
      categoryOptions: gastoCategoryOptions,
      selectedCarLabel: selectedGastoCarLabel,
      selectedCategoryLabel: selectedGastoCategoryLabel,
      back: () => back(),
      carFilters: gastoCarFilters,
      catFilters: gastoCatFilters,
      groups: gastoGroups,
      empty: gastoGroups.length === 0,
      vehicleSelectionValid: state.gastosCarIds === 'todos' || state.gastosCarIds.length > 0,
      continueVehicles: continueGastoVehicles,
    },

    mas: {
      alertCount: alerts.length,
      driverCount: choferViews.filter((d) => d.name !== 'Sin chofer').length,
      navAlertas: () => push('alertas'),
      navChoferes: () => push('choferes'),
      navReportes: goReportes,
      goPerfil: () => push('perfil', { perfil: { actual: '', nueva: '', repetir: '', guardando: false } }),
    },
    alertas: { items: alertViews },
    choferes: { items: choferViews },

    detalle,
    movementDetail: car ? movementDetail : null,
    quotaDetail: car ? quotaDetail : null,

    nuevoVehiculo: {
      editando: state.carId !== null,
      plate: state.nuevoVehiculo.plate,
      model: state.nuevoVehiculo.model,
      year: state.nuevoVehiculo.year,
      gpsTag: state.nuevoVehiculo.gpsTag,
      kilometraje: state.nuevoVehiculo.kilometraje,
      setPlate: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, plate: v } })),
      setModel: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, model: v } })),
      setYear: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, year: v } })),
      setGpsTag: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, gpsTag: v } })),
      setKilometraje: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, kilometraje: v } })),
      lastService: state.nuevoVehiculo.lastService,
      setLastService: (iso) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, lastService: iso } })),
      hoy: isoLocal(TODAY),
      serviceCada: state.nuevoVehiculo.serviceCada,
      setServiceCada: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, serviceCada: v } })),
      unidadOpts: (['dias', 'meses'] as const).map((u) => ({
        label: u === 'dias' ? 'Días' : 'Meses',
        ...chipStyle(state.nuevoVehiculo.serviceUnidad === u),
        pick: () => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, serviceUnidad: u } })),
      })),
      seguroVence: state.nuevoVehiculo.seguroVence,
      setSeguroVence: (iso) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, seguroVence: iso } })),
      seguroNombre: state.nuevoVehiculo.seguroNombre,
      setSeguroNombre: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, seguroNombre: v } })),
      seguroCada: state.nuevoVehiculo.seguroCada,
      setSeguroCada: (v) => update((s) => ({ nuevoVehiculo: { ...s.nuevoVehiculo, seguroCada: v } })),
      // Solo la palabra: el valor guardado siempre son meses (ver NuevoVehiculoForm).
      cadaUnitLabel: 'meses',
      guardar: () => {
        if (!nuevoVehiculoValidar()) return;
        update({ nuevoVehiculoConfirm: true });
      },
      confirm: {
        open: state.nuevoVehiculoConfirm,
        resumen: nuevoVehiculoResumen(),
        guardando: state.nuevoVehiculoGuardando,
        confirmar: () => {
          const v = nuevoVehiculoValidar();
          if (!v) {
            update({ nuevoVehiculoConfirm: false });
            return;
          }
          if (state.carId) {
            persist.patchCar(state.carId, {
              plate: v.payload.plate,
              model: v.payload.model,
              year: v.payload.year,
              gpsTag: v.payload.gpsTag,
              kilometraje: v.payload.kilometraje ?? 0,
              lastServiceDate: v.payload.lastServiceDate ? new Date(v.payload.lastServiceDate + 'T12:00:00') : new Date(0),
              ...(v.payload.serviceCada !== undefined ? { serviceCada: v.payload.serviceCada, serviceUnidad: v.payload.serviceUnidad ?? 'meses' } : {}),
              seguroDate: v.payload.seguroDate ? new Date(v.payload.seguroDate + 'T12:00:00') : new Date(0),
              seguroNombre: v.payload.seguroNombre ?? '',
              seguroCada: v.payload.seguroCada ?? 0,
            });
            toast('Datos del vehículo actualizados · ' + v.plate);
            update({ nuevoVehiculoConfirm: false, nuevoVehiculoGuardando: false });
            back();
            return;
          }
          update({ nuevoVehiculoGuardando: true });
          persist
            .addCar(v.payload)
            .then((creado) => {
              toast('Vehículo agregado · ' + v.plate);
              update({ nuevoVehiculoConfirm: false, nuevoVehiculoGuardando: false });
              push('detalle', { carId: creado.id, backTo: 'flota' });
            })
            .catch((e: Error) => {
              update({ nuevoVehiculoGuardando: false });
              toast('No se pudo agregar: ' + e.message);
            });
        },
        cancelar: () => update({ nuevoVehiculoConfirm: false }),
      },
    },

    registrar: registrarView,

    reportes: {
      step: state.reportesStep,
      include: state.reportesInclude,
      setInclude: reportSetInclude,
      carSelection: state.reportesCarIds,
      carOptions: reportCarOptions,
      selectAllCars: reportSelectAllCars,
      categorySelection: state.reportesCategories,
      categoryOptions: reportCategoryOptions,
      selectAllCategories: reportSelectAllCategories,
      selectedCarLabels: reportSelectedCarLabels,
      selectedCategoryLabels: reportSelectedCategoryLabels,
      previewRows: reportPreviewRows,
      next: reportNext,
      previous: reportPrevious,
      reset: reportReset,
      periodLabel: r.label,
      counts: reportCounts,
      exporting: state.reportesExportando,
      error: state.reportesError,
      exportFile: reportExport,
    },

    ranking: {
      rows: rankRows,
      byAuto: state.rankBy === 'auto',
      setAuto: () => update({ rankBy: 'auto' }),
      setModelo: () => update({ rankBy: 'modelo' }),
      hint: state.rankBy === 'auto' ? 'Ganancia por vehículo en el período' : 'Ganancia total y promedio por modelo',
    },

    estadoSheet: {
      open: state.estadoSheet,
      close: () => update({ estadoSheet: false, tallerForm: null }),
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
            // Mandar a taller no es solo cambiar un estado: hay un gasto detrás y
            // se pregunta por él antes, no después (mismo criterio que admin-web).
            if (k === 'taller' && car.estado !== 'taller') {
              update({ tallerForm: { carId: car.id, razon: '', monto: '', comprobante: null, guardando: false } });
              return;
            }
            persist.patchCar(car.id, { estado: k });
            update({ estadoSheet: false });
            toast('Estado actualizado · ' + label);
          },
        };
      }),
      taller: (() => {
        const t = state.tallerForm;
        if (!t || !car || t.carId !== car.id) return null;
        const editar = (patch: Partial<NonNullable<MobileState['tallerForm']>>) => update((s) => (s.tallerForm ? { tallerForm: { ...s.tallerForm, ...patch } } : {}));
        return {
          plate: car.plate,
          razon: t.razon,
          setRazon: (v: string) => editar({ razon: v }),
          monto: t.monto,
          setMonto: (v: string) => editar({ monto: miles(v) }),
          comprobante: t.comprobante,
          setComprobante: (f: PickedFile | null) => editar({ comprobante: f }),
          guardando: t.guardando,
          cancelar: () => update({ tallerForm: null }),
          guardar: () => {
            if (t.guardando) return;
            const razon = t.razon.trim();
            if (!razon) return toast('Escribí por qué entra a taller');
            const monto = numFromInput(t.monto);
            if (!monto) return toast('Indicá cuánto se gasta en el taller');
            // El botón se bloquea mientras sube: con un comprobante de varios MB
            // hay tiempo de sobra para apretarlo dos veces y duplicar el gasto.
            editar({ guardando: true });
            persist
              .mandarATaller(car.id, { razon, monto, comprobante: t.comprobante })
              .then(() => {
                update({ tallerForm: null, estadoSheet: false });
                toast(car.plate + ' en taller · gasto de ' + fmt(monto) + ' registrado');
              })
              .catch((e: Error) => {
                editar({ guardando: false });
                toast('No se pudo registrar: ' + e.message);
              });
          },
        };
      })(),
    },

    kilometrajeSheet: (() => {
      const sheet = state.kilometrajeSheet;
      const selected = sheet ? carDe.get(sheet.carId) : undefined;
      return {
        open: Boolean(sheet && selected),
        plate: selected?.plate ?? '',
        model: selected?.model ?? '',
        actual: selected?.kilometraje ? miles(String(selected.kilometraje)) + ' km' : 'Sin informar',
        valor: sheet?.valor ?? '',
        setValor: (valor: string) => update((s) => (s.kilometrajeSheet ? { kilometrajeSheet: { ...s.kilometrajeSheet, valor: miles(valor) } } : {})),
        close: () => update({ kilometrajeSheet: null }),
        guardar: () => {
          if (!sheet || !selected) return;
          const kilometraje = numFromInput(sheet.valor);
          if (!kilometraje) return toast('Ingresá el kilometraje');
          if (kilometraje > 10_000_000) return toast('El kilometraje no puede superar 10.000.000 km');
          if (kilometraje < selected.kilometraje) return toast('El kilometraje no puede disminuir');
          persist.patchCar(selected.id, { kilometraje });
          update({ kilometrajeSheet: null });
          toast(selected.plate + ' · kilometraje actualizado a ' + miles(String(kilometraje)) + ' km');
        },
      };
    })(),

    choferSheet: {
      open: state.choferSheet,
      close: () => update({ choferSheet: false, choferCredentials: null, choferCredentialsLoading: false }),
      title: state.choferCredentials ? 'Datos para MiFlota Chofer' : car ? (car.driver === 'Sin chofer' ? 'Asignar chofer' : 'Chofer de ' + car.plate) : '',
      carLabel: car ? car.plate + ' · ' + car.model : '',
      name: state.choferForm.name,
      setName: (v) => update((s) => ({ choferForm: { ...s.choferForm, name: v } })),
      cuota: state.choferForm.cuota,
      setCuota: (v) => update((s) => ({ choferForm: { ...s.choferForm, cuota: miles(v) } })),
      credentials: state.choferCredentials,
      credentialsLoading: state.choferCredentialsLoading,
      needsCredentials: car?.driver !== state.choferForm.name.trim(),
      continuar: () => {
        if (!car || state.choferCredentialsLoading) return;
        const name = state.choferForm.name.trim();
        if (!name) return toast('Ingresá el nombre del chofer');
        const cuota = numFromInput(state.choferForm.cuota);
        if (!cuota) return toast('Ingresá la cuota diaria del chofer');
        if (car.driver === name) return;

        update({ choferCredentialsLoading: true });
        persist
          .previewDriverCredentials(car.id, name)
          .then((credentials) => update({ choferCredentials: credentials, choferCredentialsLoading: false }))
          .catch((e: Error) => {
            update({ choferCredentialsLoading: false });
            toast('No se pudieron generar los datos: ' + e.message);
          });
      },
      volver: () => update({ choferCredentials: null, choferCredentialsLoading: false }),
      guardar: () => {
        if (!car || state.choferCredentialsLoading) return;
        const name = state.choferForm.name.trim();
        if (!name) return toast('Ingresá el nombre del chofer');
        const cuota = numFromInput(state.choferForm.cuota);
        if (!cuota) return toast('Ingresá la cuota diaria del chofer');

        if (car.driver === name) {
          persist.patchCar(car.id, { driver: name, cuota });
          update({ choferSheet: false, choferCredentials: null });
          toast('Chofer actualizado · ' + name);
          return;
        }

        const credentials = state.choferCredentials;
        if (!credentials) return;
        update({ choferCredentialsLoading: true });
        persist
          .assignDriver(car.id, { driver: name, cuota, ...credentials })
          .then(() => {
            update({ choferSheet: false, choferCredentials: null, choferCredentialsLoading: false });
            toast('Chofer asignado · ' + name);
          })
          .catch((e: Error) => {
            update({ choferCredentialsLoading: false });
            toast('No se pudo asignar: ' + e.message);
          });
      },
      hasDriver: car?.driver !== 'Sin chofer',
      desvincular: () => {
        if (!car) return;
        persist.patchCar(car.id, { driver: 'Sin chofer', cuota: 0 });
        update({ choferSheet: false, choferCredentials: null, choferCredentialsLoading: false });
        toast('Chofer desvinculado');
      },
    },

    perfil: {
      actual: state.perfil.actual,
      setActual: (v) => update((s) => ({ perfil: { ...s.perfil, actual: v } })),
      nueva: state.perfil.nueva,
      setNueva: (v) => update((s) => ({ perfil: { ...s.perfil, nueva: v } })),
      repetir: state.perfil.repetir,
      setRepetir: (v) => update((s) => ({ perfil: { ...s.perfil, repetir: v } })),
      guardando: state.perfil.guardando,
      guardar: () => {
        const p = state.perfil;
        if (p.guardando) return;
        if (!p.actual) return toast('Ingresá tu contraseña actual');
        if (p.nueva.length < 12) return toast('La contraseña nueva debe tener al menos 12 caracteres');
        if (p.nueva !== p.repetir) return toast('La contraseña nueva no coincide en los dos campos');
        update((s) => ({ perfil: { ...s.perfil, guardando: true } }));
        cambiarPassword(p.actual, p.nueva)
          .then(() => {
            update({ perfil: { actual: '', nueva: '', repetir: '', guardando: false } });
            toast('Contraseña actualizada');
          })
          .catch((e: Error) => {
            update((s) => ({ perfil: { ...s.perfil, guardando: false } }));
            toast('No se pudo cambiar: ' + e.message);
          });
      },
    },

    toast: state.toast,
  };
}
