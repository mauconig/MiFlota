import { Text, View } from 'react-native';

interface Bar {
  label: string;
  w: number;
  color: string;
  short: string;
}

export function BarList({ bars, labelWidth = 66 }: { bars: Bar[]; labelWidth?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {bars.map((b, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ width: labelWidth, fontSize: 12, fontWeight: '600', letterSpacing: 0.1 }} numberOfLines={1}>
            {b.label}
          </Text>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f0ebe0' }}>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${b.w}%`, borderRadius: 4, backgroundColor: b.color }} />
          </View>
          <Text style={{ width: 62, fontSize: 12, fontWeight: '700', textAlign: 'right', color: b.color }}>{b.short}</Text>
        </View>
      ))}
    </View>
  );
}
