import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationHistory } from '../types';

function FocusPoint({ point }: { point: LocationHistory }) {
  const map = useMap();
  useEffect(() => { map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 14), { duration: 0.35 }); }, [map, point.id, point.latitude, point.longitude]);
  return null;
}

export function LocationHistoryMap({ points, selectedId }: { points: LocationHistory[]; selectedId?: number }) {
  const [mapFailed, setMapFailed] = useState(false);
  if (!points.length) return <div style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>Todavía no hay ubicaciones aceptadas para este vehículo.</div>;
  const latest = points[0];
  const selected = points.find((point) => point.id === selectedId) ?? latest;
  const path = [...points].reverse().map((p) => [p.latitude, p.longitude] as [number, number]);
  if (mapFailed) return <div style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>No se pudo cargar OpenStreetMap. Las coordenadas e historial siguen disponibles abajo.</div>;
  return (
    <MapContainer center={[latest.latitude, latest.longitude]} zoom={14} scrollWheelZoom style={{ height: 330, width: '100%' }}>
      <FocusPoint point={selected} />
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="/api/map/tiles/{z}/{x}/{y}.png"
        eventHandlers={{ tileerror: () => setMapFailed(true) }}
      />
      {path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#e8a13a', weight: 4, opacity: 0.8 }} />}
      {points.map((point, index) => (
        <CircleMarker
          key={point.id}
          center={[point.latitude, point.longitude]}
          radius={point.id === selected.id ? 10 : index === 0 ? 9 : 6}
          pathOptions={{ color: point.id === selected.id ? '#1e5aa8' : index === 0 ? '#2e7d5b' : '#8d5c10', fillColor: point.id === selected.id ? '#5a9be0' : index === 0 ? '#62b188' : '#e8a13a', fillOpacity: 0.9 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {index === 0 ? 'Última ubicación' : new Date(point.receivedAt).toLocaleString()}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
