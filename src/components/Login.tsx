import { useState } from 'react';
import type { FormEvent } from 'react';
import { TruckLogo } from '../icons';
import { btnPrimary, btnPrimaryHover, fieldInput, fieldLabel, fieldLabelText } from '../styles';

export function Login({ onEntrar }: { onEntrar: (usuario: string, password: string) => Promise<void> }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hover, setHover] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f0e8', padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          width: 380,
          maxWidth: '100%',
          background: '#fffdf8',
          border: '1px solid #ece4d6',
          borderRadius: 24,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 18px 44px rgba(22,21,15,0.09)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: '#e8a13a', color: '#16150f', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <TruckLogo />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Sikka Flota</div>
            <div style={{ fontSize: 12, color: '#6b665c' }}>Panel del dueño</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Usuario</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              style={fieldInput}
            />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={fieldInput} />
          </label>
        </div>

        {error && (
          <div role="alert" style={{ fontSize: 13, color: '#a8412f', background: '#fdeeea', border: '1px solid #f0d0c6', borderRadius: 12, padding: '10px 12px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            ...btnPrimary,
            width: '100%',
            justifyContent: 'center',
            opacity: enviando ? 0.6 : 1,
            cursor: enviando ? 'progress' : 'pointer',
            ...(hover && !enviando ? btnPrimaryHover : null),
          }}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
