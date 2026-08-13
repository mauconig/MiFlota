import type { ViewStyle } from 'react-native';
import { Text, View } from 'react-native';

export function Avatar({ label, size = 36, bg = '#f4f0e8', fg = '#5f5a51', style }: { label: string; size?: number; bg?: string; fg?: string; style?: ViewStyle }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: fg, fontSize: size * 0.36, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
