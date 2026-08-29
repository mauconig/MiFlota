import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState } from 'react-native';
// El `SafeAreaView` que trae 'react-native' es un no-op en Android (solo
// funciona en iOS) — con ese, el header queda debajo de la barra de estado.
// Este es el que respeta el inset en las dos plataformas.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useFleetStore, type FleetStore } from '../api';
import { Login } from '../screens/Login';
import { Shell } from '../components/Shell';
import { useMobileView, initialMobileState } from '../useMobileView';
import type { AdminNotificationRoute, MobileState } from '../types';
import { registerAdminPushNotifications, subscribeAdminNotificationResponses } from '../notifications';

const Spinner = () => (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e8', alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color="#16150f" />
  </SafeAreaView>
);

export default function App() {
  const auth = useAuth();
  const [state, setState] = useState<MobileState>(initialMobileState);
  const [pendingNotification, setPendingNotification] = useState<AdminNotificationRoute | null>(null);
  const update = useCallback((patch: Partial<MobileState> | ((s: MobileState) => Partial<MobileState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);
  const onError = useCallback((msg: string) => update({ toast: msg }), [update]);
  useEffect(() => subscribeAdminNotificationResponses(setPendingNotification), []);
  useEffect(() => {
    if (!auth.sesion) return;
    void registerAdminPushNotifications().catch(() => {});
  }, [auth.sesion]);
  // Si el servidor dice que la sesión ya no vale, `auth.salir` limpia el
  // estado local (el POST /api/logout que dispara es inofensivo aunque la
  // sesión ya esté vencida del otro lado).
  const store = useFleetStore(onError, auth.salir, !!auth.sesion);

  useEffect(() => {
    if (!auth.sesion) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void store.refresh().catch(() => {});
    });
    return () => subscription.remove();
  }, [auth.sesion, store.refresh]);

  if (auth.cargando) return <Spinner />;
  if (!auth.sesion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e8' }}>
        <Login onEntrar={auth.entrar} onBiometria={auth.biometriaBloqueada ? auth.reintentarBiometria : undefined} />
      </SafeAreaView>
    );
  }

return <AuthedApp sesion={auth.sesion} onLogout={auth.salir} cambiarPassword={auth.cambiarPassword} state={state} update={update} store={store} pendingNotification={pendingNotification} onNotificationHandled={() => setPendingNotification(null)} />;
}

function AuthedApp({
  sesion,
  onLogout,
  cambiarPassword,
  state,
  update,
  store,
  pendingNotification,
  onNotificationHandled,
}: {
  sesion: { usuario: string; nombre: string };
  onLogout: () => void | Promise<void>;
  cambiarPassword: (actual: string, nueva: string) => Promise<void>;
  state: MobileState;
  update: (patch: Partial<MobileState> | ((s: MobileState) => Partial<MobileState>)) => void;
  store: FleetStore;
  pendingNotification: AdminNotificationRoute | null;
  onNotificationHandled: () => void;
}) {
  const v = useMobileView(store.cars, store.movs, store.pagos, store.reportes, store.locations, state, update, store, cambiarPassword);
  useEffect(() => {
    if (!pendingNotification || store.cargando) return;
    const route = pendingNotification;
    onNotificationHandled();
    if (route.kind === 'report') {
      void store.refresh().catch(() => {}).then(() => v.openNotification(route));
      return;
    }
    v.openNotification(route);
  }, [pendingNotification, store.cargando, store.refresh, store, v.openNotification, v, onNotificationHandled]);
  if (store.cargando) return <Spinner />;
  return (
    // Sin el borde "bottom": ese inset lo absorbe BottomNav (su fondo tiene
    // que llegar hasta el borde real de la pantalla), no un padding en blanco
    // acá arriba de él — si los dos lo reservaran, quedaba un hueco doble.
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e8' }} edges={['top', 'left', 'right']}>
      <Shell v={v} nombre={sesion.nombre} usuario={sesion.usuario} onLogout={onLogout} onRefresh={() => void store.refresh().catch(() => {})} refreshing={store.refrescando} syncError={store.error} />
    </SafeAreaView>
  );
}
