import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { VehicleTable } from '../components/VehicleTable';
import { Screen } from '../components/Screen';
import { PlusIcon } from '../icons';
import { card } from '../styles';

export function Flota({ v }: { v: View }) {
  return (
    <Screen label="Vehículos" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <SearchBar value={v.carQ} onChange={v.setCarQ} placeholder="Buscar vehículo…" />
        <ChipRow chips={v.fleetFilters} />
        <span aria-hidden style={{ width: 1, height: 24, background: '#e0d6c4', margin: '0 4px', flex: 'none' }} />
        <select
          className="field-select"
          value={String(v.sectionFilter)}
          onChange={(e) => v.setSectionFilter(e.target.value === 'todos' ? 'todos' : e.target.value === 'sin' ? 'sin' : Number(e.target.value))}
          aria-label="Filtrar por sección"
          style={{ width: 156, minHeight: 34, border: '1px solid #e0d6c4', borderRadius: 12, padding: '0 34px 0 12px', fontSize: 12, color: '#3d3a34', background: '#fffdf8', cursor: 'pointer', flex: 'none' }}
        >
          <option value="todos">Todas las secciones</option>
          {v.sectionOptions.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          <option value="sin">Sin sección</option>
        </select>
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
            marginLeft: 'auto',
          }}
          hoverStyle={{ background: '#2a2820' }}
        >
          <PlusIcon size={14} />
          Agregar vehículo
        </Btn>
      </div>
      <VehicleTable cols={v.colsF} rows={v.flotaRows} variant="flota" />
    </Screen>
  );
}
