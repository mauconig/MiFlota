import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';
import { BrandIcon } from '../components/BrandIcon';
import { DateRangeInputs } from '../components/DateRangeInputs';
import { ChipRow } from '../components/ChipRow';
import { BackButton } from '../components/BackButton';
import { fmt } from '../format';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const RED = '#c0553f';
const TABLE_HEADER_HEIGHT = 40;
const TABLE_ROW_HEIGHT = 37;
const TOTAL_ROW_HEIGHT = 40;
// The results footer is intentionally compact so the table and its controls
// remain visible together on small screens.
const RESULT_GAP = 6;
const MIN_ROWS_PER_PAGE = 1;
const MAX_ROWS_PER_PAGE = 12;

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;
type SortKey = 'date' | 'plate' | 'tipo' | 'amount';
type SortDirection = 'asc' | 'desc';

function SortHeader({ label, sortKey, activeKey, direction, onPress, width, flex, right = false }: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onPress: (key: SortKey) => void;
  width?: number;
  flex?: number;
  right?: boolean;
}) {
  const active = sortKey === activeKey;
  return (
    <Pressable
      onPress={() => onPress(sortKey)}
      accessibilityRole="button"
      accessibilityLabel={`Ordenar por ${label}`}
      style={{ width, flex, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start', gap: 2 }}
    >
      <Text numberOfLines={2} style={{ color: active ? INK : MUTED, fontSize: 9, lineHeight: 11, fontWeight: '800', letterSpacing: 0.25, textAlign: right ? 'right' : 'left', textTransform: 'uppercase' }}>{label}</Text>
      {active && <Text style={{ color: INK, fontSize: 10, fontWeight: '800' }}>{direction === 'asc' ? '↑' : '↓'}</Text>}
    </Pressable>
  );
}

function StepHeader({ step, title, total = 4 }: { step: number; title: string; total?: number }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Paso {step} de {total}</Text>
      <Text numberOfLines={2} style={{ color: INK, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
    </View>
  );
}

function ChoiceCard({ label, brand, selected, onPress }: { label: string; sub: string; brand?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 58, borderWidth: 1.5, borderColor: selected ? INK : BORDER, backgroundColor: selected ? '#f0ece3' : PAPER, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {brand && <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: selected ? INK : '#f4f0e8', alignItems: 'center', justifyContent: 'center', flex: 0 }}><BrandIcon brand={brand} size={21} color={selected ? PAPER : INK} /></View>}
      <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
        <Text numberOfLines={2} style={{ color: INK, fontSize: 16, lineHeight: 20, fontWeight: '700', flexShrink: 1 }}>{label}</Text>
      </View>
      <View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: selected ? INK : '#cfc6b6', backgroundColor: selected ? INK : PAPER, alignItems: 'center', justifyContent: 'center' }}>
        {selected && <Text style={{ color: PAPER, fontSize: 15, fontWeight: '800', lineHeight: 18 }}>✓</Text>}
      </View>
    </Pressable>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return <BackButton onPress={onPress} label="Atrás" style={{ alignSelf: 'flex-end', marginBottom: 22 }} />;
}

