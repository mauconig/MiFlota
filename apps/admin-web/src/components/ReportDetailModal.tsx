import { useEffect, useState } from 'react';
import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function ReportDetailModal({ v }: { v: View }) {
  const report = v.reportDetail;
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [report?.id]);
  if (!report) return null;
  const fields = [
    ['Vehículo', report.plate],
    ['Chofer', report.driver],
    ['Fecha', report.date],
    ['Categoría', report.category],
    ['Gravedad', report.urgency],
    ['Estado', report.status],
  ];

  return (
    <div onClick={report.close} style={{ ...modalOverlay, zIndex: 76 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ ...modalPanel, width: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...modalTitle, flex: 1 }}>Reporte del chofer · {report.plate}</span>
          <Btn onClick={report.close} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{ border: '1px solid #ece4d6', borderRadius: 12, padding: '10px 12px', background: '#fffdf8' }}>
              <div style={{ color: '#8b8477', fontSize: 11, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ border: '1px solid #ece4d6', borderRadius: 14, padding: 14, background: '#fffdf8' }}>
          <div style={{ color: '#8b8477', fontSize: 11, marginBottom: 6 }}>Descripción</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{report.description}</div>
        </div>
        {confirming ? (
          <div style={{ borderRadius: 14, padding: 14, background: '#fdeeea', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong>¿Marcar este reporte como resuelto?</strong>
            <span style={{ fontSize: 12, color: '#6b665c' }}>Desaparecerá de Alertas. El vehículo conservará su estado actual.</span>
            <div style={modalFooter}>
              <Btn onClick={() => setConfirming(false)} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cancelar</Btn>
              <Btn onClick={report.resolve} style={{ ...btnPrimary, background: '#a8412f' }} hoverStyle={{ ...btnPrimaryHover, background: '#8f3324' }}>Sí, resolver</Btn>
            </div>
          </div>
        ) : (
          <div style={modalFooter}>
            <Btn onClick={() => setConfirming(true)} style={btnSecondary} hoverStyle={btnSecondaryHover}>Marcar resuelto</Btn>
            <Btn onClick={report.sendToWorkshop} style={btnPrimary} hoverStyle={btnPrimaryHover}>{report.inWorkshop ? 'Vincular al taller' : 'Enviar a taller'}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
