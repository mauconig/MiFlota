import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function KilometrajeSheet({ v }: { v: MobileView }) {
  const s = v.kilometrajeSheet;

  if (!s.open) return null;
  return (
    <BottomSheet title={'Kilometraje · ' + s.plate} onClose={s.close}>
      <Text style={{ fontSize: 13, color: '#6b665c' }}>{s.model}</Text>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
          <Text style={{ width: 112, fontSize: 13, fontWeight: '600', color: '#3d3a34' }}>Actual</Text>
          <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#6b665c' }}>{s.actual}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 }}>
          <Text style={{ width: 112, fontSize: 13, fontWeight: '600', color: '#3d3a34' }}>Nuevo kilometraje</Text>
          <TextInput
            value={s.valor}
            onChangeText={s.setValor}
            keyboardType="numeric"
            placeholder="120.000"
            placeholderTextColor="#a39a8b"
            style={{ flex: 1, textAlign: 'right', fontSize: 17, color: '#16150f', padding: 0 }}
          />
          <Text style={{ fontSize: 13, color: '#6b665c' }}>km</Text>
        </View>
      </View>
      <Pressable onPress={s.guardar} style={{ minHeight: 48, borderRadius: 18, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Guardar kilometraje</Text>
      </Pressable>
      <Pressable onPress={s.close} style={{ minHeight: 44, borderRadius: 18, borderWidth: 1, borderColor: '#e0d6c4', backgroundColor: '#fffdf8', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#3d3a34', fontSize: 13, fontWeight: '600' }}>Cancelar</Text>
      </Pressable>
    </BottomSheet>
  );
}
