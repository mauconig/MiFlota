import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { initials } from '../format';

const labelStyle = { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const, color: '#6b665c' };
const inputStyle = { borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#1a1a18', backgroundColor: '#fffdf8' };

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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

function PasswordField({ label, value, onChangeText, visible, onToggle, accessibilityLabel }: { label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void; accessibilityLabel: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={labelStyle}>{label}</Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          style={{ ...inputStyle, paddingRight: 52 }}
        />
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={8}
          style={{ position: 'absolute', top: 0, right: 4, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <EyeIcon visible={visible} />
        </Pressable>
      </View>
    </View>
  );
}

export function Perfil({ v, usuario, nombre, onLogout }: { v: MobileView; usuario: string; nombre: string; onLogout: () => void }) {
  const [actualVisible, setActualVisible] = useState(false);
  const [nuevaVisible, setNuevaVisible] = useState(false);
  const [repetirVisible, setRepetirVisible] = useState(false);

  return (
    <View style={{ padding: 20, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#f7dfae', fontSize: 18, fontWeight: '700' }}>{initials(nombre)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.2 }}>{nombre}</Text>
          <Text style={{ fontSize: 13, color: '#6b665c', marginTop: 1 }}>{usuario}</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>Cambiar contraseña</Text>
        <Text style={{ fontSize: 12, color: '#6b665c', marginTop: -6 }}>Mínimo 12 caracteres. Al cambiarla se cierran las sesiones de otros dispositivos.</Text>

        <PasswordField
          label="Contraseña actual"
          value={v.perfil.actual}
          onChangeText={v.perfil.setActual}
          visible={actualVisible}
          onToggle={() => setActualVisible((visible) => !visible)}
          accessibilityLabel={actualVisible ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
        />
        <PasswordField
          label="Contraseña nueva"
          value={v.perfil.nueva}
          onChangeText={v.perfil.setNueva}
          visible={nuevaVisible}
          onToggle={() => setNuevaVisible((visible) => !visible)}
          accessibilityLabel={nuevaVisible ? 'Ocultar contraseña nueva' : 'Mostrar contraseña nueva'}
        />
        <PasswordField
          label="Repetir contraseña nueva"
          value={v.perfil.repetir}
          onChangeText={v.perfil.setRepetir}
          visible={repetirVisible}
          onToggle={() => setRepetirVisible((visible) => !visible)}
          accessibilityLabel={repetirVisible ? 'Ocultar repetición de contraseña nueva' : 'Mostrar repetición de contraseña nueva'}
        />

        <Pressable
          onPress={v.perfil.guardar}
          disabled={v.perfil.guardando}
          style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: v.perfil.guardando ? 0.6 : 1, flexDirection: 'row', gap: 8, marginTop: 4 }}
        >
          {v.perfil.guardando && <ActivityIndicator color="#fffdf8" size="small" />}
          <Text style={{ color: '#fffdf8', fontSize: 15, fontWeight: '700' }}>{v.perfil.guardando ? 'Guardando…' : 'Guardar contraseña'}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onLogout}
        style={{ borderRadius: 18, borderWidth: 1, borderColor: '#f0d0c6', backgroundColor: '#fdeeea', minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#a8412f', fontSize: 15, fontWeight: '700' }}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
