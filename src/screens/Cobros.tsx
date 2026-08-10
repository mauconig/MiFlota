import type { View } from '../useFleetView';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card } from '../styles';

export function Cobros({ v }: { v: View }) {
  if (!v.pendFull.length)
    return (
      <Screen label="Cobros pendientes" style={{ ...card, overflow: 'hidden' }}>
        <Vacio titulo="No hay cuotas sin cobrar" detalle="Las cuotas pendientes o pagadas a medias del período aparecen acá." />
      </Screen>
    );

  return (
    <Screen label="Cobros pendientes" style={{ ...card, overflow: 'hidden' }}>
      <ScrollArea style={{ padding: '8px 20px' }}>
        {v.pendFull.map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: '1px solid #f4efe4' }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: '#f4f0e8', color: '#5f5a51', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>
              {p.initials}
            </span>
            <span style={{ width: 190, flex: 'none' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{p.driver}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{p.plate}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{p.desc}</span>
            <span style={{ width: 110, flex: 'none', fontSize: 12, color: '#6b665c' }}>{p.dateLbl}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 11, background: p.tagBg, color: p.tagFg, flex: 'none' }}>{p.tag}</span>
            <span style={{ width: 90, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#c0553f' }}>{p.amt}</span>
          </div>
        ))}
      </ScrollArea>
    </Screen>
  );
}
