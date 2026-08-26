import { useRef } from 'react';
import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { DateField } from './DateField';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalOverlay, modalTitle } from '../styles';

export function ServiceModal({ v }: { v: View }) {
  const file = useRef<HTMLInputElement>(null);
  if (!v.serviceModal || !v.service) return null;
  const s = v.service;
  const costo = s.costo ? Number(s.costo.replace(/\D/g, '')) : 0;
  return (
    <div onClick={v.serviceClose} style={{ ...modalOverlay, zIndex: 76 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fffdf8', borderRadius: 24, width: 520, maxWidth: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 24px 60px rgba(22,21,15,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={modalTitle}>Registrar service · {v.serviceVehicle}</span><Btn onClick={v.serviceClose} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8d5c10' }}>Paso {s.step + 1} de 3</div>
        {s.step === 0 && <><div><div style={{ fontSize: 19, fontWeight: 700 }}>¿Qué service se hizo?</div><div style={{ fontSize: 12, color: '#6b665c', marginTop: 5 }}>Guardamos el detalle para que después puedas encontrarlo en Movimientos.</div></div><Field label="Descripción"><input value={s.descripcion} onChange={(e) => v.serviceSet({ descripcion: e.target.value })} placeholder="Cambio de aceite y filtros" maxLength={160} style={fieldInput} autoFocus /></Field><Field label="Fecha"><DateField value={s.fecha} onChange={(x) => v.serviceSet({ fecha: x })} max={v.hoyISO} ariaLabel="Fecha del service" /></Field><Field label="Kilometraje · opcional"><input inputMode="numeric" value={s.kilometraje} onChange={(e) => v.serviceSet({ kilometraje: e.target.value })} placeholder="120.000" style={fieldInput} /></Field></>}
        {s.step === 1 && <><div><div style={{ fontSize: 19, fontWeight: 700 }}>¿Tuvo costo?</div><div style={{ fontSize: 12, color: '#6b665c', marginTop: 5 }}>Si lo completás, se agrega automáticamente a Gastos como Service.</div></div><Field label="Costo · opcional"><input inputMode="numeric" value={s.costo} onChange={(e) => v.serviceSet({ costo: e.target.value })} placeholder="350.000" style={fieldInput} autoFocus /></Field><div style={fieldLabel}><span style={fieldLabelText}>Comprobante · opcional</span>{s.comprobante ? <div style={{ ...fieldInput, display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.comprobante.name}</span><Btn onClick={() => v.serviceSet({ comprobante: null })} style={{ border: 'none', background: 'none', color: '#a8412f', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Quitar</Btn></div> : <button type="button" onClick={() => file.current?.click()} style={{ minHeight: 76, border: '1px dashed #ddd3c1', borderRadius: 14, background: '#fffdf8', color: '#6b665c', cursor: 'pointer', width: '100%' }}>Adjuntar foto o PDF</button>}<input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" onChange={(e) => v.serviceSet({ comprobante: e.target.files?.[0] ?? null })} style={{ display: 'none' }} /></div></>}
        {s.step === 2 && <><div><div style={{ fontSize: 19, fontWeight: 700 }}>Revisá el service</div><div style={{ fontSize: 12, color: '#6b665c', marginTop: 5 }}>Se actualizará la ficha del vehículo y sólo se creará un gasto si cargaste un costo.</div></div><div style={{ border: '1px solid #ece4d6', borderRadius: 14, overflow: 'hidden' }}>{[['Vehículo', v.serviceVehicle], ['Descripción', s.descripcion], ['Fecha', s.fecha], ['Kilometraje', s.kilometraje || 'No informado'], ['Costo', costo ? '₲ ' + costo.toLocaleString('es-PY') : 'Sin costo'], ['Comprobante', s.comprobante?.name || 'No adjunto']].map(([label, value]) => <div key={label} style={{ display: 'flex', gap: 15, padding: '11px 13px', borderBottom: '1px solid #f0ebe0', fontSize: 12 }}><span style={{ width: 110, color: '#6b665c' }}>{label}</span><strong style={{ flex: 1 }}>{value}</strong></div>)}</div></>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f0ebe0', paddingTop: 16 }}><Btn onClick={v.serviceBack} style={btnSecondary} hoverStyle={btnSecondaryHover}>{s.step === 0 ? 'Cancelar' : 'Atrás'}</Btn><Btn onClick={s.step === 2 ? v.serviceSave : v.serviceNext} disabled={s.guardando} style={btnPrimary} hoverStyle={btnPrimaryHover} disabledStyle={{ opacity: 0.6 }}>{s.guardando ? 'Guardando…' : s.step === 2 ? 'Registrar service' : 'Continuar'}</Btn></div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ ...fieldLabel, marginBottom: 2 }}><span style={fieldLabelText}>{label}</span>{children}</label>; }
