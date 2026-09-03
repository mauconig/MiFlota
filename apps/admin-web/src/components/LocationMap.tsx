import { useState } from 'react';

function osmEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.005;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function LocationMap({ latitude, longitude, accuracy, receivedAt }: { latitude: number; longitude: number; accuracy: number | null; receivedAt: string }) {
  const [error, setError] = useState(false);
  return (
    <section style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e6ded0', background: '#fffdf8' }}>
      {error ? (
        <div style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>No se pudo cargar el mapa. Las coordenadas siguen disponibles abajo.</div>
      ) : (
        <iframe
          title="Mapa de última ubicación"
          src={osmEmbedUrl(latitude, longitude)}
          onError={() => setError(true)}
          loading="lazy"
          style={{ display: 'block', width: '100%', height: 250, border: 0 }}
        />
      )}
      <div style={{ padding: '9px 12px', fontSize: 11, color: '#6b665c', borderTop: '1px solid #ece4d6' }}>
        <div>Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}</div>
        <div>Precisión: {accuracy == null ? 'no disponible' : `±${Math.round(accuracy)} m`} · Recibida: {new Date(receivedAt).toLocaleString()}</div>
      </div>
    </section>
  );
}
