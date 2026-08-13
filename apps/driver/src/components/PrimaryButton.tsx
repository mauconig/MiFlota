import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'amber' | 'dark' | 'ghost';
  icon?: ReactNode;
}

export function PrimaryButton({ label, onPress, variant = 'amber', icon }: Props) {
  const bg = variant === 'amber' ? COLORS.amber : variant === 'dark' ? COLORS.bgDark : COLORS.card;
  const fg = variant === 'amber' ? COLORS.bgDark : variant === 'dark' ? COLORS.onDark : COLORS.textSoft;
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: variant === 'ghost' ? 50 : 54,
        borderRadius: 20,
        backgroundColor: bg,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
      }}
    >
      {icon}
      <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
