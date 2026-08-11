export type Estado = 'activo' | 'taller' | 'baja';
export type ServiceUnidad = 'dias' | 'meses';
/** Cada cuánto se paga el seguro, que no es lo mismo que cada cuánto se renueva
    la póliza: se puede pagar por mes y renovar una vez al año. */
export type SeguroPeriodo = 'mensual' | 'anual';

export interface Car {
  id: string;
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  estado: Estado;
  /** Identificador del equipo de rastreo instalado. Vacío = sin GPS. */
  gpsTag: string;
  /** Cada cuánto toca el service, en la unidad de `serviceUnidad`. */
  serviceCada: number;
  serviceUnidad: ServiceUnidad;
  lastServiceDate: Date;
  /** Vencimiento como fecha, no como días restantes: un contador queda
      desactualizado apenas pasa un día en la base. */
  seguroDate: Date;
  /** Costo de la póliza en guaraníes, en la periodicidad de `seguroPeriodo`. */
  seguroCosto: number;
  seguroPeriodo: SeguroPeriodo;
  /** Meses entre renovaciones de la póliza. */
  seguroCada: number;
}

export type MovEstado = 'pagado' | 'pendiente' | 'parcial';

export interface Mov {
  id: number;
  carId: string;
  type: 'ingreso' | 'egreso';
  /** Lo facturado: en un ingreso, la cuota emitida, se haya cobrado o no.
      Cuánto se cobró de ella no se guarda: sale de imputar los pagos
      (ver `imputar` en cobranza.ts). */
  amount: number;
  date: Date;
  desc: string;
  cat?: string;
  estado?: MovEstado;
  /** Chofer al que corresponde este cobro. Ausente en los egresos, y en
      ingresos viejos anteriores a este campo: ahí el chofer actual del auto
      hace de valor por defecto. Si el auto cambia de chofer, los cobros ya
      registrados no cambian de dueño — quedan con quien los generó. */
  driver?: string;
  /** Adjunto del gasto. El archivo se pide por `/api/comprobantes/:id`. */
  comprobante?: { id: string; nombre: string; tipo: string };
}

/** `pago` es plata que entró; `ajuste` cancela deuda sin caja (condonación).
    Los dos bajan lo que el chofer debe, pero solo el primero es ingreso. */
export type PagoTipo = 'pago' | 'ajuste';

/**
 * Plata a favor del chofer, con su fecha real. No apunta a una cuota concreta:
 * se imputa a lo que debe, de lo más viejo a lo más nuevo, al momento de leer.
 */
export interface Pago {
  id: number;
  /** Auto en el que andaba al pagar. Referencia nomás: la deuda es del chofer
      y lo sigue aunque cambie de vehículo. */
  carId: string | null;
  driver: string;
  fecha: Date;
  monto: number;
  tipo: PagoTipo;
  medio?: string;
  nota?: string;
}

export type Nav = 'resumen' | 'flota' | 'choferes' | 'alertas' | 'reportes' | 'cobros';
export type Period = 'semana' | 'mes' | 'jul' | 'd90' | 'custom';
export type FleetFilter = 'todos' | 'activo' | 'taller' | 'baja';
export type MovType = 'todos' | 'ingreso' | 'egreso';
export type ModalKind = 'car' | 'drv' | null;

export interface NewCarForm {
  plate: string;
  model: string;
  year: string;
  gpsTag: string;
  /** ISO `YYYY-MM-DD`, tal como lo emite un <input type="date">. */
  lastService: string;
  serviceCada: string;
  serviceUnidad: ServiceUnidad;
  /** ISO `YYYY-MM-DD`: cuándo vence la póliza vigente. */
  seguroVence: string;
  seguroCosto: string;
  seguroPeriodo: SeguroPeriodo;
  seguroCada: string;
}

export interface NewDriverForm {
  name: string;
  carId: string;
  cuota: string;
}

export interface UIState {
  period: Period;
  filter: FleetFilter;
  sortK: string;
  sortDir: 1 | -1;
  hide: boolean;
  nav: Nav;
  toast: string;
  cFrom: string;
  cTo: string;
  movType: MovType;
  movCat: string;
  alertKind: string;
  pendKind: string;
  carQ: string;
  chQ: string;
  alertQ: string;
  pendQ: string;
  movQ: string;
  modal: ModalKind;
  ncar: NewCarForm;
  ndrv: NewDriverForm;
  detailId: string | null;
  /** Intervalo de service que se está editando en la ficha, sin guardar todavía.
      Lleva el id del vehículo para que abrir otro no arrastre el borrador. */
  svcEdit: { carId: string; cada: string; unidad: ServiceUnidad } | null;
  /** Entrada a taller a medio cargar. Null = el modal está cerrado. */
  taller: { carId: string; razon: string; monto: string; archivo: File | null; guardando: boolean } | null;
  /** Qué mira la pantalla de Cobros: las cuotas emitidas o el libro de pagos. */
  cobrosTab: 'cuotas' | 'pagos';
  /** Pago a medio cargar. Null = el modal está cerrado. */
  npago: { driver: string; fecha: string; monto: string; tipo: PagoTipo; nota: string; guardando: boolean } | null;
  /** Acción destructiva esperando confirmación. */
  confirm: { tipo: 'borrarAuto' | 'quitarChofer'; carId: string } | null;
  /** Id del vehículo cuyo chofer se está viendo en detalle. */
  driverId: string | null;
}
