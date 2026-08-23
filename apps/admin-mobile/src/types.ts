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
  /** Identidad estable del chofer (id de la fila en `drivers`). Null = sin chofer. */
  driverId?: string | number | null;
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
  /** Identidad estable del chofer (id de `drivers`). Null = sin chofer. */
  driverId?: number | null;
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
  /** Identidad estable del chofer (id de `drivers`). Null si no se pudo resolver. */
  driverId?: number | null;
  fecha: Date;
  monto: number;
  tipo: PagoTipo;
  medio?: string;
  nota?: string;
}

// ---------------------------------------------------------------------------
// Estado de UI propio de admin-mobile. La app es una pila de pantallas sobre
// un frame de teléfono, no un dashboard de pestañas siempre montadas como
// admin-web, así que este estado no se parece al `UIState` de ahí.

export type Screen = 'dashboard' | 'flota' | 'detalle' | 'nuevoVehiculo' | 'registrar' | 'reportes' | 'ranking' | 'assistant' | 'perfil';
export type Period = 'semana' | 'mes' | 'jul' | 'd90' | 'custom';
export type RegistrarTab = 'cobro' | 'gasto';

export interface NuevoVehiculoForm {
  plate: string;
  model: string;
  year: string;
  gpsTag: string;
  lastService: string;
  serviceCada: string;
  serviceUnidad: ServiceUnidad;
  seguroVence: string;
  seguroCosto: string;
  seguroPeriodo: SeguroPeriodo;
  seguroCada: string;
}

export interface ChoferForm {
  name: string;
  cuota: string;
}

export interface DriverCredentialDraft {
  username: string;
  password: string;
}

export interface RegistrarForm {
  tab: RegistrarTab;
  /** Auto de contexto: fijo si se abrió desde la ficha de un vehículo, editable
      si se abrió desde el FAB del dashboard sin auto en contexto. */
  carId: string;
  digits: string;
  fecha: string;
  nota: string;
  /** Solo Cobro. */
  driver: string;
  tipo: PagoTipo;
  /** Solo Gasto. */
  cat: string;
  comprobante: PickedFile | null;
  guardando: boolean;
}

export type FleetFilter = 'todos' | 'activo' | 'taller' | 'alerta';
export type RankBy = 'auto' | 'modelo';

/** Archivo elegido con expo-document-picker: no hay `File` del browser en
 *  React Native, así que el comprobante viaja como URI + metadata. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

/** Mandar a taller no es solo cambiar el estado: hay un gasto detrás que se
 *  pregunta antes, no después (ver `mandarATaller` en api.ts). */
export interface TallerForm {
  carId: string;
  razon: string;
  monto: string;
  comprobante: PickedFile | null;
  guardando: boolean;
}

export interface MobileState {
  screen: Screen;
  backTo: Screen;
  carId: string | null;
  period: Period;
  cFrom: string;
  cTo: string;
  periodSheet: boolean;
  estadoSheet: boolean;
  tallerForm: TallerForm | null;
  choferSheet: boolean;
  choferForm: ChoferForm;
  choferCredentials: DriverCredentialDraft | null;
  choferCredentialsLoading: boolean;
  nuevoVehiculo: NuevoVehiculoForm;
  /** true = ya se validó el formulario y se está mostrando el resumen para
   *  confirmar antes de mandarlo al servidor. */
  nuevoVehiculoConfirm: boolean;
  nuevoVehiculoGuardando: boolean;
  registrar: RegistrarForm | null;
  toast: string;
  fleetFilter: FleetFilter;
  rankBy: RankBy;
  /** Formulario de cambio de contraseña de la pantalla Perfil. */
  perfil: PerfilForm;
}

export interface PerfilForm {
  actual: string;
  nueva: string;
  repetir: string;
  guardando: boolean;
}
