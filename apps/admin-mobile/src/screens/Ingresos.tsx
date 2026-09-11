import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';
import { BrandIcon } from '../components/BrandIcon';
import { DateRangeInputs } from '../components/DateRangeInputs';
import { ChipRow } from '../components/ChipRow';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const TABLE_HEADER_HEIGHT = 46;
const TABLE_ROW_HEIGHT = 52;
const PAGINATION_HEIGHT = 36;
const BACK_LINK_HEIGHT = 24;
const RESULT_GAP = 6;
const MIN_ROWS_PER_PAGE = 1;
const MAX_ROWS_PER_PAGE = 12;

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;
type SortKey = 'plate' | 'section' | 'amount';
type SortDirection = 'asc' | 'desc';

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Paso {step} de 4</Text>
      <Text numberOfLines={2} style={{ color: INK, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
    </View>
  );
}

function ChoiceCard({ label, brand, selected, onPress }: { label: string; sub?: string; brand?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 58, borderWidth: 1.5, borderColor: selected ? INK : BORDER, backgroundColor: selected ? '#f0ece3' : PAPER, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {brand && <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: selected ? INK : '#f4f0e8', alignItems: 'center', justifyContent: 'center' }}><BrandIcon brand={brand} size={21} color={selected ? PAPER : INK} /></View>}
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
  return <Pressable onPress={onPress} style={{ minHeight: BACK_LINK_HEIGHT, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: MUTED, fontSize: 12, fontWeight: '700' }}>Atrás</Text></Pressable>;
}

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
    <Pressable onPress={() => onPress(sortKey)} accessibilityRole="button" accessibilityLabel={`Ordenar por ${label}`} style={{ width, flex, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start', gap: 2 }}>
      <Text numberOfLines={2} style={{ color: active ? INK : MUTED, fontSize: 9, lineHeight: 11, fontWeight: '800', letterSpacing: 0.25, textAlign: right ? 'right' : 'left', textTransform: 'uppercase' }}>{label}</Text>
      {active && <Text style={{ color: INK, fontSize: 10, fontWeight: '800' }}>{direction === 'asc' ? '↑' : '↓'}</Text>}
    </Pressable>
  );
}

