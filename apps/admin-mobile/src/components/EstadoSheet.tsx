import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function EstadoSheet({ v }: { v: MobileView }) {
  const s = v.estadoSheet;
  return (
    <BottomSheet title="Estado del vehículo" onClose={s.close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.opts.map((op, i) => (
          <button
            key={i}
            onClick={op.pick}
            style={{ border: '1px solid ' + op.bd, background: op.bg, color: op.fg, borderRadius: 18, padding: '13px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>{op.label}</span>
            <span style={{ fontSize: 11, color: op.subFg }}>{op.sub}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
