import { Text } from 'react-native';

export function Tag({ label, bg, fg, small }: { label: string; bg: string; fg: string; small?: boolean }) {
  return (
    <Text
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingVertical: 2,
        paddingHorizontal: 7,
        borderRadius: small ? 9 : 10,
        backgroundColor: bg,
        color: fg,
        overflow: 'hidden',
      }}
    >
      {label}
    </Text>
  );
}
