import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // Un Modal no hereda el SafeAreaView de la pantalla de atrás — sin esto el
  // botón de abajo del todo queda pegado a (o tapado por) la barra de gestos.
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Un Modal de RN es su propia ventana nativa: no hereda el
          KeyboardAvoidingView de la pantalla de atrás, así que necesita el
          suyo propio o el teclado tapa cualquier input que tenga adentro.
          `height` en vez de `padding` en Android llegó a dejar la pantalla
          de atrás con un hueco en blanco permanente tras un remount (ver
          Shell) — `padding` en las dos plataformas evita esa clase de bug. */}
      <View style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.38)', justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: '#fffdf8', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 16, paddingBottom: 30 + insets.bottom, paddingHorizontal: 18, maxHeight: '80%' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: '700' }}>{title}</Text>
              <Pressable
                onPress={onClose}
                accessibilityLabel="Cerrar"
                style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', alignItems: 'center', justifyContent: 'center' }}
              >
                <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#3d3a34" strokeWidth={2} strokeLinecap="round">
                  <Path d="M18 6 6 18" />
                  <Path d="m6 6 12 12" />
                </Svg>
              </Pressable>
            </View>
            <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </KeyboardAwareScrollView>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}
