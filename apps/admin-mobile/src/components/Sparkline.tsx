import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import type { MobileView } from '../useMobileView';

export function Sparkline({ d }: { d: MobileView['dashboard'] }) {
  return (
    <>
      <Svg viewBox="0 0 340 96" width="100%" height={96} style={{ marginTop: 6 }}>
        <Defs>
          <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e8a13a" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#e8a13a" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points={d.areaPoints} fill="url(#tg)" />
        <Polyline points={d.linePoints} fill="none" stroke="#e8a13a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={d.lastPt.x} cy={d.lastPt.y} r={4} fill="#fffdf8" stroke="#e8a13a" strokeWidth={2.4} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        {d.trendPts.map((p, i) => (
          <Text key={i} style={{ fontSize: 10, fontWeight: '600', color: '#6b665c' }}>
            {p.lbl}
          </Text>
        ))}
      </View>
    </>
  );
}
