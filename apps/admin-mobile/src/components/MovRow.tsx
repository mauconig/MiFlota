import { Pressable, Text, View } from 'react-native';
import { Tag } from './Tag';

interface MovRowView {
  desc: string;
  sub: string;
  icon: string;
  iconBg: string;
  color: string;
  amt: string;
  showTag: boolean;
  tag: string;
  tagBg: string;
  tagFg: string;
  onPress?: () => void;
}

export function MovRow({ m }: { m: MovRowView }) {
  return (
    <Pressable onPress={m.onPress} disabled={!m.onPress} accessibilityRole={m.onPress ? 'button' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: m.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: m.color, fontSize: 11, fontWeight: '700' }}>{m.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {m.desc}
        </Text>
        <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }} numberOfLines={1}>
          {m.sub}
        </Text>
      </View>
      {m.showTag && <Tag label={m.tag} bg={m.tagBg} fg={m.tagFg} small />}
      <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.3, color: m.color }}>{m.amt}</Text>
    </Pressable>
  );
}
