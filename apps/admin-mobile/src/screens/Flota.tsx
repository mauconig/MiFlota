import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';
import { CarCard } from '../components/CarCard';

export function Flota({ v }: { v: MobileView }) {
  return (
    <main style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ChipRow chips={v.flota.filters} />
      <button
        onClick={v.goNuevoVehiculo}
        style={{ border: '1px dashed #d8cdb8', background: '#fbf7ee', color: '#3d3a34', borderRadius: 20, minHeight: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        Agregar vehículo
      </button>
      {v.flota.cars.length === 0 && <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: '#6b665c' }}>Ningún vehículo coincide</div>}
      {v.flota.cars.map((c) => (
        <CarCard key={c.id} c={c} periodShort={v.period.short} />
      ))}
    </main>
  );
}
