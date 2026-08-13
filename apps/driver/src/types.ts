export interface Car {
  plate: string;
  model: string;
  year: number;
}

export interface Me {
  driver: string;
  cuota: number;
  car: Car;
}

export type EstadoCuenta = 'atrasado' | 'adelantado' | 'al_dia';

export interface Resumen {
  estado: EstadoCuenta;
  deuda: number;
  aFavor: number;
  cuota: number;
  atrasadoDesde: string | null;
  diasPagados: number;
  diasTranscurridos: number;
  cobradoMes: number;
}

export interface Comprobante {
  id: string;
  nombre: string;
  tipo: string;
}

export interface Pago {
  id: number;
  carId: string | null;
  driver: string;
  fecha: string;
  monto: number;
  tipo: 'pago' | 'ajuste';
  medio?: string;
  nota?: string;
  comprobante?: Comprobante;
}

export type Urgencia = 'puedo' | 'urgente';
export type EstadoReporte = 'enviada' | 'vista' | 'en_taller' | 'resuelta';

export interface Reporte {
  id: number;
  carId: string;
  driver: string;
  cat: string;
  urgencia: Urgencia;
  texto: string;
  estado: EstadoReporte;
  fecha: string;
}

export const CATS_REPORTE = ['Frenos', 'Motor', 'Neumáticos', 'Aire acondicionado', 'Documentos', 'Otro'];
export const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Giros Tigo'];
