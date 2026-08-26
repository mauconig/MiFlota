import { Pressable, Text } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function RegistroChoiceSheet({ v }: { v: MobileView }) {
  const choice = v.registroChoice;
  return <BottomSheet title="¿Qué querés registrar?" onClose={choice.close}>
    <Pressable onPress={choice.cobro} style={{ minHeight: 76, borderRadius: 18, backgroundColor: '#e7f2ec', borderWidth: 1, borderColor: '#cfe4d7', padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#256b4d' }}>Registrar ingreso</Text>
      <Text style={{ fontSize: 12, color: '#4f6b5b', marginTop: 4 }}>Cargar dinero recibido por un auto</Text>
    </Pressable>
    <Pressable onPress={choice.gasto} style={{ minHeight: 76, borderRadius: 18, backgroundColor: '#fdf0dd', borderWidth: 1, borderColor: '#f1dfbf', padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#9a6a12' }}>Registrar egreso</Text>
      <Text style={{ fontSize: 12, color: '#80642f', marginTop: 4 }}>Cargar un gasto de un auto</Text>
    </Pressable>
    <Pressable onPress={choice.service} style={{ minHeight: 76, borderRadius: 18, backgroundColor: '#eef0f8', borderWidth: 1, borderColor: '#d9ddeb', padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#4d587e' }}>Registrar service</Text>
      <Text style={{ fontSize: 12, color: '#626b8d', marginTop: 4 }}>Guardar mantenimiento y actualizar el vehículo</Text>
    </Pressable>
  </BottomSheet>;
}
