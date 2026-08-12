import { useState } from 'react';
import type { FormEvent } from 'react';

export function Login({ onEntrar }: { onEntrar: (usuario: string, password: string) => Promise<void> }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
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

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 6 };
  const labelStyle = { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#6b665c' };
  const inputStyle = { border: '1px solid #e6ded0', borderRadius: 14, padding: '13px 14px', fontSize: 15, color: '#1a1a18', background: '#fffdf8', outline: 'none' };

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f0e8', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: '#e8a13a', color: '#16150f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>M</span>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>MiFlota</div>
        </div>

        <label style={fieldStyle}>
          <span style={labelStyle}>Usuario</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={inputStyle} />
        </label>

        {error && (
          <div role="alert" style={{ fontSize: 13, color: '#a8412f', background: '#fdeeea', border: '1px solid #f0d0c6', borderRadius: 12, padding: '10px 12px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          style={{ border: 'none', borderRadius: 18, background: '#16150f', color: '#fffdf8', minHeight: 52, fontSize: 15, fontWeight: 700, cursor: enviando ? 'progress' : 'pointer', opacity: enviando ? 0.6 : 1 }}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
