import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export function Login({ onEntrar }: { onEntrar: (usuario: string, password: string) => Promise<void> }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  const labelStyle = { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const, color: '#6b665c' };
  const inputStyle = { borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#1a1a18', backgroundColor: '#fffdf8' };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f4f0e8' }} behavior="padding">
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 340, gap: 20 }}>
        <View style={{ alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#e8a13a', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#16150f', fontSize: 22, fontWeight: '800' }}>M</Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.2 }}>MiFlota</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Usuario</Text>
          <TextInput value={usuario} onChangeText={setUsuario} autoCapitalize="none" autoCorrect={false} style={inputStyle} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Contraseña</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" style={inputStyle} />
        </View>

        {!!error && (
          <View style={{ backgroundColor: '#fdeeea', borderWidth: 1, borderColor: '#f0d0c6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 13, color: '#a8412f' }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={enviando}
          style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: enviando ? 0.6 : 1, flexDirection: 'row', gap: 8 }}
        >
          {enviando && <ActivityIndicator color="#fffdf8" size="small" />}
          <Text style={{ color: '#fffdf8', fontSize: 15, fontWeight: '700' }}>{enviando ? 'Entrando…' : 'Entrar'}</Text>
        </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
