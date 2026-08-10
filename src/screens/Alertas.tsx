import type { View } from '../useFleetView';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card } from '../styles';

export function Alertas({ v }: { v: View }) {
  if (!v.alertsFull.length)
    return (
      <Screen label="Alertas" style={{ ...card, overflow: 'hidden' }}>
        <Vacio titulo="Nada que atender" detalle="Acá van a aparecer los services por vencer, los seguros por renovar y los vehículos en taller." />
      </Screen>
    );

  return (
    <Screen label="Alertas" style={{ ...card, overflow: 'hidden' }}>
      <ScrollArea style={{ padding: '8px 20px' }}>
        {v.alertsFull.map((a, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f4efe4' }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: a.dot, flex: 'none' }} />
            <span style={{ width: 120, flex: 'none' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.plate}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{a.model}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{a.text}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 11, background: a.tagBg, color: a.tagFg, flex: 'none' }}>{a.kind}</span>
          </div>
        ))}
      </ScrollArea>
    </Screen>
  );
}
