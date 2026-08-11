import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { BrandIcon, CloseIcon } from '../icons';
import { btnSecondary, btnSecondaryHover, cardTight, modalCloseBtn, modalCloseBtnHover } from '../styles';

const kpiLabel = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#6b665c' };

export function DriverDetail({ v }: { v: View }) {
  if (!v.hasDriverDetail) return null;
  const d = v.driverDetail;
  return (
    <div
      onClick={v.closeDriverDetail}
      style={{ position: 'fixed', inset: 0, background: 'rgba(22,21,15,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 65 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#f4f0e8',
          borderRadius: 24,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 24px 60px rgba(22,21,15,0.3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, flex: 'none' }}>
          <span style={{ width: 46, height: 46, borderRadius: 23, background: '#16150f', color: '#f7dfae', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flex: 'none' }}>
            {d.initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{d.name}</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>
              {d.plate} · {d.model}
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 12, background: d.tagBg, color: d.tagFg, flex: 'none' }}>{d.tag}</span>
          <Btn onClick={v.closeDriverDetail} ariaLabel="Cerrar" style={{ ...modalCloseBtn, width: 36, height: 36, borderRadius: 18 }} hoverStyle={modalCloseBtnHover}>
            <CloseIcon size={16} />
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, flex: 'none' }}>
          <div style={{ ...cardTight, padding: '13px 14px', minWidth: 0 }}>
            <div style={kpiLabel}>Cobrado</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 5, color: '#2e7d5b' }}>{d.cobrado}</div>
          </div>
          {/* Con saldo a favor la casilla cambia de sentido: no debe nada y
              además hay plata suya sin imputar, que se va a comer la próxima cuota. */}
          {d.aFavor ? (
            <div style={{ ...cardTight, padding: '13px 14px', minWidth: 0 }}>
              <div style={kpiLabel}>A favor</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 5, color: '#2e7d5b' }}>{d.aFavor}</div>
            </div>
          ) : (
            <div style={{ ...cardTight, padding: '13px 14px', minWidth: 0 }}>
              <div style={kpiLabel}>Pendiente</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 5, color: d.pendienteFg }}>{d.pendiente}</div>
            </div>
          )}
          <div style={{ ...cardTight, padding: '13px 14px', minWidth: 0 }}>
            <div style={kpiLabel}>Cuota diaria</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 5 }}>{d.cuota}</div>
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Cumplimiento de cobro</span>
            <span style={{ fontSize: 12, color: '#6b665c' }}>{d.periodShort}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#f0ebe0', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', borderRadius: 4, background: d.cumplimientoFg, width: d.cumplimientoPct }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: d.cumplimientoFg }}>{d.cumplimiento}</span>
            <span style={{ flex: 1, fontSize: 12, color: '#6b665c' }}>{d.cuotasLbl}</span>
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Vehículo asignado</span>
            <Btn onClick={d.verVehiculo} style={{ border: 'none', background: 'none', color: '#b5791a', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, flex: 'none' }} hoverStyle={{ color: '#8d5c10' }}>
              Ver vehículo →
            </Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 13, background: '#f4f0e8', color: '#4a463c', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <BrandIcon model={d.rawModel} size={24} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.01em' }}>{d.plate}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{d.model}</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 11, background: d.estadoBg, color: d.estadoFg, flex: 'none' }}>{d.estado}</span>
          </div>
        </div>

        {/* Es la única sección con largo variable: puede haber una cuota o
            veinte. `flex: 1` + `minHeight: 0` en toda la cadena hace que sea
            esta card la que se achique cuando el modal toca `maxHeight`, así
            el scroll queda adentro de la lista y no en el modal entero. */}
        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto', minHeight: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, flex: 'none' }}>Últimas cuotas</span>
          {d.sinPagos ? (
            <span style={{ fontSize: 13, color: '#6b665c' }}>Sin cuotas registradas en {d.periodShort}</span>
          ) : (
            <div className="scroll-sin-barra" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
              {d.pagos.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: i === d.pagos.length - 1 ? 'none' : '1px solid #f4efe4' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 10, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 13, fontWeight: 700 }}>{m.sign}</span>
                  <span style={{ width: 52, flex: 'none', fontSize: 12, color: '#6b665c' }}>{m.dateLbl}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{m.desc}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{m.sub}</span>
                  </span>
                  <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: m.amtFg }}>{m.amt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flex: 'none' }}>
          <Btn onClick={d.quitar} style={{ ...btnSecondary, color: '#a8412f', borderColor: '#f0d0c6' }} hoverStyle={{ background: '#fdeeea' }}>
            Quitar chofer
          </Btn>
          <Btn onClick={d.editar} style={btnSecondary} hoverStyle={btnSecondaryHover}>
            Editar datos
          </Btn>
        </div>
      </div>
    </div>
  );
}
