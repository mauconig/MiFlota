import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface AlertCardView {
  txt: string;
  sub: string;
  color: string;
  bg: string;
  bd: string;
  iconBg: string;
}

export function AlertCard({ a }: { a: AlertCardView }) {
  return (
    <View style={{ backgroundColor: a.bg, borderWidth: 1, borderColor: a.bd, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={a.color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 9v4" />
          <Path d="M12 17h.01" />
          <Circle cx="12" cy="12" r="9" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700' }}>{a.txt}</Text>
        <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }}>{a.sub}</Text>
      </View>
    </View>
  );
}
