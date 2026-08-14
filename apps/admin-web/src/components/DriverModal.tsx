import type { CSSProperties } from 'react';
import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { MoneyInput } from './MoneyInput';
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

const credentialRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 18,
  padding: '13px 14px',
  borderBottom: '1px solid #ece4d6',
};

export function DriverModal({ v }: { v: View }) {
  if (!v.drvModal) return null;

  const credentials = v.drvCredentials;
  const carLabel = v.carOptions.find((o) => o.id === v.ndrv.carId)?.label ?? '';

  return (
    <div onClick={v.closeModal} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>{credentials ? 'Datos para MiFlota Chofer' : 'Nuevo chofer'}</span>
          <Btn onClick={v.closeModal} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover} disabled={v.drvCredentialsLoading}>
            <CloseIcon size={16} />
          </Btn>
        </div>

        {credentials ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#6b665c' }}>
              Compartí estos datos con <strong style={{ color: '#1a1a18' }}>{v.ndrv.name.trim()}</strong> para que pueda entrar a la app. Revisalos antes de asignar el chofer.
            </div>
            <div style={{ overflow: 'hidden', border: '1px solid #e6ded0', borderRadius: 16, background: '#fffdf8' }}>
              <div style={credentialRow}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b665c' }}>Vehículo</span>
                <span style={{ maxWidth: 285, textAlign: 'right', fontSize: 13, fontWeight: 650, color: '#1a1a18' }}>{carLabel}</span>
              </div>
              <div style={credentialRow}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b665c' }}>Usuario</span>
                <code style={{ fontSize: 15, fontWeight: 750, color: '#1a1a18', userSelect: 'all' }}>{credentials.username}</code>
              </div>
              <div style={{ ...credentialRow, borderBottom: 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b665c' }}>Contraseña</span>
                <code style={{ fontSize: 15, fontWeight: 750, letterSpacing: 0.5, color: '#1a1a18', userSelect: 'all' }}>{credentials.password}</code>
              </div>
            </div>
            <div style={{ padding: '11px 13px', border: '1px solid #f2dfbd', borderRadius: 12, background: '#fdf6e8', fontSize: 12, lineHeight: 1.45, color: '#8a641c' }}>
              La contraseña se guarda cifrada y no podrá volver a verse. Anotala o compartila antes de continuar.
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={fieldLabel}>
              <span style={fieldLabelText}>Nombre y apellido</span>
              <input value={v.ndrv.name} onChange={v.dh.name} placeholder="Ramón Duarte" style={fieldInput} />
            </label>
            <label style={fieldLabel}>
              <span style={fieldLabelText}>Vehículo asignado</span>
              <select className="field-select" value={v.ndrv.carId} onChange={v.dh.carId} style={fieldInput}>
                <option value="">Elegí un vehículo</option>
                {v.carOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldLabel}>
              <span style={fieldLabelText}>Cuota diaria</span>
              <span style={{ ...fieldInput, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13, color: '#a09a8d', flex: 'none' }}>₲</span>
                <MoneyInput
                  value={v.ndrv.cuota}
                  onChange={v.setNdrvCuota}
                  placeholder="190.000"
                  ariaLabel="Cuota diaria"
                  style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', background: 'none', outline: 'none', fontSize: 14, color: '#1a1a18', fontVariantNumeric: 'tabular-nums' }}
                />
              </span>
            </label>
          </div>
        )}

        <div style={modalFooter}>
          <Btn onClick={credentials ? v.backDrv : v.closeModal} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={v.drvCredentialsLoading}>
            {credentials ? 'Volver' : 'Cancelar'}
          </Btn>
          <Btn
            onClick={credentials || !v.drvNeedsCredentials ? v.saveDrv : v.previewDrv}
            style={btnPrimary}
            hoverStyle={btnPrimaryHover}
            disabled={v.drvCredentialsLoading}
            disabledStyle={{ opacity: 0.6 }}
          >
            {v.drvCredentialsLoading ? 'Guardando…' : credentials ? 'Asignar chofer' : v.drvNeedsCredentials ? 'Continuar' : 'Guardar cambios'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
