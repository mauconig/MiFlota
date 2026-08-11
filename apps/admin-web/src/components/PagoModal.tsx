import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { ChipRow } from './ChipRow';
import { DateField } from './DateField';
import { MoneyInput } from './MoneyInput';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function PagoModal({ v }: { v: View }) {
  const f = v.pagoForm;
  if (!f) return null;
  return (
    <div onClick={f.cerrar} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Registrar pago</span>
          <Btn onClick={f.cerrar} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>
            <CloseIcon size={16} />
          </Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Chofer</span>
            <select className="field-select" value={f.driver} onChange={f.setDriver} style={fieldInput}>
              <option value="">Elegí un chofer</option>
              {f.opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={fieldLabel}>
              <span style={fieldLabelText}>Monto</span>
              <span style={{ ...fieldInput, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13, color: '#a09a8d', flex: 'none' }}>₲</span>
                <MoneyInput
                  value={f.monto}
                  onChange={f.setMonto}
                  placeholder="600.000"
                  ariaLabel="Monto del pago"
                  style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', background: 'none', outline: 'none', fontSize: 14, color: '#1a1a18', fontVariantNumeric: 'tabular-nums' }}
                />
              </span>
            </label>
            <label style={fieldLabel}>
              <span style={fieldLabelText}>Fecha</span>
              <DateField value={f.fecha} onChange={f.setFecha} max={f.hoy} ariaLabel="Fecha del pago" />
            </label>
          </div>
          <div style={fieldLabel}>
            <span style={fieldLabelText}>Tipo</span>
            <ChipRow chips={f.tipoOpts} />
            <span style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>Un ajuste cancela deuda sin que haya entrado plata, así que no cuenta como ingreso.</span>
          </div>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Nota (opcional)</span>
            <input value={f.nota} onChange={f.setNota} placeholder="Transferencia, efectivo…" maxLength={200} style={fieldInput} />
          </label>
          {/* La imputación es automática: sin este renglón el monto se carga a ciegas. */}
          <div style={{ background: '#fbf7ee', border: '1px solid #f0ebe0', borderRadius: 12, padding: '11px 13px', fontSize: 12, color: '#3d3a34' }}>{f.destino}</div>
        </div>
        <div style={modalFooter}>
          <Btn onClick={f.cerrar} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Cancelar
          </Btn>
          <Btn onClick={f.guardar} style={btnPrimary} hoverStyle={btnPrimaryHover}>
            {f.guardando ? 'Guardando…' : 'Registrar'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
