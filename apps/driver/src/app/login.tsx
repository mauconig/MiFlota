import { useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../auth';
import { COLORS } from '../theme';

function CarIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={COLORS.bgDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L4.5 10.6c-.9.2-1.5 1-1.5 1.9v3.5c0 .6.4 1 1 1h2" />
      <Circle cx="7" cy="17" r="2" />
      <Path d="M9 17h6" />
      <Circle cx="17" cy="17" r="2" />
    </Svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke="#9c9589" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {visible ? <>
        <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <Circle cx="12" cy="12" r="2.5" />
      </> : <>
        <Path d="m3 3 18 18" />
        <Path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.2 3.8M6.2 6.7C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.2-.5" />
        <Path d="M9.9 9.9a2.5 2.5 0 0 0 3.5 3.5" />
      </>}
    </Svg>
  );
}

export default function Login() {
  const { entrar, reintentarBiometria, biometriaBloqueada } = useAuth();
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [err, setErr] = useState('');
  const [enviando, setEnviando] = useState(false);

  const onEntrar = async () => {
    if (!usuario.trim() || !password) {
      setErr('Completá usuario y contraseña');
      return;
    }
    setErr('');
    setEnviando(true);
    const error = await entrar(usuario.trim(), password);
    setEnviando(false);
    if (error) {
      setErr(error);
      return;
    }
    router.replace('/(app)/inicio');
  };

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const footerLift = Math.round(height * 0.07);

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: COLORS.bgDark }} bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 26, paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 16), gap: 26 }}>
        <View style={{ gap: 10 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.amber, alignItems: 'center', justifyContent: 'center' }}>
            <CarIcon />
          </View>
          <Text style={{ fontSize: 27, fontWeight: '700', letterSpacing: -0.4, color: COLORS.onDark, marginTop: 6 }}>MiFlota</Text>
          <Text style={{ fontSize: 13, color: COLORS.onDarkMuted }}>Acceso para choferes</Text>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.onDarkMuted }}>Usuario</Text>
            <TextInput
              value={usuario}
              onChangeText={setUsuario}
              placeholder="nombre.apellido"
              placeholderTextColor="#6b665c"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: COLORS.loginInputBorder,
                backgroundColor: COLORS.loginInputBg,
                color: COLORS.onDark,
                borderRadius: 16,
                minHeight: 52,
                paddingHorizontal: 16,
                fontSize: 15,
              }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.onDarkMuted }}>Contraseña</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6b665c"
                secureTextEntry={!mostrarPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.loginInputBorder,
                  backgroundColor: COLORS.loginInputBg,
                  color: COLORS.onDark,
                  borderRadius: 16,
                  minHeight: 52,
                  paddingLeft: 16,
                  paddingRight: 54,
                  fontSize: 15,
                }}
              />
              <Pressable
                onPress={() => setMostrarPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                hitSlop={8}
                style={{ position: 'absolute', top: 0, right: 4, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <EyeIcon visible={mostrarPassword} />
              </Pressable>
            </View>
          </View>
          {!!err && <Text style={{ color: '#e39485', fontSize: 12 }}>{err}</Text>}
          <Pressable
            onPress={onEntrar}
            disabled={enviando}
            style={{ borderRadius: 16, backgroundColor: COLORS.amber, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6, opacity: enviando ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.bgDark }}>{enviando ? 'Entrando…' : 'Ingresar'}</Text>
          </Pressable>
          {biometriaBloqueada && <Pressable onPress={() => void reintentarBiometria()} style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.onDarkMuted }}>Desbloquear con huella o Face ID</Text>
          </Pressable>}
        </View>

        <Text style={{ marginTop: 'auto', marginBottom: footerLift, fontSize: 11, color: '#77726a', lineHeight: 17 }}>
          El dueño de la flota te asigna el auto, el usuario y la contraseña. Si no los tenés, pedíselos a él.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}
