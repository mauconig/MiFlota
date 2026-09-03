import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { Avatar } from '../components/Avatar';
import { AlertCard } from '../components/AlertCard';
import { MovRow } from '../components/MovRow';
import { Pagination } from '../components/Pagination';
import { MovementDetailSheet } from '../components/MovementDetailSheet';
import { QuotaDetailSheet } from '../components/QuotaDetailSheet';
import { LocationHistoryModal } from '../components/LocationHistoryModal';

const ALERT_PAGE_SIZE = 4;
const MOV_PAGE_SIZE = 5;
const CUOTA_PAGE_SIZE = 5;

const GpsIcon = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M12 2v4" />
    <Path d="M12 18v4" />
    <Path d="M2 12h4" />
    <Path d="M18 12h4" />
  </Svg>
);

export function Detalle({ v }: { v: MobileView }) {
  const dc = v.detalle;
  const [alertPage, setAlertPage] = useState(0);
  const [movPage, setMovPage] = useState(0);
  const [cuotaPage, setCuotaPage] = useState(0);
  const [activeTable, setActiveTable] = useState<'movs' | 'cuotas'>('movs');
  const [locationOpen, setLocationOpen] = useState(false);
  useEffect(() => { setLocationOpen(false); }, [dc?.car.id]);
  const alertKey = useMemo(() => dc?.alerts.map((alert) => `${alert.txt}-${alert.sub}`).join('|') ?? '', [dc?.alerts]);
  const movKey = useMemo(() => dc?.movs.map((mov) => String(mov.id)).join('|') ?? '', [dc?.movs]);
  const cuotaKey = useMemo(() => dc?.cuotas.map((cuota) => String(cuota.id)).join('|') ?? '', [dc?.cuotas]);
  const alertPageCount = Math.max(1, Math.ceil((dc?.alerts.length ?? 0) / ALERT_PAGE_SIZE));
  const movPageCount = Math.max(1, Math.ceil((dc?.movs.length ?? 0) / MOV_PAGE_SIZE));
  const cuotaPageCount = Math.max(1, Math.ceil((dc?.cuotas.length ?? 0) / CUOTA_PAGE_SIZE));
  const visibleAlerts = dc?.alerts.slice(alertPage * ALERT_PAGE_SIZE, (alertPage + 1) * ALERT_PAGE_SIZE) ?? [];
  const visibleMovs = dc?.movs.slice(movPage * MOV_PAGE_SIZE, (movPage + 1) * MOV_PAGE_SIZE) ?? [];
  const visibleCuotas = dc?.cuotas.slice(cuotaPage * CUOTA_PAGE_SIZE, (cuotaPage + 1) * CUOTA_PAGE_SIZE) ?? [];
  const activeRows = activeTable === 'movs' ? visibleMovs : visibleCuotas;
  const activeTitle = activeTable === 'movs' ? 'Movimientos' : 'Cuotas';
  const activeCount = activeTable === 'movs' ? dc?.movCount : dc?.cuotaCount;

  useEffect(() => {
    setAlertPage(0);
  }, [alertKey]);

  useEffect(() => {
    setMovPage(0);
  }, [movKey]);

  useEffect(() => {
    setCuotaPage(0);
  }, [cuotaKey]);

  useEffect(() => {
    setAlertPage((current) => Math.min(current, alertPageCount - 1));
  }, [alertPageCount]);

  useEffect(() => {
    setMovPage((current) => Math.min(current, movPageCount - 1));
  }, [movPageCount]);

  useEffect(() => {
    setCuotaPage((current) => Math.min(current, cuotaPageCount - 1));
  }, [cuotaPageCount]);

  useEffect(() => {
    setActiveTable('movs');
  }, [dc?.car.id]);

  useEffect(() => {
    if (!v.movementDetail) return;
    setActiveTable('movs');
    const index = dc?.movs.findIndex((mov) => String(mov.id) === v.movementDetail?.id) ?? -1;
    if (index >= 0) setMovPage(Math.floor(index / MOV_PAGE_SIZE));
  }, [dc?.movs, v.movementDetail?.id]);

  if (!dc) return null;
  return (
    <>
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 14 }}>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 22, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <Avatar label={dc.initials} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 24 }}>{dc.plate}</Text>
            <Text style={{ fontSize: 12, color: '#6b665c' }}>
              {dc.model} {dc.year}
            </Text>
          </View>
          <Pressable onPress={dc.openEstadoSheet} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingVertical: 5, paddingLeft: 10, paddingRight: 8, backgroundColor: dc.tagBg }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: dc.tagFg }}>{dc.estado}</Text>
            <Svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={dc.tagFg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m6 9 6 6 6-6" />
            </Svg>
          </Pressable>
        </View>
        <Pressable onPress={dc.edit} style={{ minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', backgroundColor: '#fffdf8', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
          <Text style={{ color: '#3d3a34', fontSize: 13, fontWeight: '700' }}>Editar datos del vehículo</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0ebe0' }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b665c' }}>Cobrado</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#2e7d5b', marginTop: 2 }}>{dc.ing}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b665c' }}>Gastos</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#c0553f', marginTop: 2 }}>{dc.egr}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b665c' }}>Neto {v.period.short}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: dc.netColor, marginTop: 2 }}>{dc.net}</Text>
          </View>
        </View>
        <Pressable onPress={dc.openChoferSheet} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ebe0' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f0e8', alignItems: 'center', justifyContent: 'center' }}>
            <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#5f5a51" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="8" r="4" />
              <Path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </Svg>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
              {dc.driver}
            </Text>
            <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }}>cuota diaria {dc.cuotaFmt}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#b5791a' }}>{dc.driverAction}</Text>
            <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#b5791a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m9 18 6-6-6-6" />
            </Svg>
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={dc.goCobro} style={{ flex: 1, borderRadius: 18, backgroundColor: '#16150f', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fffdf8" strokeWidth={2} strokeLinecap="round">
            <Path d="M5 12h14" />
            <Path d="M12 5v14" />
          </Svg>
          <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Cobro</Text>
        </Pressable>
        <Pressable onPress={dc.goGasto} style={{ flex: 1, borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#1a1a18" strokeWidth={2} strokeLinecap="round">
            <Path d="M5 12h14" />
          </Svg>
          <Text style={{ color: '#1a1a18', fontSize: 14, fontWeight: '700' }}>Gasto</Text>
        </Pressable>
      </View>

      {dc.location && (
        <View style={{ backgroundColor: dc.location.stale ? '#fff9ec' : '#f2f8f4', borderWidth: 1, borderColor: dc.location.stale ? '#f2e4c6' : '#dcebe2', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dc.location.stale ? '#f9ead0' : '#e7f2ec', alignItems: 'center', justifyContent: 'center' }}>
            <GpsIcon color={dc.location.stale ? '#a8730f' : '#2e7d5b'} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6b665c' }}>Última ubicación</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 2 }}>
              {dc.location.stale ? 'Ubicación desactualizada' : 'Auto localizado'}
            </Text>
            <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }}>
              {dc.location.age}
              {dc.location.accuracy != null ? ' · precisión ±' + Math.round(dc.location.accuracy) + ' m' : ''}
            </Text>
            <Text style={{ fontSize: 10, color: '#6b665c', marginTop: 2 }}>
              {dc.location.latitude.toFixed(6)}, {dc.location.longitude.toFixed(6)}
            </Text>
          </View>
          <Pressable onPress={() => setLocationOpen(true)} style={{ borderRadius: 12, backgroundColor: '#16150f', paddingVertical: 9, paddingHorizontal: 13 }}>
            <Text style={{ color: '#fffdf8', fontSize: 12, fontWeight: '700' }}>Ver detalles</Text>
          </Pressable>
        </View>
      )}

      {dc.hasAlerts && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Mantenimiento</Text>
          {visibleAlerts.map((a, i) => (
            <AlertCard key={i} a={a} />
          ))}
          <Pagination page={alertPage} pageSize={ALERT_PAGE_SIZE} total={dc.alerts.length} itemLabel="avisos" onPageChange={setAlertPage} />
        </View>
      )}

      <View style={{ backgroundColor: '#f1ede5', borderRadius: 17, padding: 4, flexDirection: 'row', gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTable === 'movs' }}
          onPress={() => setActiveTable('movs')}
          style={{ flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: activeTable === 'movs' ? '#16150f' : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ color: activeTable === 'movs' ? '#fffdf8' : '#6b665c', fontSize: 13, fontWeight: '700' }}>Movimientos</Text>
          <Text style={{ color: activeTable === 'movs' ? '#d8d1c2' : '#8b8478', fontSize: 11, marginTop: 1 }}>{dc.movCount}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTable === 'cuotas' }}
          onPress={() => setActiveTable('cuotas')}
          style={{ flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: activeTable === 'cuotas' ? '#16150f' : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ color: activeTable === 'cuotas' ? '#fffdf8' : '#6b665c', fontSize: 13, fontWeight: '700' }}>Cuotas</Text>
          <Text style={{ color: activeTable === 'cuotas' ? '#d8d1c2' : '#8b8478', fontSize: 11, marginTop: 1 }}>{dc.cuotaCount}</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>{activeTitle}</Text>
          <Text style={{ fontSize: 11, color: '#6b665c' }}>{activeCount}</Text>
        </View>
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
          {activeTable === 'movs' && dc.noMovs && <Text style={{ paddingVertical: 18, textAlign: 'center', fontSize: 12, color: '#6b665c' }}>Todavía no hay movimientos en este vehículo</Text>}
          {activeTable === 'cuotas' && dc.noCuotas && <Text style={{ paddingVertical: 18, textAlign: 'center', fontSize: 12, color: '#6b665c' }}>No hay cuotas en este vehiculo</Text>}
          {activeRows.map((m) => (
            <MovRow key={m.id} m={m} />
          ))}
        </View>
        {activeTable === 'movs' ? (
          <Pagination page={movPage} pageSize={MOV_PAGE_SIZE} total={dc.movs.length} itemLabel="movimientos" onPageChange={setMovPage} />
        ) : (
          <Pagination page={cuotaPage} pageSize={CUOTA_PAGE_SIZE} total={dc.cuotas.length} itemLabel="cuotas" onPageChange={setCuotaPage} />
        )}
      </View>

    </View>
    <QuotaDetailSheet quota={v.quotaDetail} />
    <MovementDetailSheet movement={v.movementDetail} />
      {locationOpen && dc.location && <LocationHistoryModal carId={dc.car.id} plate={dc.plate} latest={dc.location} onClose={() => setLocationOpen(false)} />}
    </>
  );
}
