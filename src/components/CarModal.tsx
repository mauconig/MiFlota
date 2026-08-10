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
            <span style={fieldLabelText}>Último service</span>
            <input type="date" value={v.ncar.lastService} onChange={v.ch.lastService} max={v.hoyISO} style={fieldInput} />
          </label>
          <label style={fieldLabel}>
            <span style={fieldLabelText}>GPS tag</span>
            <input value={v.ncar.gpsTag} onChange={v.ch.gpsTag} placeholder="Opcional" maxLength={40} style={fieldInput} />
          </label>
          <div style={fieldLabel}>
            <span style={fieldLabelText}>Service cada</span>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 7, minWidth: 0 }}>
              <input
                inputMode="numeric"
                value={v.ncar.serviceCada}
                onChange={v.ch.serviceCada}
                placeholder="6"
                aria-label="Cantidad"
                style={{ ...fieldInput, width: 62, flex: 'none', padding: '0 10px', textAlign: 'center' }}
              />
              {v.ncarUnidadOpts.map((u) => (
                <Btn
                  key={u.label}
                  onClick={u.pick}
                  style={{ border: `1px solid ${u.bd}`, background: u.bg, color: u.fg, borderRadius: 14, minHeight: 44, flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {u.label}
                </Btn>
              ))}
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b665c' }}>La cuota se define al asignarle un chofer.</p>
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
