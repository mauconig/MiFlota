import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';
import { CarCard } from '../components/CarCard';

export function Flota({ v }: { v: MobileView }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}>
      <ChipRow chips={v.flota.filters} />
      <Pressable
        onPress={v.goNuevoVehiculo}
        style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#d8cdb8', backgroundColor: '#fbf7ee', borderRadius: 20, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
      >
        <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#3d3a34" strokeWidth={2} strokeLinecap="round">
          <Path d="M5 12h14" />
          <Path d="M12 5v14" />
        </Svg>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#3d3a34' }}>Agregar vehículo</Text>
      </Pressable>
      {v.flota.cars.length === 0 && <Text style={{ paddingVertical: 30, textAlign: 'center', fontSize: 13, color: '#6b665c' }}>Ningún vehículo coincide</Text>}
      {v.flota.cars.map((c) => (
        <CarCard key={c.id} c={c} periodShort={v.period.short} />
      ))}
    </View>
  );
}
