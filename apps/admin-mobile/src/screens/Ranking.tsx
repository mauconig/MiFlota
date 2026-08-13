import { Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { Avatar } from '../components/Avatar';

export function Ranking({ v }: { v: MobileView }) {
  const rk = v.ranking;
  const segBg = (on: boolean) => (on ? '#16150f' : 'transparent');
  const segFg = (on: boolean) => (on ? '#fffdf8' : '#6b665c');
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 2 }}>
        <Pressable onPress={v.period.openSheet} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, paddingVertical: 9, paddingHorizontal: 18 }}>
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="5" width="18" height="16" rx="3" />
            <Path d="M8 3v4" />
            <Path d="M16 3v4" />
            <Path d="M3 11h18" />
          </Svg>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a18' }}>{v.period.label}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, padding: 4, gap: 2 }}>
        <Pressable onPress={rk.setAuto} style={{ flex: 1, borderRadius: 20, paddingVertical: 9, alignItems: 'center', backgroundColor: segBg(rk.byAuto) }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: segFg(rk.byAuto) }}>Por auto</Text>
        </Pressable>
        <Pressable onPress={rk.setModelo} style={{ flex: 1, borderRadius: 20, paddingVertical: 9, alignItems: 'center', backgroundColor: segBg(!rk.byAuto) }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: segFg(!rk.byAuto) }}>Por modelo</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 11, color: '#6b665c', paddingLeft: 6 }}>{rk.hint}</Text>
      {rk.rows.map((r, i) => (
        <Pressable
          key={i}
          onPress={r.open}
          style={{
            backgroundColor: i === 0 ? '#fdf6e8' : '#fffdf8',
            borderWidth: 1,
            borderColor: i === 0 ? '#f2e4c6' : '#ece4d6',
            borderRadius: 20,
            paddingVertical: 12,
            paddingHorizontal: 15,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <Text style={{ width: 28, fontSize: 14, fontWeight: '800', color: r.posColor }}>{r.pos}</Text>
          <Avatar label={r.initials} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }} numberOfLines={1}>
              {r.sub}
            </Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: '#f0ebe0', marginTop: 6 }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${r.w}%`, borderRadius: 3, backgroundColor: r.color }} />
            </View>
          </View>
          <Text style={{ width: 84, textAlign: 'right', fontSize: 15, fontWeight: '700', letterSpacing: -0.3, color: r.color }}>{r.net}</Text>
        </Pressable>
      ))}
    </View>
  );
}
