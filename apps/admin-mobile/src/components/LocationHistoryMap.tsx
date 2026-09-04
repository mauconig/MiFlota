import { useState } from 'react';
import { Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { LocationHistory } from '../types';
import { API_BASE } from '../config';

function htmlFor(points: LocationHistory[], selectedId: number | null): string {
  const safe = JSON.stringify(points).replace(/</g, '\\u003c');
  const tileUrl = `${API_BASE}/api/map/tiles/{z}/{x}/{y}.png`;
  const selected = points.find((point) => point.id === selectedId) ?? points[0];
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{margin:0;width:100%;height:100%;background:#f4f0e8} .leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const points=${safe};const selectedId=${JSON.stringify(selected.id)};const selected=points.find(p=>p.id===selectedId)||points[0];const map=L.map('map').setView([selected.latitude,selected.longitude],14);L.tileLayer(${JSON.stringify(tileUrl)},{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const path=points.slice().reverse().map(p=>[p.latitude,p.longitude]);if(path.length>1)L.polyline(path,{color:'#e8a13a',weight:4,opacity:.8}).addTo(map);points.forEach((p,i)=>L.circleMarker([p.latitude,p.longitude],{radius:p.id===selectedId?10:(i===0?9:6),color:p.id===selectedId?'#1e5aa8':(i===0?'#2e7d5b':'#8d5c10'),fillColor:p.id===selectedId?'#5a9be0':(i===0?'#62b188':'#e8a13a'),fillOpacity:.9}).bindPopup((p.id===selectedId?'Ubicación seleccionada<br>':'')+p.latitude.toFixed(6)+', '+p.longitude.toFixed(6)+'<br>±'+Math.round(p.accuracy)+' m').addTo(map));</script></body></html>`;
}

export function LocationHistoryMap({ points, selectedId = null }: { points: LocationHistory[]; selectedId?: number | null }) {
  const [failed, setFailed] = useState(false);
  if (!points.length) return <Text style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>Todavía no hay ubicaciones aceptadas para este vehículo.</Text>;
  if (failed) return <Text style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>No se pudo cargar OpenStreetMap. Las coordenadas e historial siguen disponibles abajo.</Text>;
  return <WebView source={{ html: htmlFor(points, selectedId), baseUrl: API_BASE }} originWhitelist={['*']} onError={() => setFailed(true)} onHttpError={() => setFailed(true)} javaScriptEnabled style={{ height: 300, backgroundColor: '#f4f0e8' }} />;
}
