import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Tag } from './Tag';

interface CarCardView {
  plate: string;
  model: string;
  driver: string;
  initials: string;
  estado: string;
  tagBg: string;
  tagFg: string;
  net: string;
  color: string;
  open: () => void;
}

export function CarCard({ c, periodShort }: { c: CarCardView; periodShort: string }) {
  return (
    <Pressable
      onPress={c.open}
      style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingVertical: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }}
    >
      <Avatar label={c.initials} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>{c.plate}</Text>
          <Tag label={c.estado} bg={c.tagBg} fg={c.tagFg} />
        </View>
        <Text style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }} numberOfLines={1}>
          {c.model} · {c.driver}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.3, color: c.color }}>{c.net}</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#6b665c', marginTop: 1 }}>neto {periodShort}</Text>
      </View>
    </Pressable>
  );
}
