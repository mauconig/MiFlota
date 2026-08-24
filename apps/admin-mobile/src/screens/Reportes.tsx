import { Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import type { ReportInclude } from '../types';
import { Pagination } from '../components/Pagination';

const PAPER = '#fffdf8';
const BORDER = '#e6ded0';
const INK = '#16150f';
const MUTED = '#6b665c';
const SOFT = '#f4f0e8';
const PREVIEW_PAGE_SIZE = 5;

const includeOptions: { value: ReportInclude; title: string; description: string; icon: string }[] = [
  { value: 'gastos', title: 'Gastos', description: 'Repuestos, mano de obra y otros gastos', icon: '−' },
  { value: 'ingresos', title: 'Ingresos cobrados', description: 'Pagos que efectivamente entraron', icon: '+' },
  { value: 'ambos', title: 'Ambos', description: 'Gastos e ingresos en un mismo reporte', icon: '±' },
];

function Check({ active }: { active: boolean }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: active ? INK : '#cfc6b6', backgroundColor: active ? INK : PAPER, alignItems: 'center', justifyContent: 'center', flex: 0 }}>
      {active && <Text style={{ color: PAPER, fontSize: 15, fontWeight: '800', lineHeight: 18 }}>✓</Text>}
    </View>
  );
}

function OptionCard({ title, description, selected, onPress, icon }: { title: string; description: string; selected: boolean; onPress: () => void; icon?: string }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 72, borderWidth: 1.5, borderColor: selected ? INK : BORDER, backgroundColor: selected ? '#f0ece3' : PAPER, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icon && <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: selected ? INK : SOFT, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? PAPER : INK, fontSize: 22, fontWeight: '700' }}>{icon}</Text></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: INK, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{description}</Text>
      </View>
      <Check active={selected} />
    </Pressable>
  );
}

