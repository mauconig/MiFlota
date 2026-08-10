export type Estado = 'activo' | 'taller' | 'baja';
export type ServiceUnidad = 'dias' | 'meses';

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
  /** Vencimientos como fecha, no como días restantes: un contador queda
      desactualizado apenas pasa un día en la base. */
  vtvDate: Date;
  seguroDate: Date;
}

export type MovEstado = 'pagado' | 'pendiente' | 'parcial';

export interface Mov {
  id: number;
  carId: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  date: Date;
  desc: string;
  cat?: string;
  estado?: MovEstado;
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
  driver: string;
  cuota: string;
  gpsTag: string;
  /** ISO `YYYY-MM-DD`, tal como lo emite un <input type="date">. */
  lastService: string;
  serviceCada: string;
  serviceUnidad: ServiceUnidad;
}

export interface NewDriverForm {
  name: string;
  carId: string;
  cuota: string;
}

export interface UIState {
  period: Period;
  filter: FleetFilter;
  brand: string;
  sortK: string;
  sortDir: 1 | -1;
  hide: boolean;
  nav: Nav;
  toast: string;
  cFrom: string;
  cTo: string;
  movType: MovType;
  movCat: string;
  modal: ModalKind;
  ncar: NewCarForm;
  ndrv: NewDriverForm;
  detailId: string | null;
  /** Id del vehículo cuyo chofer se está viendo en detalle. */
  driverId: string | null;
}
