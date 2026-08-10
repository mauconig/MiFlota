import { useRef, useState } from 'react';
import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { MoneyInput } from './MoneyInput';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

/** Mandar un vehículo a taller registra un gasto, así que el modal pregunta por
 *  él antes de cambiar el estado: si el gasto se cargara después, se cargaría
 *  tarde o no se cargaría nunca. */
export function TallerModal({ v }: { v: View }) {
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!v.tallerOpen) return null;

  const tomar = (f: File | null) => v.setTallerArchivo(f);

  return (
    <div onClick={v.cerrarTaller} style={{ ...modalOverlay, zIndex: 75 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 480 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Mandar a taller · {v.tallerPlate}</span>
          <Btn onClick={v.cerrarTaller} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>
            <CloseIcon size={16} />
          </Btn>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Motivo</span>
            <input value={v.tallerRazon} onChange={v.setTallerRazon} placeholder="Cambio de embrague" maxLength={120} style={fieldInput} />
          </label>

          <label style={fieldLabel}>
            <span style={fieldLabelText}>Gasto</span>
            <span style={{ ...fieldInput, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13, color: '#a09a8d', flex: 'none' }}>₲</span>
              <MoneyInput
                value={v.tallerMonto}
                onChange={v.setTallerMonto}
                placeholder="1.800.000"
                ariaLabel="Gasto"
                style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', background: 'none', outline: 'none', fontSize: 14, color: '#1a1a18', fontVariantNumeric: 'tabular-nums' }}
              />
            </span>
          </label>

          <div style={fieldLabel}>
            <span style={fieldLabelText}>Comprobante (opcional)</span>
            {v.tallerArchivo ? (
              <div style={{ ...fieldInput, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ClipIcon />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.tallerArchivo}</span>
                <Btn
                  onClick={() => tomar(null)}
                  ariaLabel="Quitar comprobante"
                  style={{ flex: 'none', border: 'none', background: 'none', color: '#a8412f', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Quitar
                </Btn>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setEncima(true);
                }}
                onDragLeave={() => setEncima(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setEncima(false);
                  tomar(e.dataTransfer.files[0] ?? null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  minHeight: 92,
                  border: `1px dashed ${encima ? '#c9962f' : '#ddd3c1'}`,
                  borderRadius: 14,
                  background: encima ? '#faf3e4' : '#fffdf8',
                  color: '#6b665c',
                  cursor: 'pointer',
                  padding: 12,
                }}
              >
                <ClipIcon />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Arrastrá una foto o un PDF</span>
                <span style={{ fontSize: 11, color: '#a09a8d' }}>o hacé clic para elegirlo · hasta 8 MB</span>
              </button>
            )}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={(e) => tomar(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#6b665c', lineHeight: 1.5 }}>
          Se registra como egreso de categoría Taller con la fecha de hoy, así que va a aparecer en Reportes y en los movimientos del vehículo. Mientras esté en taller no genera cuota.
        </p>

        <div style={modalFooter}>
          <Btn onClick={v.cerrarTaller} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Cancelar
          </Btn>
          <Btn
            onClick={v.tallerGuardar}
            disabled={v.tallerGuardando}
            style={btnPrimary}
            hoverStyle={btnPrimaryHover}
            disabledStyle={{ background: '#8d8a80' }}
          >
            {v.tallerGuardando ? 'Guardando…' : 'Mandar a taller'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ClipIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
