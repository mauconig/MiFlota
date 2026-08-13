import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '../theme';

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [msg, onDone, anim]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <Text style={styles.text}>{msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    backgroundColor: COLORS.bgDark,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#16150f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  text: { color: COLORS.onDark, fontSize: 13, fontWeight: '600' },
});
