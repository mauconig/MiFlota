import Svg, { Path } from 'react-native-svg';

/** Auto tachado: identifica en toda la app los movimientos "Sin auto". */
export function NoCarIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 15.5v-3l1.8-4.2a1.5 1.5 0 0 1 1.4-.9h7.6a1.5 1.5 0 0 1 1.4.9l1.8 4.2v3a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z" />
      <Path d="M7.5 16.5v1.5M16.5 16.5v1.5M5 12.5h14" />
      <Path d="M3.5 3.5l17 17" />
    </Svg>
  );
}
