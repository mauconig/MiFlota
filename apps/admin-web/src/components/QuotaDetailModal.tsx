import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import { btnSecondary, btnSecondaryHover, cardTight, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function QuotaDetailModal({ v }: { v: View }) {
  const d = v.quotaDetail;
  if (!d) return null;
  return (
    <div onClick={d.close} style={{ ...modalOverlay, zIndex: 90 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 520, padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1px solid #f0ebe0' }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={modalTitle}>Detalle de la cuota</div><div style={{ fontSize: 12, color: '#6b665c', marginTop: 4 }}>{d.description} · {d.dateLbl}</div></div>
          <span style={{ padding: '6px 10px', borderRadius: 11, background: d.statusBg, color: d.statusFg, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.status}</span>
          <Btn onClick={d.close} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Info label="Chofer" value={d.driver} />
            <Info label="Vehículo" value={d.vehicle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Metric label="Facturado" value={d.billed} />
            <Metric label="Cobrado" value={d.collected} color="#2e7d5b" />
            <Metric label="Pendiente" value={d.due} color={d.due === '—' ? '#6b665c' : '#a8412f'} />
          </div>
          <section style={{ ...cardTight, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Pagos aplicados</div>
            {d.appliedPayments.length ? d.appliedPayments.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f4efe4' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: p.typeFg, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}><span>{p.dateLbl}</span><span style={{ padding: '3px 7px', borderRadius: 8, background: p.typeBg, color: p.typeFg, fontSize: 9, textTransform: 'uppercase' }}>{p.type}</span></div><div style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>{p.medio}{p.note ? ' · ' + p.note : ''}</div></div>
                <span style={{ fontSize: 13, fontWeight: 800, color: p.typeFg }}>{p.amount}</span>
              </div>
            )) : <div style={{ fontSize: 12, color: '#6b665c' }}>Esta cuota todavía no recibió pagos.</div>}
          </section>
        </div>
        <div style={{ ...modalFooter, padding: '14px 24px' }}><Btn onClick={d.close} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cerrar</Btn></div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ ...cardTight, padding: '12px 13px', minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b665c' }}>{label}</div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div></div>;
}

function Metric({ label, value, color = '#16150f' }: { label: string; value: string; color?: string }) {
  return <div style={{ ...cardTight, padding: '12px 13px', minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b665c' }}>{label}</div><div style={{ marginTop: 5, fontSize: 14, fontWeight: 800, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div></div>;
}
