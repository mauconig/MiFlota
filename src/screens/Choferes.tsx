import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { Screen, ScrollArea } from '../components/Screen';
import { PlusIcon } from '../icons';
import { card } from '../styles';

export function Choferes({ v }: { v: View }) {
  return (
    <Screen label="Choferes" style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, flex: 'none' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#6b665c' }}>{v.choferesSub}</span>
        <Btn
          onClick={v.openDrvModal}
          style={{
            border: 'none',
            background: '#16150f',
            color: '#fffdf8',
            borderRadius: 12,
            minHeight: 34,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            flex: 'none',
          }}
          hoverStyle={{ background: '#2a2820' }}
        >
          <PlusIcon size={14} />
          Agregar chofer
        </Btn>
      </div>
      <ScrollArea style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, alignContent: 'start' }}>
        {v.choferes.map((d, i) => (
          <div key={i} style={{ ...card, padding: '17px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: '#16150f', color: '#f7dfae', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flex: 'none' }}>
                {d.initials}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{d.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{d.carLbl}</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 11, background: d.tagBg, color: d.tagFg, flex: 'none' }}>{d.tag}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 12, borderTop: '1px solid #f0ebe0' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b665c' }}>Cuota</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 3 }}>{d.cuota}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b665c' }}>Cobrado</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2e7d5b', marginTop: 3 }}>{d.cobrado}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b665c' }}>Pendiente</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: d.pendFg, marginTop: 3 }}>{d.pend}</span>
              </span>
            </div>
          </div>
        ))}
      </ScrollArea>
    </Screen>
  );
}
