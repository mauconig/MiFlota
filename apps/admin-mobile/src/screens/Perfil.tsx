import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { initials } from '../format';

const labelStyle = { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const, color: '#6b665c' };
const inputStyle = { borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#1a1a18', backgroundColor: '#fffdf8' };

export function Perfil({ v, usuario, nombre, onLogout }: { v: MobileView; usuario: string; nombre: string; onLogout: () => void }) {
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

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Contraseña actual</Text>
          <TextInput value={v.perfil.actual} onChangeText={v.perfil.setActual} secureTextEntry autoCapitalize="none" style={inputStyle} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Contraseña nueva</Text>
          <TextInput value={v.perfil.nueva} onChangeText={v.perfil.setNueva} secureTextEntry autoCapitalize="none" style={inputStyle} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Repetir contraseña nueva</Text>
          <TextInput value={v.perfil.repetir} onChangeText={v.perfil.setRepetir} secureTextEntry autoCapitalize="none" style={inputStyle} />
        </View>

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