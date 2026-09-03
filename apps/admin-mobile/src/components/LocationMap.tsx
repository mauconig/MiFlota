import { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

function osmEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.005;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function LocationMap({ latitude, longitude, accuracy, receivedAt }: { latitude: number; longitude: number; accuracy: number | null; receivedAt: string }) {
  const [error, setError] = useState(false);
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', minHeight: 220 }}>
      {error ? (
        <Text style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>No se pudo cargar el mapa. Las coordenadas siguen disponibles arriba.</Text>
      ) : (
        <WebView
          source={{ uri: osmEmbedUrl(latitude, longitude) }}
          onError={() => setError(true)}
          originWhitelist={['https://*']}
          javaScriptEnabled
          style={{ height: 220, backgroundColor: '#f4f0e8' }}
        />
      )}
      <View style={{ padding: 9, borderTopWidth: 1, borderTopColor: '#ece4d6' }}>
        <Text style={{ fontSize: 11, color: '#6b665c' }}>Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}</Text>
        <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>Precisión: {accuracy == null ? 'no disponible' : `±${Math.round(accuracy)} m`} · Recibida: {new Date(receivedAt).toLocaleString()}</Text>
      </View>
    </View>
  );
}
