import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { BrandIcon, CloseIcon, GpsIcon } from '../icons';
import { cardTight } from '../styles';

export function DetailDrawer({ v }: { v: View }) {
  if (!v.hasDetail) return null;
  const d = v.detail;
  return (
    <div
      onClick={v.closeDetail}
      style={{ position: 'fixed', inset: 0, background: 'rgba(22,21,15,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 65 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
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
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: '#fffdf8', border: '1px solid #ece4d6', color: '#4a463c', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <BrandIcon model={d.rawModel} size={27} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{d.plate}</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span>{d.model}</span>
              <span style={{ width: 3, height: 3, borderRadius: 2, background: '#c9c2b4', flex: 'none' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: d.gpsFg }}>
                <GpsIcon size={12} />
                {d.gpsTag}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 12, background: d.estadoBg, color: d.estadoFg, flex: 'none' }}>{d.estado}</span>
          <Btn
            onClick={v.closeDetail}
            ariaLabel="Cerrar"
            style={{ width: 36, height: 36, borderRadius: 18, border: '1px solid #e6ded0', background: '#fffdf8', cursor: 'pointer', color: '#3d3a34', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
            hoverStyle={{ background: '#f7f1e5' }}
          >
            <CloseIcon size={16} />
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 16, padding: '13px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Ingresos</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 5, color: '#2e7d5b' }}>{d.ing}</div>
          </div>
          <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 16, padding: '13px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Egresos</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 5, color: '#c0553f' }}>{d.egr}</div>
          </div>
          <div style={{ background: '#16150f', borderRadius: 16, padding: '13px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bdb6a4' }}>Neto</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 5, color: '#fffdf8' }}>{d.net}</div>
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Chofer</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>{d.driver}</div>
              <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>
                {d.hasDriver ? `Cuota diaria ${d.cuotaFmt} · ${d.cobradas}` : 'Sin chofer no se genera cuota'}
              </div>
            </div>
            <Btn
              onClick={d.editDriver}
              style={{ border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 12, minHeight: 38, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
              hoverStyle={{ background: '#f7f1e5' }}
            >
              {d.hasDriver ? 'Cambiar' : 'Asignar'}
            </Btn>
            {d.hasDriver && (
              <Btn
                onClick={d.clearDriver}
                style={{ border: '1px solid #f0d8cf', background: '#fffdf8', color: '#a8412f', borderRadius: 12, minHeight: 38, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
                hoverStyle={{ background: '#fdeeea' }}
              >
                Quitar
              </Btn>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b665c', paddingTop: 11, borderTop: '1px solid #f0ebe0' }}>{d.pendientes}</div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Mantenimiento</span>
            <Btn
              onClick={d.markService}
              style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 34, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
              hoverStyle={{ background: '#2a2820' }}
            >
              Registrar service
            </Btn>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#f0ebe0', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', borderRadius: 4, background: d.svcBar, width: d.svcPct }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: d.svcFg }}>{d.svcLbl}</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>{d.svcSub}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 13, borderTop: '1px solid #f0ebe0' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#6b665c', flex: 'none' }}>Service cada</span>
              <input
                value={d.svcCada}
                onChange={d.svcSetCada}
                inputMode="numeric"
                aria-label="Cantidad"
                style={{ width: 58, flex: 'none', textAlign: 'center', border: '1px solid #e0d6c4', borderRadius: 12, minHeight: 38, padding: '0 8px', fontSize: 14, fontWeight: 700, color: '#1a1a18', background: '#fffdf8', outline: 'none', fontVariantNumeric: 'tabular-nums' }}
              />
              {/* Segmentado: las dos unidades son una sola decisión, así que van
                  dentro de un mismo riel en vez de como dos botones sueltos. */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: 3, padding: 3, borderRadius: 12, background: '#f4f0e8', border: '1px solid #ece4d6', flex: 'none' }}>
                {d.svcUnidadOpts.map((u) => (
                  <button
                    key={u.label}
                    onClick={u.pick}
                    aria-pressed={u.on}
                    style={{
                      border: 'none',
                      background: u.on ? '#16150f' : 'transparent',
                      color: u.on ? '#fffdf8' : '#6b665c',
                      borderRadius: 9,
                      minHeight: 30,
                      padding: '0 13px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              <Btn
                onClick={d.svcGuardar}
                disabled={!d.svcPuedeGuardar}
                style={{ border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 12, minHeight: 38, padding: '0 15px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none', marginLeft: 'auto' }}
                hoverStyle={{ background: '#f7f1e5' }}
                disabledStyle={{ borderColor: '#f0ebe0', color: '#c2bbac' }}
              >
                Guardar
              </Btn>
            </div>
            {d.svcHint && <div style={{ fontSize: 12, color: d.svcPuedeGuardar ? '#6b665c' : '#a8412f' }}>{d.svcHint}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 13, borderTop: '1px solid #f0ebe0' }}>
            {d.docs.map((doc) => (
              <div key={doc.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 62, flex: 'none', fontSize: 13, fontWeight: 700 }}>{doc.label}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, color: doc.fg }}>{doc.txt}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 2 }}>{doc.sub}</span>
                </span>
                <Btn
                  onClick={doc.renew}
                  style={{ border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 11, minHeight: 32, padding: '0 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
                  hoverStyle={{ background: '#f7f1e5' }}
                >
                  Renovar
                </Btn>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Mes a mes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.months.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, flex: 'none', fontSize: 12, fontWeight: 700, color: '#6b665c', textTransform: 'uppercase' }}>{m.label}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ height: 8, borderRadius: 4, background: '#f0ebe0', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', borderRadius: 4, background: '#2e7d5b', width: m.ingPct }} />
                  </span>
                  <span style={{ height: 8, borderRadius: 4, background: '#f0ebe0', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', borderRadius: 4, background: '#c0553f', width: m.egrPct }} />
                  </span>
                </span>
                <span style={{ width: 82, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, color: m.netFg }}>{m.net}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Últimos movimientos</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.movs.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid #f4efe4' }}>
                <span style={{ width: 32, height: 32, borderRadius: 11, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 14, fontWeight: 700 }}>
                  {m.sign}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{m.desc}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>
                    {m.dateLbl} · {m.sub}
                  </span>
                </span>
                <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: m.amtFg }}>{m.amt}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardTight, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Estado del vehículo</span>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            {d.estadoOpts.map((e) => (
              <button
                key={e.label}
                onClick={e.pick}
                style={{ flex: 1, border: `1px solid ${e.bd}`, background: e.bg, color: e.fg, borderRadius: 13, minHeight: 42, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {e.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid #f0ebe0' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#6b665c', lineHeight: 1.45 }}>
              Baja lo saca de circulación y conserva su historial. Eliminarlo lo borra junto con sus movimientos.
            </span>
            <Btn
              onClick={d.borrar}
              style={{ border: '1px solid #f0d0c6', background: '#fffdf8', color: '#a8412f', borderRadius: 12, minHeight: 38, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
              hoverStyle={{ background: '#fdeeea' }}
            >
              Eliminar
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
