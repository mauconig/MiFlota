import { Pressable, Text, View } from 'react-native';

export function NumericKeypad({ keys }: { keys: { label: string; press: () => void }[] }) {
  const rows: (typeof keys)[] = [];
  for (let i = 0; i < keys.length; i += 3) rows.push(keys.slice(i, i + 3));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((k, i) => (
            <Pressable
              key={i}
              onPress={k.press}
              style={{ flex: 1, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 16, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 19, fontWeight: '600', color: '#1a1a18' }}>{k.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
