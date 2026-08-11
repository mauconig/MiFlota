import { useCallback, useRef, useState } from 'react';
import type { UIState } from './types';
import type { Sesion } from './api';
import { useAuth, useFleetStore } from './api';
import { Login } from './components/Login';
import { useFleetView, blankCar, blankDrv } from './useFleetView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Resumen } from './screens/Resumen';
import { Flota } from './screens/Flota';
import { Choferes } from './screens/Choferes';
import { Alertas } from './screens/Alertas';
import { Reportes } from './screens/Reportes';
import { Cobros } from './screens/Cobros';
import { DetailDrawer } from './components/DetailDrawer';
import { DriverDetail } from './components/DriverDetail';
import { Confirm } from './components/Confirm';
import { TallerModal } from './components/TallerModal';
import { CarModal } from './components/CarModal';
import { DriverModal } from './components/DriverModal';
import { PagoModal } from './components/PagoModal';
import { Toast } from './components/Toast';

const initialState: UIState = {
  period: 'mes',
  filter: 'todos',
  sortK: 'net',
  sortDir: -1,
  hide: false,
  nav: 'resumen',
  toast: '',
  cFrom: '2026-08-01',
  cTo: '2026-08-28',
  movType: 'todos',
  movCat: 'todas',
  alertKind: 'todas',
  pendKind: 'todas',
  chKind: 'todas',
  carQ: '',
  chQ: '',
  alertQ: '',
  pendQ: '',
  movQ: '',
  modal: null,
  ncar: blankCar(),
  ndrv: blankDrv(),
  detailId: null,
  svcEdit: null,
  taller: null,
  cobrosTab: 'cuotas',
  npago: null,
  driverId: null,
  confirm: null,
};

function App() {
  const auth = useAuth();
  if (auth.cargando) return <Arranque error="" />;
  if (!auth.sesion) return <Login onEntrar={auth.entrar} />;
  // La key remonta todo el panel al cambiar de usuario, así que no queda estado
  // de la sesión anterior colgando.
  return <Panel key={auth.sesion.usuario} sesion={auth.sesion} onSalir={auth.salir} />;
}

function Panel({ sesion, onSalir }: { sesion: Sesion; onSalir: () => void }) {
  const [state, setState] = useState<UIState>(initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  };

  // El store necesita avisar de fallos de guardado antes de que exista la vista,
  // así que escribe el toast directamente en el estado de UI.
  const avisar = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setState((s) => ({ ...s, toast: msg }));
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: '' })), 3600);
  }, []);

  const store = useFleetStore(avisar, onSalir);
  const v = useFleetView(store.cars, store.movs, store.pagos, state, update, store);

  if (store.cargando || store.error) return <Arranque error={store.error} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '236px 1fr', height: '100vh', width: '100%', background: '#f4f0e8', position: 'relative', overflow: 'hidden' }}>
      <Sidebar navItems={v.navItems} cierreMsg={v.cierreMsg} nombre={sesion.nombre} totalVehiculos={store.cars.length} onSalir={onSalir} />

      <main style={{ padding: '14px 22px 16px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, height: '100%', overflowY: 'auto' }}>
        <Header
          kicker={v.kicker}
          pageTitle={v.pageTitle}
          headerSub={v.headerSub}
          periodChips={v.periodChips}
          isCustom={v.isCustom}
          cFrom={v.cFrom}
          cTo={v.cTo}
          onFrom={v.onFrom}
          onTo={v.onTo}
          montosLbl={v.montosLbl}
          toggleMontos={v.toggleMontos}
        />

        {v.sResumen && <Resumen v={v} />}
        {v.sFlota && <Flota v={v} />}
        {v.sChoferes && <Choferes v={v} />}
        {v.sAlertas && <Alertas v={v} />}
        {v.sReportes && <Reportes v={v} />}
        {v.sCobros && <Cobros v={v} />}
      </main>

      <DetailDrawer v={v} />
      <DriverDetail v={v} />
      <Confirm v={v} />
      <TallerModal v={v} />
      <CarModal v={v} />
      <DriverModal v={v} />
      <PagoModal v={v} />
      <Toast v={v} />
    </div>
  );
}

function Arranque({ error }: { error: string }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f0e8', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{error ? 'No se pudo cargar la flota' : 'Cargando la flota…'}</div>
        {error && (
          <>
            <div style={{ fontSize: 13, color: '#6b665c' }}>{error}</div>
            <div style={{ fontSize: 12, color: '#a09a8d' }}>Revisá que el servidor esté corriendo y volvé a intentar.</div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
