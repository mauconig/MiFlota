import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function ChoferSheet({ v }: { v: MobileView }) {
  const s = v.choferSheet;
  return (
    <BottomSheet title={s.title} onClose={s.close}>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
          <Text style={{ width: 104, fontSize: 13, fontWeight: '600' }}>Nombre</Text>
          <TextInput value={s.name} onChangeText={s.setName} placeholder="Nombre y apellido" style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Text style={{ width: 104, fontSize: 13, fontWeight: '600' }}>Cuota diaria</Text>
          <TextInput
            keyboardType="numeric"
            value={s.cuota}
            onChangeText={s.setCuota}
            placeholder="190.000"
            style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }}
          />
        </View>
      </View>
      <Pressable onPress={s.guardar} style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Guardar chofer</Text>
      </Pressable>
      {s.hasDriver && (
        <Pressable onPress={s.desvincular} style={{ borderWidth: 1, borderColor: '#f0d8cf', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#a8412f', fontSize: 13, fontWeight: '600' }}>Desvincular chofer</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}
