import { useEffect, useState } from 'react';
import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import { btnSecondary, btnSecondaryHover, cardTight, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

export function MovementDetailModal({ v }: { v: View }) {
  const d = v.movementDetail;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfirming(false);
    setDeleting(false);
  }, [d?.id]);

  if (!d) return null;

  const eliminar = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await d.delete();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div onClick={d.close} style={{ ...modalOverlay, zIndex: 90 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 520, padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1px solid #f0ebe0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={modalTitle}>Detalle del movimiento</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 4 }}>{d.dateLbl} · {d.driver}</div>
          </div>
          <span style={{ padding: '6px 10px', borderRadius: 11, background: d.typeBg, color: d.typeFg, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.type}</span>
          <Btn onClick={d.close} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ ...cardTight, padding: 16, background: d.typeBg }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6b665c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monto</div>
            <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: d.amountFg, marginTop: 6 }}>{d.amount}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Info label="Chofer" value={d.driver} />
            <Info label="Vehículo" value={d.vehicle} />
            <Info label="Medio" value={d.medio} />
            <Info label="Fecha" value={d.dateLbl} />
            <Info label="Categoría" value={d.category} />
          </div>

          {d.note && <Info label="Nota" value={d.note} />}

          {d.comprobante && <ComprobantePreview comprobante={d.comprobante} />}

          {d.category !== 'Pago' && d.category !== 'Ajuste' && <section style={{ ...cardTight, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Detalle del gasto</div>
            {d.items.length ? d.items.map((item, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f4efe4', fontSize: 12 }}><span style={{ flex: 1, minWidth: 0 }}><strong>{item.nombre}</strong><span style={{ display: 'block', color: '#6b665c', marginTop: 2 }}>{item.cantidad} × {item.costoUnitario}</span></span><strong>{item.subtotal}</strong></div>) : <div style={{ fontSize: 12, color: '#6b665c' }}>Gasto sin repuestos detallados.</div>}
            {d.manoObra && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 3, borderTop: '1px solid #f4efe4', fontSize: 12 }}><strong>Mano de obra</strong><strong>{d.manoObra}</strong></div>}
          </section>}

          <section style={{ ...cardTight, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Aplicado a cuotas</div>
            {d.appliedQuotas.length ? d.appliedQuotas.map((q) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f4efe4' }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.description}</div><div style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>{q.dateLbl} · {q.vehicle}</div></div>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#2e7d5b' }}>{q.amount}</span>
              </div>
            )) : <div style={{ fontSize: 12, color: '#6b665c' }}>{d.category === 'Pago' || d.category === 'Ajuste' ? 'Todavía no se aplicó a una cuota.' : 'Los gastos no se aplican a cuotas.'}</div>}
            {d.saldoAFavor && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f4efe4', fontSize: 12, color: '#2e7d5b', fontWeight: 700 }}>Saldo a favor: {d.saldoAFavor}</div>}
          </section>
        </div>

        <div style={{ ...modalFooter, padding: '14px 24px', justifyContent: 'space-between' }}>
          {confirming ? (
            <>
              <span style={{ flex: 1, fontSize: 12, color: '#a8412f', lineHeight: 1.4 }}>Esta acción no se puede deshacer.</span>
              <Btn onClick={() => setConfirming(false)} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={deleting}>Cancelar</Btn>
              <Btn onClick={eliminar} disabled={deleting} style={{ border: 'none', background: '#a8412f', color: '#fffdf8', borderRadius: 14, minHeight: 44, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} disabledStyle={{ opacity: 0.6 }}>{deleting ? 'Eliminando…' : 'Sí, eliminar'}</Btn>
            </>
          ) : d.canDelete ? (
            <>
              <Btn onClick={() => setConfirming(true)} style={{ border: '1px solid #f0d0c6', background: '#fffdf8', color: '#a8412f', borderRadius: 14, minHeight: 44, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#fdeeea' }}>Eliminar movimiento</Btn>
              <Btn onClick={d.close} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cerrar</Btn>
            </>
          ) : <Btn onClick={d.close} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cerrar</Btn>}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ ...cardTight, padding: '12px 13px', minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b665c' }}>{label}</div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Sin especificar'}</div></div>;
}

function ComprobantePreview({ comprobante }: { comprobante: { url: string; name: string; type: string } }) {
  const image = comprobante.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(comprobante.name);
  const pdf = comprobante.type === 'application/pdf' || /\.pdf$/i.test(comprobante.name);
  return (
    <section style={{ ...cardTight, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Comprobante · {comprobante.name}</span>
        <a href={comprobante.url} target="_blank" rel="noreferrer" style={{ color: '#8d5c10', fontSize: 12, fontWeight: 700, flex: 'none' }}>Abrir completo</a>
      </div>
      {image ? <img src={comprobante.url} alt={'Comprobante ' + comprobante.name} style={{ display: 'block', width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 10, background: '#f4f0e8' }} /> : pdf ? <iframe title={'Vista previa de ' + comprobante.name} src={comprobante.url} style={{ display: 'block', width: '100%', height: 280, border: '1px solid #ece4d6', borderRadius: 10, background: '#f4f0e8' }} /> : <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#6b665c', background: '#f4f0e8', borderRadius: 10 }}>Vista previa no disponible para este archivo.</div>}
    </section>
  );
}
