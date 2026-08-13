import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

export function Toast({ msg }: { msg: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!msg) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [msg, anim]);

  if (!msg) return null;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 16,
        right: 16,
        marginBottom: 14,
        backgroundColor: '#16150f',
        borderRadius: 16,
        paddingVertical: 13,
        paddingHorizontal: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Text style={{ color: '#fffdf8', fontSize: 13, fontWeight: '600' }}>{msg}</Text>
    </Animated.View>
  );
}
