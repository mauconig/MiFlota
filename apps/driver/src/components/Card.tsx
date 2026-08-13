import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { COLORS, RADII } from '../theme';

export function Card({ children, style, dark }: { children: ReactNode; style?: ViewStyle; dark?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: dark ? COLORS.bgDark : COLORS.card,
          borderRadius: RADII.card,
          borderWidth: dark ? 0 : 1,
          borderColor: COLORS.cardBorder,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
