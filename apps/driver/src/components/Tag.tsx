import { Text, View } from 'react-native';

export function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: fg }}>{label}</Text>
    </View>
  );
}
