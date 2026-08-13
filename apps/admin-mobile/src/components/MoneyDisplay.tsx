import { Text, View } from 'react-native';

export function MoneyDisplay({ display, color, hint }: { display: string; color: string; hint: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 2 }}>
      <Text style={{ fontSize: 38, fontWeight: '800', letterSpacing: -1.1, color }}>{display}</Text>
      <Text style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{hint}</Text>
    </View>
  );
}
