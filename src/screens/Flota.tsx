import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { VehicleTable } from '../components/VehicleTable';
import { Screen } from '../components/Screen';
import { PlusIcon } from '../icons';
import { card, sectionTitle } from '../styles';

export function Flota({ v }: { v: View }) {
  return (
    <Screen label="Vehículos" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={sectionTitle}>Toda la flota</div>
          <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{v.tableSub}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 7, flex: 'none', alignItems: 'center' }}>
          <ChipRow chips={v.fleetFilters} />
          <Btn
            onClick={v.openCarModal}
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
            }}
            hoverStyle={{ background: '#2a2820' }}
          >
            <PlusIcon size={14} />
            Agregar vehículo
          </Btn>
        </div>
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <ChipRow chips={v.brandFilters} wrap size="sm" />
      </div>
      <VehicleTable cols={v.colsF} rows={v.flotaRows} variant="flota" autoFit />
    </Screen>
  );
}
