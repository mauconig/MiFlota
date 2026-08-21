import { useCallback, useEffect, useState } from 'react';
import { listarSesiones, revocarOtrasSesiones, revocarSesion, type SesionActiva } from '../api';
import { Btn } from './Btn';
import { btnSecondary, btnSecondaryHover, modalOverlay, modalPanel } from '../styles';
import { IconPath } from '../icons';

/** Etiqueta corta y legible del dispositivo a partir del user agent: el string
 *  completo es ruido (versiones, tokens de webview); alcanza con la plataforma. */
function dispositivo(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const m =
    /iPhone/.exec(ua) ?? /iPad/.exec(ua) ?? /Android/.exec(ua) ??
    /Windows/.exec(ua) ?? /Mac OS X|Macintosh/.exec(ua) ?? /Linux/.exec(ua);
  const so = m?.[0] ?? '';
  const navegador = /Edg\//.test(ua) ? 'Edge' : /Chrome\/\d+/.test(ua) && !/Chromium/.test(ua) ? 'Chrome' : /Firefox\/\d+/.test(ua) ? 'Firefox' : /Safari\/\d+/.test(ua) ? 'Safari' : '';
  return [navegador, so.replace(/_|\//g, ' ').trim()].filter(Boolean).join(' · ') || ua.slice(0, 40);
}

const cuando = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-PY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Sesiones activas del usuario: qué dispositivos tienen el panel abierto y
 *  desde cuándo. Permite cerrar cualquiera (o todas menos esta). */
export function Sesiones({ onClose, onSalir }: { onClose: () => void; onSalir: () => void }) {
  const [lista, setLista] = useState<SesionActiva[] | null>(null);
  const [error, setError] = useState('');

  const recargar = useCallback(() => {
    listarSesiones()
      .then((s) => {
        setLista(s);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(recargar, [recargar]);

  const cerrarUna = async (s: SesionActiva) => {
    try {
      await revocarSesion(s.id);
      if (s.actual) onSalir();
      else recargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cerrarOtras = async () => {
    try {
      await revocarOtrasSesiones();
      recargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const otras = (lista ?? []).filter((s) => !s.actual).length;

  return (
    <div onClick={onClose} style={{ ...modalOverlay, zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 560, gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', flex: 1 }}>Sesiones activas</span>
          <Btn onClick={onClose} ariaLabel="Cerrar" style={{ border: '1px solid #e6ded0', background: '#fffdf8', borderRadius: 17, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} hoverStyle={{ background: '#f7f1e5' }}>
            <IconPath d="M6 6l12 12M18 6L6 18" size={15} />
          </Btn>
        </div>
        <div style={{ fontSize: 13, color: '#6b665c', lineHeight: 1.5 }}>
          Dispositivos con este panel abierto. Si ves uno que no reconocés, cerralo: va a pedir usuario y contraseña de nuevo.
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#a8412f', background: '#fdeeea', border: '1px solid #f0d0c6', borderRadius: 12, padding: '10px 12px' }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista === null && !error && <div style={{ fontSize: 13, color: '#a09a8d' }}>Cargando…</div>}
          {lista?.length === 0 && <div style={{ fontSize: 13, color: '#a09a8d' }}>No hay sesiones activas.</div>}
          {(lista ?? []).map((s) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, border: '1px solid #ece4d6', borderRadius: 16, padding: '12px 14px' }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: s.actual ? '#fdf3dd' : '#f4f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <IconPath d="M4 6h16v10H4zM9 19h6" size={17} />
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dispositivo(s.userAgent)}</span>
                  {s.actual && (
                    <span style={{ flex: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8d5c10', background: '#fdf3dd', borderRadius: 8, padding: '3px 8px' }}>
                      Esta ventana
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: '#a09a8d' }}>
                  Último uso {cuando(s.ultimoUso)} · iniciada {cuando(s.creada)}
                  {s.ip ? ` · ${s.ip}` : ''}
                </div>
              </div>
              {!s.actual && (
                <Btn onClick={() => void cerrarUna(s)} style={{ flex: 'none', border: '1px solid #ece4d6', background: '#fffdf8', color: '#a8412f', borderRadius: 12, minHeight: 36, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#fdeeea' }}>
                  Cerrar
                </Btn>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 }}>
          {otras > 0 && (
            <Btn onClick={() => void cerrarOtras()} style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 14, minHeight: 42, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#242219' }}>
              Cerrar las otras ({otras})
            </Btn>
          )}
          {otras === 0 && (
            <Btn onClick={onClose} style={btnSecondary} hoverStyle={btnSecondaryHover}>
              Listo
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
