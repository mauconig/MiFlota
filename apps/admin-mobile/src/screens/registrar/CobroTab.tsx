import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';
import { useSelectSheet } from '../../components/SelectSheet';

export function CobroTab({ r }: { r: NonNullable<NonNullable<MobileView['registrar']>['cobro']> }) {
  const current = r.opciones.find((o) => o.id === r.driver);
  const select = useSelectSheet('Elegí un chofer', r.opciones, r.setDriver);
  return (
    <>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
        <Pressable onPress={select.open} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}>
          <Text style={{ width: 70, fontSize: 13, fontWeight: '600' }}>Chofer</Text>
          <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, color: current ? '#3d3a34' : '#b3aa99' }} numberOfLines={1}>
            {current ? current.label : 'Elegí un chofer'}
          </Text>
        </Pressable>
      </View>
      {select.sheet}
      <View style={{ gap: 7 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Tipo</Text>
        <ChipRow chips={r.tipoOpts} equal />
      </View>
      <Text style={{ fontSize: 12, color: '#6b665c', paddingHorizontal: 4, lineHeight: 17 }}>{r.destino}</Text>
    </>
  );
}
