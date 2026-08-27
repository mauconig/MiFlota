import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const COLORS = {
  ink: '#16150f',
  paper: '#fffdf8',
  page: '#f4f0e8',
  soft: '#fdf6e8',
  muted: '#6b665c',
  border: '#e6ded0',
  amber: '#e8a13a',
  amberDark: '#8d5c10',
  error: '#a8412f',
};

function UserIcon({ color = COLORS.muted }: { color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="3.2" />
      <Path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5" />
    </Svg>
  );
}

function LockIcon({ color = COLORS.muted }: { color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 10h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 6 10Z" />
      <Path d="M8 10V7.8a4 4 0 0 1 8 0V10" />
    </Svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={COLORS.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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

export function Login({ onEntrar, onBiometria }: { onEntrar: (usuario: string, password: string) => Promise<void>; onBiometria?: () => Promise<boolean> }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [biometriaCargando, setBiometriaCargando] = useState(false);
  const [campoActivo, setCampoActivo] = useState<'usuario' | 'password' | null>(null);

  const submit = () => {
    if (enviando) return;
    setEnviando(true);
    setError('');
    onEntrar(usuario, password)
      .catch((err: Error) => {
        setError(err.message);
        setPassword('');
      })
      .finally(() => setEnviando(false));
  };

  const labelStyle = { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: COLORS.muted };
  const inputStyle = { minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, paddingVertical: 13, paddingHorizontal: 14, fontSize: 10, lineHeight: 14, includeFontPadding: false, color: COLORS.ink, backgroundColor: '#fbf8f1' };
  const iconColor = (campo: 'usuario' | 'password') => campoActivo === campo ? COLORS.amberDark : COLORS.muted;

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: COLORS.page }}
      mode="layout"
      bottomOffset={32}
      extraKeyboardSpace={24}
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingVertical: 36 }}
      keyboardShouldPersistTaps="handled"
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: -70, right: -72, width: 210, height: 210, borderRadius: 105, backgroundColor: '#f1d49e', opacity: 0.34 }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -100, left: -90, width: 230, height: 230, borderRadius: 115, backgroundColor: '#e7d7bc', opacity: 0.48 }} />

      <View style={{ width: '100%', maxWidth: 380, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: '#ece4d6', borderRadius: 28, padding: 26, shadowColor: COLORS.ink, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 5 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: COLORS.soft, borderWidth: 1, borderColor: '#f1dfbd', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' }}>
            <Image source={require('../../assets/images/icon.png')} resizeMode="contain" style={{ width: 78, height: 78 }} />
          </View>
          <Text style={{ color: COLORS.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 }}>MiFlota</Text>
          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>Panel de administración</Text>
        </View>

        <View style={{ gap: 17 }}>
          <View style={{ gap: 7 }}>
            <Text style={labelStyle}>Usuario</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <View pointerEvents="none" style={{ position: 'absolute', left: 15, zIndex: 1 }}><UserIcon color={iconColor('usuario')} /></View>
              <TextInput
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                onFocus={() => setCampoActivo('usuario')}
                onBlur={() => setCampoActivo(null)}
                placeholder="Ingresá tu usuario"
                placeholderTextColor="#a7a094"
                style={{ ...inputStyle, paddingLeft: 45, borderColor: campoActivo === 'usuario' ? COLORS.amber : COLORS.border }}
              />
            </View>
          </View>

          <View style={{ gap: 7 }}>
            <Text style={labelStyle}>Contraseña</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <View pointerEvents="none" style={{ position: 'absolute', left: 15, zIndex: 1 }}><LockIcon color={iconColor('password')} /></View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostrarPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                onFocus={() => setCampoActivo('password')}
                onBlur={() => setCampoActivo(null)}
                placeholder="Ingresá tu contraseña"
                placeholderTextColor="#a7a094"
                style={{ ...inputStyle, paddingLeft: 45, paddingRight: 52, borderColor: campoActivo === 'password' ? COLORS.amber : COLORS.border }}
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
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#fdeeea', borderWidth: 1, borderColor: '#f0d0c6', borderRadius: 13, paddingVertical: 11, paddingHorizontal: 12, marginTop: 18 }}>
            <Text style={{ fontSize: 13, lineHeight: 19, color: COLORS.error }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={enviando}
          style={{ borderRadius: 15, backgroundColor: COLORS.ink, minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', opacity: enviando ? 0.6 : 1, flexDirection: 'row', gap: 8 }}
        >
          {enviando && <ActivityIndicator color={COLORS.paper} size="small" />}
          <Text style={{ color: COLORS.paper, fontSize: 15, fontWeight: '800' }}>{enviando ? 'Entrando…' : 'Entrar al panel'}</Text>
        </Pressable>

        {!!onBiometria && <Pressable onPress={async () => { setBiometriaCargando(true); await onBiometria(); setBiometriaCargando(false); }} style={{ minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <Text style={{ color: COLORS.amberDark, fontSize: 13, fontWeight: '800' }}>{biometriaCargando ? 'Verificando…' : 'Desbloquear con huella o Face ID'}</Text>
        </Pressable>}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 19 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.amber }} />
          <Text style={{ color: '#938c7e', fontSize: 11 }}>Acceso seguro para administradores</Text>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
