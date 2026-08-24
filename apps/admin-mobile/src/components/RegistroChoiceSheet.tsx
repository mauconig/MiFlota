import { Pressable, Text } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function RegistroChoiceSheet({ v }: { v: MobileView }) {
  const choice = v.registroChoice;
  return <BottomSheet title="¿Qué querés registrar?" onClose={choice.close}>
    <Pressable onPress={choice.cobro} style={{ minHeight: 76, borderRadius: 18, backgroundColor: '#e7f2ec', borderWidth: 1, borderColor: '#cfe4d7', padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#256b4d' }}>Registrar cobro</Text>
      <Text style={{ fontSize: 12, color: '#4f6b5b', marginTop: 4 }}>Cargar un pago recibido de un chofer</Text>
    </Pressable>
    <Pressable onPress={choice.gasto} style={{ minHeight: 76, borderRadius: 18, backgroundColor: '#fdf0dd', borderWidth: 1, borderColor: '#f1dfbf', padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#9a6a12' }}>Registrar gasto</Text>
      <Text style={{ fontSize: 12, color: '#80642f', marginTop: 4 }}>Cargar repuestos, mano de obra y comprobante</Text>
    </Pressable>
  </BottomSheet>;
}