export function Ingresos({ v }: { v: MobileView }) {
  const income = v.ingresos;
  const [tablePage, setTablePage] = useState(0);
  const [resultsHeight, setResultsHeight] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const tableRows = useMemo(() => {
    const sorted = [...income.rows];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'plate') comparison = a.plate.localeCompare(b.plate, 'es', { sensitivity: 'base' });
      else if (sortKey === 'section') comparison = a.section.localeCompare(b.section, 'es', { sensitivity: 'base' });
      else comparison = a.amountValue - b.amountValue;
      return (sortDirection === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
    });
    return sorted;
  }, [income.rows, sortKey, sortDirection]);
  const tableRowsKey = useMemo(() => `${sortKey}:${sortDirection}:${tableRows.map((row) => `${row.id}:${row.amountValue}`).join('|')}`, [sortKey, sortDirection, tableRows]);
  const rowsWithoutPagination = resultsHeight > 0
    ? Math.max(MIN_ROWS_PER_PAGE, Math.min(MAX_ROWS_PER_PAGE, Math.floor((resultsHeight - TABLE_HEADER_HEIGHT - BACK_LINK_HEIGHT - RESULT_GAP) / TABLE_ROW_HEIGHT)))
    : MIN_ROWS_PER_PAGE;
  const paginationNeeded = tableRows.length > rowsWithoutPagination;
  const footerHeight = BACK_LINK_HEIGHT + RESULT_GAP + (paginationNeeded ? PAGINATION_HEIGHT + RESULT_GAP : 0);
  const rowsPerPage = resultsHeight > 0
    ? Math.max(MIN_ROWS_PER_PAGE, Math.min(MAX_ROWS_PER_PAGE, Math.floor((resultsHeight - TABLE_HEADER_HEIGHT - footerHeight) / TABLE_ROW_HEIGHT)))
    : MIN_ROWS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const visibleRows = tableRows.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

  useEffect(() => setTablePage(0), [tableRowsKey]);
  useEffect(() => setTablePage((current) => Math.min(current, pageCount - 1)), [pageCount]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'amount' ? 'desc' : 'asc');
  };
  const handleResultsLayout = (event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    setResultsHeight((current) => current === height ? current : height);
  };

  return (
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: income.step === 'results' ? 0 : 18, gap: RESULT_GAP }}>
      {income.step === 'period' && (
        <>
          <StepHeader step={1} title="¿Qué período querés ver?" />
          <KeyboardAwareScrollView style={{ flex: 1, minHeight: 0 }} mode="layout" bottomOffset={32} extraKeyboardSpace={24} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ ...card, gap: 12 }}>
              <ChipRow chips={v.period.chips} wrap />
              <DateRangeInputs fromText={v.period.fromText} toText={v.period.toText} error={v.period.error} onFromChange={v.period.setFromText} onToChange={v.period.setToText} />
            </View>
            <Pressable onPress={() => { if (v.period.applyTextRange()) income.continuePeriod(); }} style={{ minHeight: 52, borderRadius: 18, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
            </Pressable>
          </KeyboardAwareScrollView>
        </>
      )}

      {income.step === 'vehicle' && (
        <>
          <StepHeader step={2} title="¿Qué sección querés ver?" />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <ChoiceCard label={income.allOption.label} sub={income.allOption.sub} selected={income.allOption.selected} onPress={income.allOption.pick} />
              {income.sectionOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} brand={option.brand} selected={option.selected} onPress={option.pick} />)}
            </ScrollView>
            <View style={{ paddingTop: 10, paddingBottom: 2, backgroundColor: '#f4f0e8' }}>
              <Pressable disabled={!income.vehicleSelectionValid} onPress={income.continueVehicles} style={{ minHeight: 52, borderRadius: 18, backgroundColor: income.vehicleSelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {income.step === 'category' && (
        <>
          <StepHeader step={3} title="¿Qué tipo de ingreso querés ver?" />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {income.categoryOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} selected={option.selected} onPress={option.pick} />)}
            </ScrollView>
            <View style={{ paddingTop: 10, paddingBottom: 2, backgroundColor: '#f4f0e8' }}>
              <Pressable disabled={!income.categorySelectionValid} onPress={income.continueCategory} style={{ minHeight: 52, borderRadius: 18, backgroundColor: income.categorySelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {income.step === 'results' && (
        <>
          <StepHeader step={4} title="Estos son tus ingresos" />
          {income.rows.length === 0 ? (
            <View style={{ ...card, alignItems: 'center', paddingVertical: 30, gap: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: INK }}>No hay ingresos con estos filtros</Text>
              <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13 }}>Probá con otro vehículo o tipo de ingreso, o registrá un cobro nuevo.</Text>
              <Pressable onPress={v.registroChoice.cobro} style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: PAPER, fontWeight: '700' }}>Registrar cobro</Text></Pressable>
            </View>
          ) : (
            <View style={{ flex: 1, minHeight: 0 }} onLayout={handleResultsLayout}>
              <View style={{ gap: RESULT_GAP }}>
                <View style={[card, { padding: 0, overflow: 'hidden' }]}>
                  <View style={{ height: TABLE_HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, backgroundColor: '#f7f3eb', borderBottomWidth: 1, borderBottomColor: BORDER }}>
                    <SortHeader label="Chapa" sortKey="plate" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={76} />
                    <SortHeader label="Sección" sortKey="section" activeKey={sortKey} direction={sortDirection} onPress={changeSort} flex={1} />
                    <SortHeader label="Ingreso" sortKey="amount" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={82} right />
                  </View>
                  {visibleRows.map((row, index) => (
                    <Pressable key={row.id} onPress={row.open} accessibilityRole="button" accessibilityLabel={`Ver ingreso del vehículo ${row.plate}`} style={{ height: TABLE_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderBottomWidth: index === visibleRows.length - 1 ? 0 : 1, borderBottomColor: '#f0ebe0' }}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false} style={{ width: 76, color: INK, fontSize: 12, fontWeight: '700' }}>{row.plate}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ flex: 1, minWidth: 0, color: MUTED, fontSize: 11, fontWeight: '600' }}>{row.section}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} allowFontScaling={false} style={{ width: 82, color: row.color, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{row.amount}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pagination page={tablePage} pageSize={rowsPerPage} total={tableRows.length} itemLabel="vehículos" onPageChange={setTablePage} compact />
                <BackLink onPress={income.back} />
              </View>
            </View>
          )}
          {income.rows.length === 0 && <BackLink onPress={income.back} />}
        </>
      )}
    </View>
  );
}
