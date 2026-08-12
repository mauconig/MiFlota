import type { MobileView } from '../useMobileView';

export function NuevoVehiculo({ v }: { v: MobileView }) {
  const nc = v.nuevoVehiculo;
  const row = { display: 'flex', flexDirection: 'row' as const, alignItems: 'center', gap: 10, padding: '12px 0' };
  return (
    <main style={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: '#6b665c', padding: '0 4px' }}>Chapa y modelo son obligatorios. El chofer se asigna después, desde la ficha del vehículo.</div>
      <section style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '2px 14px' }}>
        <label style={{ ...row, borderBottom: '1px solid #f4efe4' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 104 }}>Chapa</span>
          <input
            value={nc.plate}
            onChange={(e) => nc.setPlate(e.target.value)}
            placeholder="ABC 123"
            style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, letterSpacing: '0.02em', color: '#1a1a18', padding: '2px 0', outline: 'none', textTransform: 'uppercase' }}
          />
        </label>
        <label style={{ ...row, borderBottom: '1px solid #f4efe4' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 104 }}>Marca y modelo</span>
          <input value={nc.model} onChange={(e) => nc.setModel(e.target.value)} placeholder="Toyota Vitz" style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0', outline: 'none' }} />
        </label>
        <label style={row}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 104 }}>Año</span>
          <input inputMode="numeric" value={nc.year} onChange={(e) => nc.setYear(e.target.value)} placeholder="2018" style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0', outline: 'none' }} />
        </label>
      </section>
      <button onClick={nc.guardar} style={{ border: 'none', borderRadius: 20, background: '#16150f', color: '#fffdf8', minHeight: 52, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        Agregar a la flota
      </button>
      <button onClick={v.back} style={{ border: '1px solid #e0d6c4', borderRadius: 20, background: '#fffdf8', color: '#3d3a34', minHeight: 48, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Cancelar
      </button>
    </main>
  );
}
