import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { DetalleView } from '../useMobileView';
import { listarHistorialUbicacion } from '../api';
import type { LocationHistory } from '../types';
import { LocationHistoryMap } from './LocationHistoryMap';

export function LocationHistoryModal({ carId, plate, latest, onClose }: { carId: string; plate: string; latest: NonNullable<DetalleView['location']>; onClose: () => void }) {
  const [points, setPoints] = useState<LocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const load = () => listarHistorialUbicacion(carId).then((rows) => alive && setPoints(rows)).catch((e: Error) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    load();
    const timer = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [carId]);
  const shown = points.length ? points : [{ id: 0, carId, latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy ?? 0, recordedAt: latest.receivedAt, receivedAt: latest.receivedAt, mocked: false }];
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(latest.receivedAt).getTime()) / 60_000));
  const age = ageMinutes < 2 ? 'hace un momento' : ageMinutes < 60 ? `hace ${ageMinutes} min` : `hace ${Math.floor(ageMinutes / 60)} h`;
  const stale = ageMinutes >= 60;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '94%', backgroundColor: '#f4f0e8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 21, fontWeight: '700' }}>Ubicación del teléfono</Text><Text style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>{plate} · {loading ? 'Cargando historial…' : `${points.length} ubicaciones`}</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fffdf8', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, color: '#3d3a34' }}>×</Text></Pressable></View>
          {error && <Text style={{ marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: '#fdeeea', color: '#a8412f', fontSize: 12 }}>{error}</Text>}
          <View style={{ padding: 12, borderRadius: 14, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6' }}><Text style={{ color: stale ? '#a8412f' : '#2e7d5b', fontSize: 12, fontWeight: '700' }}>{stale ? 'Ubicación desactualizada' : 'Ubicación actual'} · {age}</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>Coordenadas: {latest.latitude.toFixed(6)}, {latest.longitude.toFixed(6)} · precisión ±{Math.round(latest.accuracy ?? 0)} m</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>Recibida: {new Date(latest.receivedAt).toLocaleString()}</Text></View>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 20 }}><View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e6ded0' }}><LocationHistoryMap points={shown} /></View>{points.length ? points.map((point, index) => <View key={point.id} style={{ padding: 11, borderRadius: 13, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6' }}><Text style={{ fontSize: 12, fontWeight: '700' }}>{index === 0 ? 'Última ubicación' : `Ubicación ${index + 1}`}</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} · precisión ±{Math.round(point.accuracy)} m</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>Recibida: {new Date(point.receivedAt).toLocaleString()}</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>Capturada: {new Date(point.recordedAt).toLocaleString()}</Text></View>) : <Text style={{ padding: 14, color: '#6b665c', fontSize: 12 }}>El servidor todavía no tiene historial para esta ubicación.</Text>}<Pressable onPress={() => void Linking.openURL(latest.mapsUrl)} style={{ minHeight: 48, borderRadius: 14, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}><Text style={{ color: '#fffdf8', fontSize: 13, fontWeight: '700' }}>Abrir mapa completo</Text></Pressable></ScrollView>
        </View>
      </View>
    </Modal>
  );
}
