import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { Avatar } from '../components/Avatar';
import { AlertCard } from '../components/AlertCard';
import { MovRow } from '../components/MovRow';
import { Pagination } from '../components/Pagination';
import { QuotaDetailSheet } from '../components/QuotaDetailSheet';
import { LocationHistoryModal } from '../components/LocationHistoryModal';

const ALERT_PAGE_SIZE = 4;
const MOV_PAGE_SIZE = 5;
const GASTO_PAGE_SIZE = 5;

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
  const [cobroPage, setCobroPage] = useState(0);
  const [gastoPage, setGastoPage] = useState(0);
  const [activeTable, setActiveTable] = useState<'cobros' | 'gastos'>('cobros');
  const [locationOpen, setLocationOpen] = useState(false);
  useEffect(() => { setLocationOpen(false); }, [dc?.car.id]);
  const alertKey = useMemo(() => dc?.alerts.map((alert) => `${alert.txt}-${alert.sub}`).join('|') ?? '', [dc?.alerts]);
  const cobros = useMemo(() => dc?.movs.filter((mov) => mov.id.startsWith('pago-')) ?? [], [dc?.movs]);
  const gastos = useMemo(() => dc?.movs.filter((mov) => mov.id.startsWith('gasto-')) ?? [], [dc?.movs]);
  const cobroKey = useMemo(() => cobros.map((cobro) => String(cobro.id)).join('|'), [cobros]);
  const gastoKey = useMemo(() => gastos.map((gasto) => String(gasto.id)).join('|'), [gastos]);
  const alertPageCount = Math.max(1, Math.ceil((dc?.alerts.length ?? 0) / ALERT_PAGE_SIZE));
  const cobroPageCount = Math.max(1, Math.ceil(cobros.length / MOV_PAGE_SIZE));
  const gastoPageCount = Math.max(1, Math.ceil(gastos.length / GASTO_PAGE_SIZE));
  const visibleAlerts = dc?.alerts.slice(alertPage * ALERT_PAGE_SIZE, (alertPage + 1) * ALERT_PAGE_SIZE) ?? [];
  const visibleCobros = cobros.slice(cobroPage * MOV_PAGE_SIZE, (cobroPage + 1) * MOV_PAGE_SIZE);
  const visibleGastos = gastos.slice(gastoPage * GASTO_PAGE_SIZE, (gastoPage + 1) * GASTO_PAGE_SIZE);
  const activeRows = activeTable === 'cobros' ? visibleCobros : visibleGastos;
  const activeTitle = activeTable === 'cobros' ? 'Cobros' : 'Gastos';
  const activeCount = activeTable === 'cobros' ? cobros.length + ' en total' : gastos.length + ' en total';

  useEffect(() => {
    setAlertPage(0);
  }, [alertKey]);

  useEffect(() => {
    setCobroPage(0);
  }, [cobroKey]);

  useEffect(() => {
    setGastoPage(0);
  }, [gastoKey]);

  useEffect(() => {
    setAlertPage((current) => Math.min(current, alertPageCount - 1));
  }, [alertPageCount]);

  useEffect(() => {
    setCobroPage((current) => Math.min(current, cobroPageCount - 1));
  }, [cobroPageCount]);

  useEffect(() => {
    setGastoPage((current) => Math.min(current, gastoPageCount - 1));
  }, [gastoPageCount]);

  useEffect(() => {
    setActiveTable('cobros');
  }, [dc?.car.id]);

  useEffect(() => {
    if (!v.movementDetail) return;
    const isCobro = v.movementDetail.id.startsWith('pago-');
    setActiveTable(isCobro ? 'cobros' : 'gastos');
    const rows = isCobro ? cobros : gastos;
    const index = rows.findIndex((mov) => String(mov.id) === v.movementDetail?.id);
    if (index >= 0) {
      if (isCobro) setCobroPage(Math.floor(index / MOV_PAGE_SIZE));
      else setGastoPage(Math.floor(index / GASTO_PAGE_SIZE));
    }
  }, [cobros, gastos, v.movementDetail?.id]);

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
        <View style={{ backgroundColor: dc.location.stale ? '#fff9ec' : '#f2f8f4', borderWidth: 1, borderColor: dc.location.stale ? '#f2e4c6' : '#dcebe2', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: dc.location.stale ? '#f9ead0' : '#e7f2ec', alignItems: 'center', justifyContent: 'center' }}>
            <GpsIcon color={dc.location.stale ? '#a8730f' : '#2e7d5b'} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6b665c' }}>Última ubicación</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false} style={{ fontSize: 13, fontWeight: '700', marginTop: 2 }}>
              {dc.location.stale ? 'Desactualizada' : 'Auto localizado'}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false} style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }}>
              {dc.location.age}{dc.location.accuracy != null ? ' · precisión ±' + Math.round(dc.location.accuracy) + ' m' : ''}
            </Text>
          </View>
          <Pressable onPress={() => setLocationOpen(true)} style={{ borderRadius: 12, backgroundColor: '#16150f', paddingVertical: 9, paddingHorizontal: 11 }}>
            <Text style={{ color: '#fffdf8', fontSize: 12, fontWeight: '700' }}>Detalles</Text>
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
          accessibilityState={{ selected: activeTable === 'cobros' }}
          onPress={() => setActiveTable('cobros')}
          style={{ flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: activeTable === 'cobros' ? '#16150f' : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ color: activeTable === 'cobros' ? '#fffdf8' : '#6b665c', fontSize: 13, fontWeight: '700' }}>Cobros</Text>
          <Text style={{ color: activeTable === 'cobros' ? '#d8d1c2' : '#8b8478', fontSize: 11, marginTop: 1 }}>{cobros.length} en total</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeTable === 'gastos' }}
          onPress={() => setActiveTable('gastos')}
          style={{ flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: activeTable === 'gastos' ? '#16150f' : 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <Text style={{ color: activeTable === 'gastos' ? '#fffdf8' : '#6b665c', fontSize: 13, fontWeight: '700' }}>Gastos</Text>
          <Text style={{ color: activeTable === 'gastos' ? '#d8d1c2' : '#8b8478', fontSize: 11, marginTop: 1 }}>{gastos.length} en total</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>{activeTitle}</Text>
          <Text style={{ fontSize: 11, color: '#6b665c' }}>{activeCount}</Text>
        </View>
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
          {activeRows.length === 0 && <Text style={{ paddingVertical: 18, textAlign: 'center', fontSize: 12, color: '#6b665c' }}>{activeTable === 'cobros' ? 'Todavía no hay cobros en este vehículo' : 'Todavía no hay gastos en este vehículo'}</Text>}
          {activeRows.map((m) => (
            <MovRow key={m.id} m={m} />
          ))}
        </View>
        {activeTable === 'cobros' ? (
          <Pagination page={cobroPage} pageSize={MOV_PAGE_SIZE} total={cobros.length} itemLabel="cobros" onPageChange={setCobroPage} />
        ) : (
          <Pagination page={gastoPage} pageSize={GASTO_PAGE_SIZE} total={gastos.length} itemLabel="gastos" onPageChange={setGastoPage} />
        )}
      </View>

    </View>
    <QuotaDetailSheet quota={v.quotaDetail} />
      {locationOpen && dc.location && <LocationHistoryModal carId={dc.car.id} plate={dc.plate} latest={dc.location} onClose={() => setLocationOpen(false)} />}
    </>
  );
}
