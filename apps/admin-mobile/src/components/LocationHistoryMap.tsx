import { useState } from 'react';
import { Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { LocationHistory } from '../types';

function htmlFor(points: LocationHistory[]): string {
  const safe = JSON.stringify(points).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{margin:0;width:100%;height:100%;background:#f4f0e8} .leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const points=${safe};const latest=points[0];const map=L.map('map').setView([latest.latitude,latest.longitude],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const path=points.slice().reverse().map(p=>[p.latitude,p.longitude]);if(path.length>1)L.polyline(path,{color:'#e8a13a',weight:4,opacity:.8}).addTo(map);points.forEach((p,i)=>L.circleMarker([p.latitude,p.longitude],{radius:i===0?10:6,color:i===0?'#2e7d5b':'#8d5c10',fillColor:i===0?'#62b188':'#e8a13a',fillOpacity:.9}).bindPopup((i===0?'Última ubicación<br>':'')+p.latitude.toFixed(6)+', '+p.longitude.toFixed(6)+'<br>±'+Math.round(p.accuracy)+' m').addTo(map));</script></body></html>`;
}

export function LocationHistoryMap({ points }: { points: LocationHistory[] }) {
  const [failed, setFailed] = useState(false);
  if (!points.length) return <Text style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>Todavía no hay ubicaciones aceptadas para este vehículo.</Text>;
  if (failed) return <Text style={{ padding: 22, color: '#6b665c', fontSize: 12 }}>No se pudo cargar OpenStreetMap. Las coordenadas e historial siguen disponibles abajo.</Text>;
  return <WebView source={{ html: htmlFor(points), baseUrl: 'https://www.openstreetmap.org' }} originWhitelist={['*']} onError={() => setFailed(true)} onHttpError={() => setFailed(true)} javaScriptEnabled style={{ height: 300, backgroundColor: '#f4f0e8' }} />;
}
