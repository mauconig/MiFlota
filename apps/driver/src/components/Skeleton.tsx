import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { COLORS } from '../theme';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: object;
}

function Bar({ width = '100%', height = 14, borderRadius = 7, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#e6ded0',
        opacity,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, padding: 16, gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} height={i === 0 ? 18 : 12} width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%'} />
      ))}
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={{ padding: 16, paddingTop: 6, gap: 12 }}>
      <View style={{ backgroundColor: COLORS.redBg, borderRadius: 20, padding: 14, gap: 8 }}>
        <Bar height={16} width="70%" />
        <Bar height={12} width="50%" />
      </View>
      <View style={{ backgroundColor: COLORS.bgDark, borderRadius: 20, padding: 16, gap: 12 }}>
        <Bar height={11} width="40%" style={{ backgroundColor: '#3a372c' }} />
        <Bar height={34} width="55%" style={{ backgroundColor: '#3a372c' }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333024' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Bar height={11} width="60%" style={{ backgroundColor: '#3a372c' }} />
            <Bar height={14} width="40%" style={{ backgroundColor: '#3a372c' }} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Bar height={11} width="60%" style={{ backgroundColor: '#3a372c' }} />
            <Bar height={14} width="40%" style={{ backgroundColor: '#3a372c' }} />
          </View>
        </View>
        <Bar height={48} borderRadius={16} width="100%" style={{ backgroundColor: '#3a372c', marginTop: 14 }} />
      </View>
      <SkeletonCard lines={2} />
      <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Bar width={44} height={44} borderRadius={14} />
        <View style={{ flex: 1, gap: 4 }}>
          <Bar height={10} width="30%" />
          <Bar height={16} width="50%" />
          <Bar height={12} width="40%" />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ padding: 16, paddingTop: 6, gap: 12 }}>
      <SkeletonCard lines={2} />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, padding: 16, gap: 9 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bar height={15} width="40%" />
            <View style={{ flex: 1 }} />
            <Bar height={20} width={60} borderRadius={12} />
          </View>
          <Bar height={12} width="80%" />
          <Bar height={11} width="30%" />
        </View>
      ))}
    </View>
  );
}

export function SkeletonPayments() {
  return (
    <View style={{ padding: 16, paddingTop: 6, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Bar height={36} width={70} borderRadius={16} />
        <Bar height={36} width={80} borderRadius={16} />
        <Bar height={36} width={60} borderRadius={16} />
      </View>
      <SkeletonCard lines={2} />
      <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 15 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#f4efe4' }}>
            <Bar width={36} height={36} borderRadius={18} />
            <View style={{ flex: 1, gap: 4 }}>
              <Bar height={13} width="50%" />
              <Bar height={11} width="35%" />
            </View>
            <Bar height={14} width={80} />
          </View>
        ))}
      </View>
    </View>
  );
}
