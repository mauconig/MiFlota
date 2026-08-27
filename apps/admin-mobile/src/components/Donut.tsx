import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { MobileView } from '../useMobileView';

export function Donut({ d }: { d: MobileView['dashboard'] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <View style={{ width: 112, height: 112 }}>
        <Svg viewBox="0 0 42 42" width={112} height={112}>
          <G rotation={-90} origin="21, 21">
            {d.donut.map((s, i) => (
              <Circle key={i} cx="21" cy="21" r="15.9155" fill="none" stroke={s.color} strokeWidth="5.5" strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap="butt" />
            ))}
          </G>
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Gastos</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }}>{d.donutTotal}</Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {d.donut.length === 0 && <Text style={{ fontSize: 12, color: '#6b665c' }}>Sin gastos en el período</Text>}
        {d.donut.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} allowFontScaling={false} style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: '500' }}>{s.cat}</Text>
            <Text style={{ color: '#6b665c', fontWeight: '600', fontSize: 13 }}>{s.pctTxt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
