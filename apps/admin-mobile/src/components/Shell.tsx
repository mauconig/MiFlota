import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { TabHeader, SubHeader } from './Header';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';
import { PeriodoSheet } from './PeriodoSheet';
import { EstadoSheet } from './EstadoSheet';
import { ChoferSheet } from './ChoferSheet';
import { Dashboard } from '../screens/Dashboard';
import { Flota } from '../screens/Flota';
import { Detalle } from '../screens/Detalle';
import { NuevoVehiculo } from '../screens/NuevoVehiculo';
import { Registrar } from '../screens/registrar/Registrar';
import { Reportes } from '../screens/Reportes';
import { Ranking } from '../screens/Ranking';
import { Assistant } from '../screens/Assistant';

export function Shell({ v, nombre, onLogout }: { v: MobileView; nombre: string; onLogout: () => void }) {
  return (
    // BottomNav queda AFUERA del KeyboardAvoidingView a propósito: si quedara
    // adentro, cualquier hueco en que se trabe el padding del teclado (pasó
    // en un dispositivo real al volver atrás con el teclado todavía abierto)
    // se lo llevaba puesto a él también. Afuera, ninguna animación de teclado
    // lo puede mover — solo el contenido de arriba se corre para el teclado.
    <View style={{ flex: 1, backgroundColor: '#f4f0e8' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {v.isTab && <TabHeader title={v.headerTitle} sub={v.headerSub} onAssistant={v.openAssistant} onProfile={onLogout} nombre={nombre} />}
        {v.isSub && <SubHeader title={v.headerTitle} onBack={v.back} />}
        {v.isAssistant && <SubHeader title={v.headerTitle} onBack={v.back} />}

        {v.isAssistant ? (
          // El chat necesita su propio scroll para que los mensajes y el
          // compositor se acomoden bien al teclado.
          <Assistant onSinSesion={onLogout} />
        ) : (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {v.screen === 'dashboard' && <Dashboard v={v} />}
            {v.screen === 'flota' && <Flota v={v} />}
            {v.screen === 'detalle' && <Detalle v={v} />}
            {v.screen === 'nuevoVehiculo' && <NuevoVehiculo v={v} />}
            {v.screen === 'registrar' && <Registrar v={v} />}
            {v.screen === 'reportes' && <Reportes v={v} />}
            {v.screen === 'ranking' && <Ranking v={v} />}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <View style={{ position: 'relative' }}>
        {v.period.open && <PeriodoSheet v={v} />}
        {v.estadoSheet.open && <EstadoSheet v={v} />}
        {v.choferSheet.open && <ChoferSheet v={v} />}
        <Toast msg={v.toast} />
        <BottomNav v={v} />
      </View>
    </View>
  );
}
