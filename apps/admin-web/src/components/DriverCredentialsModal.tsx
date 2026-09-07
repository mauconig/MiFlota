import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import {
  btnPrimary,
  btnPrimaryHover,
  btnSecondary,
  btnSecondaryHover,
  fieldInput,
  fieldLabel,
  fieldLabelText,
  modalCloseBtn,
  modalCloseBtnHover,
  modalFooter,
  modalOverlay,
  modalPanel,
  modalTitle,
} from '../styles';

export function DriverCredentialsModal({ v }: { v: View }) {
  const form = v.driverCredentialsEdit;
  if (!form) return null;

  const busy = form.loading || form.saving;
  const submitLabel = form.saving ? 'Guardando…' : form.passwordRequired ? 'Crear usuario' : 'Guardar cambios';

  return (
    <div onClick={form.saving ? undefined : v.closeDriverCredentialsEdit} style={{ ...modalOverlay, zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Administrar usuario</span>
          <Btn onClick={v.closeDriverCredentialsEdit} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover} disabled={form.saving}>
            <CloseIcon size={16} />
          </Btn>
        </div>

        {form.loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#6b665c' }}>Cargando datos de acceso…</div>
        ) : (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#6b665c' }}>
              Administrá el acceso de <strong style={{ color: '#1a1a18' }}>{form.driverName}</strong>.{' '}
              {form.passwordRequired ? 'Completá usuario y contraseña para crear su acceso.' : 'La contraseña nunca se muestra; dejala vacía para conservarla.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={fieldLabel}>
                <span style={fieldLabelText}>Usuario</span>
                <input
                  value={form.username}
                  onChange={(e) => v.setDriverCredentialsEdit({ username: e.target.value })}
                  placeholder="nombre.apellido"
                  autoComplete="username"
                  maxLength={40}
                  disabled={form.saving}
                  style={fieldInput}
                />
              </label>

              <label style={fieldLabel}>
                <span style={fieldLabelText}>{form.passwordRequired ? 'Contraseña' : 'Nueva contraseña · opcional'}</span>
                <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, ...fieldInput, padding: '0 10px 0 14px' }}>
                  <input
                    type={form.showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => v.setDriverCredentialsEdit({ password: e.target.value })}
                    placeholder="De 9 a 128 caracteres"
                    autoComplete="new-password"
                    minLength={9}
                    maxLength={128}
                    required={form.passwordRequired}
                    disabled={form.saving}
                    style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', outline: 'none', background: 'none', fontSize: 14, color: '#1a1a18' }}
                  />
                  <Btn
                    onClick={v.toggleDriverCredentialsPassword}
                    style={{ border: 'none', background: 'none', color: '#b5791a', padding: 0, fontSize: 11, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
                    hoverStyle={{ color: '#8d5c10' }}
                    disabled={form.saving}
                  >
                    {form.showPassword ? 'Ocultar' : 'Mostrar'}
                  </Btn>
                </span>
              </label>
            </div>

            <div style={{ padding: '11px 13px', border: '1px solid #f2dfbd', borderRadius: 12, background: '#fdf6e8', fontSize: 12, lineHeight: 1.45, color: '#8a641c' }}>
              Al guardar se cierran las sesiones abiertas del chofer. Tendrá que ingresar nuevamente con los datos actualizados.
            </div>
          </>
        )}

        <div style={modalFooter}>
          <Btn onClick={v.closeDriverCredentialsEdit} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={busy}>
            Cancelar
          </Btn>
          <Btn onClick={v.saveDriverCredentialsEdit} style={btnPrimary} hoverStyle={btnPrimaryHover} disabled={busy} disabledStyle={{ opacity: 0.6 }}>
            {submitLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
