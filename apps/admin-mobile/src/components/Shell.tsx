import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { MobileView } from '../useMobileView';
import { TabHeader, SubHeader } from './Header';
import { BottomNav } from './BottomNav';
import { Toast } from './Toast';
import { PeriodoSheet } from './PeriodoSheet';
import { EstadoSheet } from './EstadoSheet';
import { ChoferSheet } from './ChoferSheet';
import { RegistroChoiceSheet } from './RegistroChoiceSheet';
import { Dashboard } from '../screens/Dashboard';
import { Flota } from '../screens/Flota';
import { Detalle } from '../screens/Detalle';
import { NuevoVehiculo } from '../screens/NuevoVehiculo';
import { Registrar } from '../screens/registrar/Registrar';
import { Reportes } from '../screens/Reportes';
import { Gastos } from '../screens/Gastos';
import { Mas } from '../screens/Mas';
import { Alertas } from '../screens/Alertas';
import { Choferes } from '../screens/Choferes';
import { Ranking } from '../screens/Ranking';
import { Assistant } from '../screens/Assistant';
import { Perfil } from '../screens/Perfil';

export function Shell({ v, nombre, usuario, onLogout }: { v: MobileView; nombre: string; usuario: string; onLogout: () => void }) {
  return (
    // BottomNav queda AFUERA del KeyboardAvoidingView a propósito: si quedara
    // adentro, cualquier hueco en que se trabe el padding del teclado (pasó
    // en un dispositivo real al volver atrás con el teclado todavía abierto)
    // se lo llevaba puesto a él también. Afuera, ninguna animación de teclado
    // lo puede mover — solo el contenido de arriba se corre para el teclado.
    <View style={{ flex: 1, backgroundColor: '#f4f0e8' }}>
      <View style={{ flex: 1 }}>
        {v.isTab && <TabHeader title={v.headerTitle} sub={v.headerSub} onAssistant={v.openAssistant} onProfile={v.goPerfil} nombre={nombre} />}
        {v.isSub && <SubHeader title={v.headerTitle} onBack={v.back} />}
        {v.isAssistant && <SubHeader title={v.headerTitle} onBack={v.back} />}

        {v.isAssistant ? (
          // El chat necesita su propio scroll para que los mensajes y el
          // compositor se acomoden bien al teclado.
          <Assistant onSinSesion={onLogout} onOpenCar={v.goDetalle} />
        ) : v.screen === 'reportes' ? (
          <View style={{ flex: 1, minHeight: 0 }}>
            <Reportes v={v} />
          </View>
        ) : (
          <KeyboardAwareScrollView style={{ flex: 1 }} bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {v.screen === 'dashboard' && <Dashboard v={v} />}
            {v.screen === 'flota' && <Flota v={v} />}
            {v.screen === 'gastos' && <Gastos v={v} />}
            {v.screen === 'mas' && <Mas v={v} />}
            {v.screen === 'alertas' && <Alertas v={v} />}
            {v.screen === 'choferes' && <Choferes v={v} />}
            {v.screen === 'detalle' && <Detalle v={v} />}
            {v.screen === 'nuevoVehiculo' && <NuevoVehiculo v={v} />}
            {v.screen === 'registrar' && <Registrar v={v} />}
            {v.screen === 'ranking' && <Ranking v={v} />}
            {v.screen === 'perfil' && <Perfil v={v} nombre={nombre} usuario={usuario} onLogout={onLogout} />}
          </KeyboardAwareScrollView>
        )}
      </View>

      <View style={{ position: 'relative' }}>
        {v.period.open && <PeriodoSheet v={v} />}
        {v.estadoSheet.open && <EstadoSheet v={v} />}
        {v.choferSheet.open && <ChoferSheet v={v} />}
        {v.registroChoice.open && <RegistroChoiceSheet v={v} />}
        <Toast msg={v.toast} />
        {v.screen !== 'registrar' && <BottomNav v={v} />}
      </View>
    </View>
  );
}
