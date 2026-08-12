import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function ChoferSheet({ v }: { v: MobileView }) {
  const s = v.choferSheet;
  const fieldRow = { display: 'flex', flexDirection: 'row' as const, alignItems: 'center', gap: 10, padding: '12px 0' };
  return (
    <BottomSheet title={s.title} onClose={s.close}>
      <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 18, padding: '2px 14px' }}>
        <label style={{ ...fieldRow, borderBottom: '1px solid #f4efe4' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 104 }}>Nombre</span>
          <input value={s.name} onChange={(e) => s.setName(e.target.value)} placeholder="Nombre y apellido" style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0', outline: 'none' }} />
        </label>
        <label style={fieldRow}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 104 }}>Cuota diaria</span>
          <input
            inputMode="numeric"
            value={s.cuota}
            onChange={(e) => s.setCuota(e.target.value)}
            placeholder="190.000"
            style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0', outline: 'none' }}
          />
        </label>
      </div>
      <button onClick={s.guardar} style={{ border: 'none', borderRadius: 18, background: '#16150f', color: '#fffdf8', minHeight: 48, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Guardar chofer
      </button>
      {s.hasDriver && (
        <button onClick={s.desvincular} style={{ border: '1px solid #f0d8cf', borderRadius: 18, background: '#fffdf8', color: '#a8412f', minHeight: 46, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Desvincular chofer
        </button>
      )}
    </BottomSheet>
  );
}
