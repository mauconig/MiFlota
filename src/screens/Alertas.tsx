import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card } from '../styles';

export function Alertas({ v }: { v: View }) {
  if (!v.alertCount)
    return (
      <Screen label="Alertas" style={{ ...card, overflow: 'hidden' }}>
        <Vacio titulo="Nada que atender" detalle="Acá van a aparecer los services por vencer, los seguros por renovar y los vehículos en taller." />
      </Screen>
    );

  return (
    <Screen label="Alertas" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <SearchBar value={v.alertQ} onChange={v.setAlertQ} placeholder="Buscar alerta…" />
        <ChipRow chips={v.alertKindChips} />
      </div>
      {!v.alertsFull.length && <div style={{ padding: '30px 0', fontSize: 13, color: '#6b665c', textAlign: 'center' }}>Sin alertas de este tipo</div>}
      <ScrollArea style={{ padding: '8px 20px' }}>
        {v.alertsFull.map((a, i) => (
          <Btn
            key={i}
            onClick={a.open}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0', border: 'none', background: 'none', borderBottom: '1px solid #f4efe4', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
            hoverStyle={{ background: '#fbf7ee' }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 5, background: a.dot, flex: 'none' }} />
            <span style={{ width: 185, flex: 'none' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{a.plate}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.model} · {a.gpsTag}
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{a.text}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 11, background: a.tagBg, color: a.tagFg, flex: 'none' }}>{a.kind}</span>
          </Btn>
        ))}
      </ScrollArea>
    </Screen>
  );
}
