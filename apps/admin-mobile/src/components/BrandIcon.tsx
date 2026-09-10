import Svg, { G, Path } from 'react-native-svg';

const BRAND_PATHS: Record<string, string[]> = {
  Toyota: [
    'M1 12a11 7.6 0 1 0 22 0a11 7.6 0 1 0 -22 0',
    'M9.1 9.8a2.9 4.5 0 1 0 5.8 0a2.9 4.5 0 1 0 -5.8 0',
    'M5.2 14.3a6.8 2.8 0 1 0 13.6 0a6.8 2.8 0 1 0 -13.6 0',
  ],
  Chevrolet: ['M2 9.6h7.4V7h5.2v2.6H22v4.8h-7.4V17H9.4v-2.6H2z'],
  Hyundai: [
    'M2 12a10 6.4 0 1 0 20 0a10 6.4 0 1 0 -20 0',
    'M9.9 8.4L8.7 15.6',
    'M15.3 8.4L14.1 15.6',
    'M9 12h6',
  ],
  Kia: ['M5.4 8v8', 'M5.4 12L8.9 8', 'M5.4 12L8.9 16', 'M11.4 8L10.6 16', 'M13.8 16L16.6 8L18.6 16', 'M14.9 13.6h3'],
};

function brandKey(value: string) {
  const key = String(value).trim().split(/\s+/)[0].toLowerCase();
  return Object.keys(BRAND_PATHS).find((brand) => brand.toLowerCase() === key) ?? null;
}

export function BrandIcon({ brand, size = 21, color = '#16150f' }: { brand?: string; size?: number; color?: string }) {
  const key = brand ? brandKey(brand) : null;
  if (!key) return null;

  const isToyota = key === 'Toyota';
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" accessibilityLabel={`${key} logo`}>
      <G transform={isToyota ? 'rotate(180 12 12)' : undefined}>
        {BRAND_PATHS[key].map((d, index) => <Path key={index} d={d} />)}
      </G>
    </Svg>
  );
}