function ContinueButton({ label = 'Continuar', onPress, disabled = false, fixed = false }: { label?: string; onPress: () => void; disabled?: boolean; fixed?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ minHeight: 50, borderRadius: 17, backgroundColor: disabled ? '#d7d0c3' : INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, ...(fixed ? { position: 'absolute', left: 0, right: 0, bottom: 22, zIndex: 3, elevation: 3 } : {}) }}>
      <Text style={{ color: disabled ? '#8c8476' : PAPER, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function PeriodButton({ v }: { v: MobileView }) {
  return (
    <Pressable onPress={v.period.openSheet} style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={MUTED} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="5" width="18" height="16" rx="3" />
          <Path d="M8 3v4" />
          <Path d="M16 3v4" />
          <Path d="M3 11h18" />
        </Svg>
        <Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', flex: 1 }}>{v.period.label}</Text>
      </View>
      <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>{v.period.days}</Text>
    </Pressable>
  );
}

function SelectionLabel({ value, allLabel, countLabel }: { value: 'todos' | 'todas' | string[]; allLabel: string; countLabel: string }) {
  const label = value === 'todos' || value === 'todas' ? allLabel : value.length === 0 ? 'Ninguno elegido' : `${value.length} ${countLabel}${value.length === 1 ? '' : 's'} elegidos`;
  return <Text style={{ position: 'absolute', left: 0, right: 0, bottom: 76, color: MUTED, fontSize: 12 }}>{label}</Text>;
}

function previewMoney(value: number) {
  return `Gs. ${new Intl.NumberFormat('es-PY').format(Math.round(value))}`;
}

export function Reportes({ v }: { v: MobileView }) {
  const rep = v.reportes;
  const [previewPage, setPreviewPage] = useState(0);
  const previewKey = useMemo(() => rep.previewRows.map((row) => row.id).join('|'), [rep.previewRows]);
  const previewPageCount = Math.max(1, Math.ceil(rep.previewRows.length / PREVIEW_PAGE_SIZE));
  const visiblePreviewRows = rep.previewRows.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE);

  useEffect(() => {
    setPreviewPage(0);
  }, [previewKey]);

  useEffect(() => {
    setPreviewPage((current) => Math.min(current, previewPageCount - 1));
  }, [previewPageCount]);

  const isInclude = rep.step === 'include';
  const isCars = rep.step === 'cars';
  const isCategories = rep.step === 'categories';
  const isReview = rep.step === 'review';
  const totalSteps = rep.include === 'gastos' || rep.include === 'ambos' ? 4 : 3;
  const currentStep = isInclude ? 1 : isCars ? 2 : isCategories ? 3 : totalSteps;
  const includeLabel = rep.include === 'gastos' ? 'Gastos' : rep.include === 'ingresos' ? 'Ingresos cobrados' : rep.include === 'ambos' ? 'Gastos e ingresos cobrados' : 'Sin elegir';
  const carLabel = rep.carSelection === 'todos' ? 'Todos los vehículos' : `${rep.carSelection.length} vehículo${rep.carSelection.length === 1 ? '' : 's'}`;
  const categoryLabel = rep.categorySelection === 'todas' ? 'Todas las categorías' : `${rep.categorySelection.length} categoría${rep.categorySelection.length === 1 ? '' : 's'}`;

  return (
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 14 }}>
      <PeriodButton v={v} />

      <View style={{ gap: 4 }}>
        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Paso {currentStep} de {totalSteps}</Text>
        <Text style={{ color: INK, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>{isInclude ? '¿Qué querés ver?' : isCars ? '¿Qué vehículos querés incluir?' : isCategories ? '¿Qué gastos querés incluir?' : 'Revisá tu reporte'}</Text>
        <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18 }}>{isInclude ? 'Elegí el tipo de información que querés llevarte.' : isCars ? 'Podés elegir todos o sólo algunos.' : isCategories ? 'Elegí todas o sólo algunas categorías.' : 'Todo está listo para generar el archivo.'}</Text>
      </View>

      {isInclude && (
        <View style={{ gap: 10 }}>
          {includeOptions.map((option) => <OptionCard key={option.value} title={option.title} description={option.description} icon={option.icon} selected={rep.include === option.value} onPress={() => rep.setInclude(option.value)} />)}
        </View>
      )}

      {isCars && (
        <View style={{ flex: 1, minHeight: 0 }}>
          <ScrollView style={{ flex: 1, minHeight: 0, height: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 82 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <OptionCard title="Todos los vehículos" description="Incluye la flota completa" selected={rep.carSelection === 'todos'} onPress={rep.selectAllCars} />
          {rep.carOptions.map((car) => <OptionCard key={car.id} title={car.label} description={car.sub} selected={car.selected} onPress={car.toggle} />)}
          </ScrollView>
          <ContinueButton onPress={rep.next} fixed />
          <SelectionLabel value={rep.carSelection} allLabel="Toda la flota" countLabel="vehículo" />
        </View>
      )}

      {isCategories && (
        <View style={{ flex: 1, minHeight: 0 }}>
          <ScrollView style={{ flex: 1, minHeight: 0, height: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 82 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <OptionCard title="Todas las categorías" description="Incluye todos los gastos del período" selected={rep.categorySelection === 'todas'} onPress={rep.selectAllCategories} />
          {rep.categoryOptions.map((category) => <OptionCard key={category.label} title={category.label} description="Incluir en el reporte" selected={category.selected} onPress={category.toggle} />)}
          </ScrollView>
          <ContinueButton onPress={rep.next} fixed />
          <SelectionLabel value={rep.categorySelection} allLabel="Todas las categorías" countLabel="categoría" />
        </View>
      )}

      {isReview && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: MUTED, fontSize: 13 }}>Período</Text><Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' }}>{rep.periodLabel}</Text></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: MUTED, fontSize: 13 }}>Qué incluye</Text><Text style={{ color: INK, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' }}>{includeLabel}</Text></View>
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: MUTED, fontSize: 13 }}>Vehículos</Text><Text style={{ color: INK, fontSize: 13, fontWeight: '700' }}>{carLabel}</Text></View>
              <Text style={{ color: INK, fontSize: 12, lineHeight: 18 }}>{rep.selectedCarLabels.length ? rep.selectedCarLabels.join(' · ') : 'Ninguno elegido'}</Text>
            </View>
            {rep.include !== 'ingresos' && <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: MUTED, fontSize: 13 }}>Categorías</Text><Text style={{ color: INK, fontSize: 13, fontWeight: '700' }}>{categoryLabel}</Text></View>
              <Text style={{ color: INK, fontSize: 12, lineHeight: 18 }}>{rep.selectedCategoryLabels.length ? rep.selectedCategoryLabels.join(' · ') : 'Ninguna elegida'}</Text>
            </View>}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(rep.include === 'ingresos' || rep.include === 'ambos') && <View style={{ flex: 1, backgroundColor: '#e7f2ec', borderRadius: 16, padding: 13 }}><Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Ingresos</Text><Text style={{ color: '#256b4d', fontSize: 22, fontWeight: '800', marginTop: 3 }}>{rep.counts.ingresos}</Text><Text style={{ color: MUTED, fontSize: 11 }}>cobrados</Text></View>}
            {(rep.include === 'gastos' || rep.include === 'ambos') && <View style={{ flex: 1, backgroundColor: '#fdf0dd', borderRadius: 16, padding: 13 }}><Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Gastos</Text><Text style={{ color: '#a65b27', fontSize: 22, fontWeight: '800', marginTop: 3 }}>{rep.counts.gastos}</Text><Text style={{ color: MUTED, fontSize: 11 }}>registrados</Text></View>}
          </View>

          <View style={{ gap: 9 }}>
            <View>
              <Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>Datos que se van a exportar</Text>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>Esta lista coincide con los filtros elegidos.</Text>
            </View>
            {visiblePreviewRows.map((row) => (
              <View key={row.id} style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 13, gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: row.tipo === 'Ingreso' ? '#256b4d' : '#a65b27', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{row.tipo}</Text>
                  <Text style={{ color: INK, fontSize: 14, fontWeight: '800' }}>{previewMoney(row.monto)}</Text>
                </View>
                <Text style={{ color: MUTED, fontSize: 12 }}>{row.fecha} · {row.vehiculo}</Text>
                <Text style={{ color: INK, fontSize: 14, fontWeight: '700' }}>{row.detalle}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>{row.tipo === 'Ingreso' ? `Chofer: ${row.chofer} · Medio: ${row.medio}` : `Categoría: ${row.categoria}`}</Text>
                {!!row.nota && <Text style={{ color: MUTED, fontSize: 12 }}>Nota: {row.nota}</Text>}
                {!!row.items.length && <View style={{ backgroundColor: SOFT, borderRadius: 10, padding: 9, gap: 3 }}>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Repuestos</Text>
                  {row.items.map((item, index) => <Text key={`${row.id}-item-${index}`} style={{ color: INK, fontSize: 11 }}>{item.cantidad} x {item.nombre} · {previewMoney(item.costoUnitario)} c/u · {previewMoney(item.subtotal)}</Text>)}
                </View>}
                {!!row.manoObra && <Text style={{ color: MUTED, fontSize: 12 }}>Mano de obra: {previewMoney(row.manoObra)}</Text>}
              </View>
            ))}
            <Pagination page={previewPage} pageSize={PREVIEW_PAGE_SIZE} total={rep.previewRows.length} itemLabel="movimientos" onPageChange={setPreviewPage} />
          </View>

          <Text style={{ color: MUTED, fontSize: 13 }}>{rep.counts.total ? `Se exportarán ${rep.counts.total} movimientos con detalle completo.` : 'No hay datos para esta selección. Volvé atrás y probá otros filtros.'}</Text>
          {!!rep.error && <Text style={{ color: '#b34732', backgroundColor: '#fbe9e5', borderRadius: 12, padding: 12, fontSize: 13 }}>{rep.error}</Text>}
          <View style={{ gap: 10 }}>
            <ContinueButton label={rep.exporting ? 'Generando PDF…' : 'Generar PDF'} onPress={() => rep.exportFile('pdf')} disabled={rep.exporting || !rep.counts.total} />
            <Pressable disabled={rep.exporting || !rep.counts.total} onPress={() => rep.exportFile('xlsx')} style={{ minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: rep.exporting || !rep.counts.total ? '#d7d0c3' : BORDER, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: rep.exporting || !rep.counts.total ? '#8c8476' : INK, fontSize: 14, fontWeight: '700' }}>{rep.exporting ? 'Generando Excel…' : 'Generar Excel'}</Text>
            </Pressable>
          </View>
          <Pressable onPress={rep.reset} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: MUTED, fontSize: 13, fontWeight: '600' }}>Empezar de nuevo</Text></Pressable>
        </ScrollView>
      )}

      {!isReview && !isCars && !isCategories && <ContinueButton onPress={rep.next} />}
    </View>
  );
}
