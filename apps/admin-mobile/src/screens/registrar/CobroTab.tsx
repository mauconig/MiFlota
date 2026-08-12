import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';

export function CobroTab({ r }: { r: NonNullable<NonNullable<MobileView['registrar']>['cobro']> }) {
  return (
    <>
      <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '2px 14px' }}>
        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '11px 0' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 70 }}>Chofer</span>
          <select value={r.driver} onChange={(e) => r.setDriver(e.target.value)} style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', cursor: 'pointer', padding: '2px 0' }}>
            <option value="" disabled>
              Elegí un chofer
            </option>
            {r.opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Tipo</span>
        <ChipRow chips={r.tipoOpts} equal />
      </div>
      <div style={{ fontSize: 12, color: '#6b665c', padding: '0 4px', lineHeight: 1.4 }}>{r.destino}</div>
    </>
  );
}
