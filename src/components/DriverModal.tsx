import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { MoneyInput } from './MoneyInput';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function DriverModal({ v }: { v: View }) {
  if (!v.drvModal) return null;
  return (
    <div onClick={v.closeModal} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Nuevo chofer</span>
          <Btn onClick={v.closeModal} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>
            <CloseIcon size={16} />
          </Btn>
        </div>
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
        <div style={modalFooter}>
          <Btn onClick={v.closeModal} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Cancelar
          </Btn>
          <Btn onClick={v.saveDrv} style={btnPrimary} hoverStyle={btnPrimaryHover}>
            Asignar chofer
          </Btn>
        </div>
      </div>
    </div>
  );
}
