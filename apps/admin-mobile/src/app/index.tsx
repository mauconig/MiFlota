import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { API_BASE } from '../config';

type Me = { autenticado: true; usuario: string; nombre: string } | { autenticado: false };

export default function AuthProbe() {
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(false);
  const [usuario, setUsuario] = useState('admin');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (line: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${line}`]);

  const checkMe = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch(`${API_BASE}/api/me`);
      const j = (await r.json()) as Me;
      setMe(j);
      addLog(`GET /api/me -> ${r.status} autenticado=${j.autenticado}`);
    } catch (e) {
      addLog(`GET /api/me -> ERROR ${String(e)}`);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    addLog(`API_BASE = ${API_BASE}`);
    checkMe();
  }, [checkMe]);

  const entrar = async () => {
    setErr('');
    try {
      const r = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });
      addLog(`POST /api/login -> ${r.status}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || 'No se pudo iniciar sesión');
        return;
      }
      await checkMe();
    } catch (e) {
      addLog(`POST /api/login -> ERROR ${String(e)}`);
      setErr('No se pudo conectar al servidor');
    }
  };

  const salir = async () => {
    const r = await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
    addLog(`POST /api/logout -> ${r.status}`);
    await checkMe();
  };

  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 80, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Auth vertical slice</Text>

      {checking && <ActivityIndicator />}

      {me?.autenticado ? (
        <View style={{ gap: 10 }}>
          <Text>Autenticado como {me.nombre} ({me.usuario})</Text>
          <Pressable onPress={checkMe} style={{ padding: 12, backgroundColor: '#16150f', borderRadius: 12 }}>
            <Text style={{ color: '#fffdf8', textAlign: 'center' }}>Reverificar /api/me (probar persistencia)</Text>
          </Pressable>
          <Pressable onPress={salir} style={{ padding: 12, backgroundColor: '#e6ded0', borderRadius: 12 }}>
            <Text style={{ textAlign: 'center' }}>Salir</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput
            value={usuario}
            onChangeText={setUsuario}
            placeholder="usuario"
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: '#e6ded0', borderRadius: 10, padding: 10 }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="contraseña"
            secureTextEntry
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: '#e6ded0', borderRadius: 10, padding: 10 }}
          />
          {!!err && <Text style={{ color: '#b3261e' }}>{err}</Text>}
          <Pressable onPress={entrar} style={{ padding: 12, backgroundColor: '#16150f', borderRadius: 12 }}>
            <Text style={{ color: '#fffdf8', textAlign: 'center' }}>Entrar</Text>
          </Pressable>
        </View>
      )}

      <View style={{ gap: 2, marginTop: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b665c' }}>LOG</Text>
        {log.map((l, i) => (
          <Text key={i} style={{ fontSize: 11, color: '#6b665c' }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}
