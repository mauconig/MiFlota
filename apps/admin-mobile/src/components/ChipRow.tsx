import { Pressable, ScrollView, Text, View } from 'react-native';

interface Chip {
  label: string;
  bg: string;
  fg: string;
  bd: string;
  pick: () => void;
}

export function ChipRow({ chips, wrap, equal }: { chips: Chip[]; wrap?: boolean; equal?: boolean }) {
  const items = chips.map((c, i) => (
    <Pressable
      key={i}
      onPress={c.pick}
      style={{
        flex: equal ? 1 : undefined,
        borderWidth: 1,
        borderColor: c.bd,
        backgroundColor: c.bg,
        borderRadius: 19,
        paddingVertical: equal ? 9 : 8,
        paddingHorizontal: equal ? 0 : 14,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
        {c.label}
      </Text>
    </Pressable>
  ));

  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{items}</View>;
  if (equal) return <View style={{ flexDirection: 'row', gap: 7 }}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 7 }}>
      {items}
    </ScrollView>
  );
}
