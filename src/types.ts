export type Estado = 'activo' | 'taller' | 'baja';

export interface Car {
  id: string;
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  estado: Estado;
  km: number;
  /** Cada cuántos meses toca el service. */
  serviceCadaMeses: number;
  lastServiceDate: Date;
  vtvIn: number;
  seguroIn: number;
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
  km: string;
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
  movPage: number;
  modal: ModalKind;
  ncar: NewCarForm;
  ndrv: NewDriverForm;
  detailId: string | null;
}
