import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';
import { FileDrop } from '../../components/FileDrop';

export function GastoTab({ r }: { r: NonNullable<NonNullable<MobileView['registrar']>['gasto']> }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Categoría</span>
        <ChipRow chips={r.catChips} wrap />
      </div>
      <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '2px 14px' }}>
        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '11px 0' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 70 }}>Auto</span>
          {r.lockCar ? (
            <span style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34' }}>{r.selCars.find((c) => c.id === r.carId)?.label ?? '—'}</span>
          ) : (
            <select value={r.carId} onChange={(e) => r.setCarId(e.target.value)} style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', cursor: 'pointer', padding: '2px 0' }}>
              <option value="" disabled>
                Elegí un auto
              </option>
              {r.selCars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      <FileDrop file={r.comprobante} onChange={r.setComprobante} />
    </>
  );
}
