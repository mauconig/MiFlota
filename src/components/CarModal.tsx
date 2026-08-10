import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function CarModal({ v }: { v: View }) {
  if (!v.carModal) return null;
  return (
    <div onClick={v.closeModal} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Nuevo vehículo</span>
          <Btn onClick={v.closeModal} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>
            <CloseIcon size={16} />
          </Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Chapa</span>
            <input value={v.ncar.plate} onChange={v.ch.plate} placeholder="ABC 123" style={{ ...fieldInput, textTransform: 'uppercase' }} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Marca y modelo</span>
            <input value={v.ncar.model} onChange={v.ch.model} placeholder="Toyota Vitz" style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Año</span>
            <input inputMode="numeric" value={v.ncar.year} onChange={v.ch.year} placeholder="2018" style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Km actuales</span>
            <input inputMode="numeric" value={v.ncar.km} onChange={v.ch.km} placeholder="120000" style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Chofer</span>
            <input value={v.ncar.driver} onChange={v.ch.driver} placeholder="Sin chofer" style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>Cuota diaria</span>
            <input inputMode="numeric" value={v.ncar.cuota} onChange={v.ch.cuota} placeholder="190000" style={fieldInput} />
          </label>
        </div>
        <div style={modalFooter}>
          <Btn onClick={v.closeModal} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Cancelar
          </Btn>
          <Btn onClick={v.saveCar} style={btnPrimary} hoverStyle={btnPrimaryHover}>
            Agregar a la flota
          </Btn>
        </div>
      </div>
    </div>
  );
}
