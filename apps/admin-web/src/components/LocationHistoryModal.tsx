import { useEffect, useState } from 'react';
import type { DetailView } from '../useFleetView';
import { listarHistorialUbicacion } from '../api';
import type { LocationHistory } from '../types';
import { LocationHistoryMap } from './LocationHistoryMap';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';

export function LocationHistoryModal({ carId, plate, latest, onClose }: { carId: string; plate: string; latest: NonNullable<DetailView['location']>; onClose: () => void }) {
  const [points, setPoints] = useState<LocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => listarHistorialUbicacion(carId).then((rows) => alive && setPoints(rows)).catch((e: Error) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    load();
    const timer = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [carId]);

  const shown = points.length ? points : [{ id: 0, carId, latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy ?? 0, recordedAt: latest.receivedAt, receivedAt: latest.receivedAt, mocked: false }];
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(latest.receivedAt).getTime()) / 60_000));
  const age = ageMinutes < 2 ? 'hace un momento' : ageMinutes < 60 ? `hace ${ageMinutes} min` : `hace ${Math.floor(ageMinutes / 60)} h`;
  const stale = ageMinutes >= 60;
  return (
    <div onClick={(event) => { event.stopPropagation(); onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(22,21,15,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: 900, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: 24, background: '#f4f0e8', padding: 22, boxShadow: '0 24px 60px rgba(22,21,15,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 21, fontWeight: 700 }}>Ubicación del teléfono</div><div style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>{plate} · {loading ? 'Cargando historial…' : `${points.length} ubicaciones`}</div></div>
          <Btn onClick={onClose} ariaLabel="Cerrar" style={{ width: 38, height: 38, borderRadius: 19, border: '1px solid #e6ded0', background: '#fffdf8', cursor: 'pointer', color: '#3d3a34', display: 'flex', alignItems: 'center', justifyContent: 'center' }} hoverStyle={{ background: '#f7f1e5' }}><CloseIcon size={16} /></Btn>
        </div>
        {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: '#fdeeea', color: '#a8412f', fontSize: 12 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 12, fontSize: 11, color: '#6b665c' }}>
          <div><strong style={{ color: stale ? '#a8412f' : '#2e7d5b' }}>{stale ? 'Ubicación desactualizada' : 'Ubicación actual'}</strong><br />{age}</div>
          <div><strong>Coordenadas</strong><br />{latest.latitude.toFixed(6)}, {latest.longitude.toFixed(6)}</div>
          <div><strong>Precisión</strong><br />±{Math.round(latest.accuracy ?? 0)} m</div>
          <div><strong>Recibida</strong><br />{new Date(latest.receivedAt).toLocaleString()}</div>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e6ded0', background: '#fffdf8' }}><LocationHistoryMap points={shown} /></div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {points.length ? points.map((point, index) => <div key={point.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '11px 12px', borderRadius: 13, background: '#fffdf8', border: '1px solid #ece4d6' }}><div><div style={{ fontSize: 12, fontWeight: 700 }}>{index === 0 ? 'Última ubicación' : `Ubicación ${index + 1}`}</div><div style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} · precisión ±{Math.round(point.accuracy)} m</div></div><div style={{ fontSize: 11, color: '#6b665c', textAlign: 'right' }}><div>Recibida: {new Date(point.receivedAt).toLocaleString()}</div><div>Capturada: {new Date(point.recordedAt).toLocaleString()}</div></div></div>) : <div style={{ padding: 14, color: '#6b665c', fontSize: 12 }}>El servidor todavía no tiene historial para esta ubicación.</div>}
        </div>
        <a href={latest.mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 14, color: '#8d5c10', fontSize: 12, fontWeight: 700 }}>Abrir mapa completo</a>
      </div>
    </div>
  );
}