export function Gastos({ v }: { v: MobileView }) {
  const g = v.gastos;
  const [tablePage, setTablePage] = useState(0);
  const [rowsAreaHeight, setRowsAreaHeight] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const vehicleOptions = g.sectionOptions;
  const allTableRows = useMemo(
    () => g.groups.flatMap((group) => group.rows.map((row) => ({ ...row, plate: group.plate, section: group.section }))),
    [g.groups],
  );
  const tableRows = useMemo(() => {
    const sorted = [...allTableRows];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'date') comparison = a.dateValue - b.dateValue;
      else if (sortKey === 'amount') comparison = a.amountValue - b.amountValue;
      else if (sortKey === 'plate') comparison = a.plate.localeCompare(b.plate, 'es', { sensitivity: 'base' });
      else comparison = a.cat.localeCompare(b.cat, 'es', { sensitivity: 'base' });
      return (sortDirection === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
    });
    return sorted;
  }, [allTableRows, sortKey, sortDirection]);
  const tableRowsKey = useMemo(() => `${sortKey}:${sortDirection}:${tableRows.map((row) => `${row.id}:${row.date}:${row.amount}:${row.plate}`).join('|')}`, [sortKey, sortDirection, tableRows]);
  const gastosTotal = useMemo(() => fmt(tableRows.reduce((sum, row) => sum + row.amountValue, 0)), [tableRows]);
  // El alto sale del área de filas ya medida, no de restar estimaciones al alto
  // total: así no se pierde una fila por el redondeo y el espacio se aprovecha.
  // Si entran todas las filas, la tarjeta se encoge al contenido en vez de
  // estirarse y dejar un hueco entre la última fila y el Total.
  const rowsCapacity = rowsAreaHeight > 0
    ? Math.max(MIN_ROWS_PER_PAGE, Math.min(MAX_ROWS_PER_PAGE, Math.floor(rowsAreaHeight / TABLE_ROW_HEIGHT)))
    : MIN_ROWS_PER_PAGE;
  const paginated = tableRows.length > rowsCapacity;
  const rowsPerPage = paginated ? rowsCapacity : Math.max(MIN_ROWS_PER_PAGE, tableRows.length);
  const tablePageCount = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const visibleTableRows = tableRows.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

  useEffect(() => {
    setTablePage(0);
  }, [tableRowsKey]);

  useEffect(() => {
    setTablePage((current) => Math.min(current, tablePageCount - 1));
  }, [tablePageCount]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'date' || key === 'amount' ? 'desc' : 'asc');
  };

  const handleRowsLayout = (event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    setRowsAreaHeight((current) => current === height ? current : height);
  };

  return (
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: g.step === 'results' ? 0 : 18, gap: RESULT_GAP }}>
      {g.step === 'period' && (
        <>
          <StepHeader step={1} title="¿Qué período querés ver?" />
          <KeyboardAwareScrollView style={{ flex: 1, minHeight: 0 }} mode="layout" bottomOffset={32} extraKeyboardSpace={24} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ ...card, gap: 12 }}>
              <ChipRow chips={v.period.chips} wrap />
              <DateRangeInputs fromText={v.period.fromText} toText={v.period.toText} error={v.period.error} onFromChange={v.period.setFromText} onToChange={v.period.setToText} />
            </View>
            <Pressable onPress={() => { if (v.period.applyTextRange()) g.continuePeriod(); }} style={{ minHeight: 52, borderRadius: 18, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
            </Pressable>
          </KeyboardAwareScrollView>
        </>
      )}

      {g.step === 'vehicle' && (
        <>
          <StepHeader step={2} title="¿Qué sección querés ver?" />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <ChoiceCard key={g.allOption.id} label={g.allOption.label} sub={g.allOption.sub} selected={g.allOption.selected} onPress={g.allOption.pick} />
              {vehicleOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} brand={option.brand} selected={option.selected} onPress={option.pick} />)}
            </ScrollView>
            <View style={{ paddingTop: 10, paddingBottom: 2, backgroundColor: '#f4f0e8' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BackButton onPress={g.back} />
                <Pressable disabled={!g.vehicleSelectionValid} onPress={g.continueVehicles} style={{ flex: 1, minHeight: 52, borderRadius: 18, backgroundColor: g.vehicleSelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}

      {g.step === 'category' && (
        <>
          <StepHeader step={3} title="¿Qué categoría querés ver?" />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {g.categoryOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} selected={option.selected} onPress={option.pick} />)}
            </ScrollView>
            <View style={{ paddingTop: 10, paddingBottom: 2, backgroundColor: '#f4f0e8' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BackButton onPress={g.back} />
                <Pressable disabled={!g.categorySelectionValid} onPress={g.continueCategory} style={{ flex: 1, minHeight: 52, borderRadius: 18, backgroundColor: g.categorySelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}

      {g.step === 'results' && (
        <>
          <StepHeader step={4} title="Estos son tus gastos" />

          {g.empty ? (
            <View style={{ ...card, alignItems: 'center', paddingVertical: 30, gap: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: INK }}>No hay gastos con estos filtros</Text>
              <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13 }}>Probá con otro vehículo o categoría, o registrá un gasto nuevo.</Text>
              <Pressable onPress={v.registroChoice.gasto} style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: PAPER, fontWeight: '700' }}>Registrar gasto</Text></Pressable>
            </View>
          ) : (
            <View style={{ flex: 1, minHeight: 0, gap: RESULT_GAP }}>
              <View style={[card, { padding: 0, overflow: 'hidden' }, paginated ? { flex: 1, minHeight: 0 } : null]}>
                <View style={{ height: TABLE_HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, backgroundColor: '#f7f3eb', borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <SortHeader label="Fecha" sortKey="date" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={68} />
                  <SortHeader label="Chapa" sortKey="plate" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={66} />
                  <SortHeader label="Tipo" sortKey="tipo" activeKey={sortKey} direction={sortDirection} onPress={changeSort} flex={1} />
                  <SortHeader label="Monto" sortKey="amount" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={60} right />
                </View>
                <View style={paginated ? { flex: 1, minHeight: 0 } : undefined} onLayout={handleRowsLayout}>
                  {visibleTableRows.map((row, index) => (
                    <Pressable
                      key={row.id}
                      onPress={row.open}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver detalle del movimiento de ${row.plate}`}
                      style={{ height: TABLE_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderBottomWidth: index === visibleTableRows.length - 1 ? 0 : 1, borderBottomColor: '#f0ebe0' }}
                    >
                      <Text numberOfLines={1} style={{ width: 68, color: MUTED, fontSize: 11 }}>{row.date}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false} style={{ width: 66, color: INK, fontSize: 12, fontWeight: '700' }}>{row.plate}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ flex: 1, minWidth: 0, color: MUTED, fontSize: 11, fontWeight: '600' }}>{row.cat}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: 60, color: RED, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{row.amount}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ height: TOTAL_ROW_HEIGHT, borderTopWidth: 1, borderTopColor: '#e5ded2', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, backgroundColor: '#faf7f0' }}>
                  <Text style={{ width: 68, color: INK, fontSize: 13, fontWeight: '800' }}>Total</Text>
                  <View style={{ flex: 1, minWidth: 0 }} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: 60, color: RED, fontSize: 14, fontWeight: '800', textAlign: 'right' }}>{gastosTotal}</Text>
                </View>
              </View>
              <Pagination page={tablePage} pageSize={rowsPerPage} total={tableRows.length} itemLabel="movimientos" onPageChange={setTablePage} compact />
              <BackLink onPress={g.back} />
            </View>
          )}
          {g.empty && <BackLink onPress={g.back} />}
        </>
      )}
    </View>
  );
}
