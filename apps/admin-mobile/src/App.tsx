import { useCallback, useRef, useState } from 'react';
import type { MobileState } from './types';
import { useAuth, useFleetStore } from './api';
import { initialMobileState, useMobileView } from './useMobileView';
import { Login } from './screens/Login';
import { Shell } from './components/Shell';

function App() {
  const auth = useAuth();
  if (auth.cargando) return <Arranque error="" />;
  if (!auth.sesion) return <Login onEntrar={auth.entrar} />;
  // La key remonta todo al cambiar de usuario, así que no queda estado de la
  // sesión anterior colgando (mismo patrón que admin-web).
  return <Panel key={auth.sesion.usuario} nombre={auth.sesion.nombre} onSalir={auth.salir} />;
}

function Panel({ nombre, onSalir }: { nombre: string; onSalir: () => void }) {
  const [state, setState] = useState<MobileState>(initialMobileState());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (patch: Partial<MobileState> | ((s: MobileState) => Partial<MobileState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  };

  const avisar = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setState((s) => ({ ...s, toast: msg }));
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: '' })), 3600);
  }, []);

  const store = useFleetStore(avisar, onSalir);
  const v = useMobileView(store.cars, store.movs, store.pagos, state, update, store);

  if (store.cargando || store.error) return <Arranque error={store.error} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '0', background: '#8f8f8c' }}>
      <div style={{ width: '100%', maxWidth: 480, minHeight: '100vh', background: '#f4f0e8', boxShadow: '0 0 40px rgba(0,0,0,0.15)' }}>
        <Shell v={v} nombre={nombre} />
      </div>
    </div>
  );
}

function Arranque({ error }: { error: string }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f0e8', padding: 24 }}>
      <div style={{ maxWidth: 320, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{error ? 'No se pudo cargar la flota' : 'Cargando…'}</div>
        {error && (
          <>
            <div style={{ fontSize: 13, color: '#6b665c' }}>{error}</div>
            <div style={{ fontSize: 12, color: '#a09a8d' }}>Revisá tu conexión y volvé a intentar.</div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
