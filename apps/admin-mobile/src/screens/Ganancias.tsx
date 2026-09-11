import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const TABLE_HEADER_HEIGHT = 46;
const TABLE_ROW_HEIGHT = 52;
const TOTAL_ROW_HEIGHT = 46;
const PAGINATION_HEIGHT = 36;
const BACK_LINK_HEIGHT = 24;
const RESULT_GAP = 6;
const MIN_ROWS_PER_PAGE = 1;
const MAX_ROWS_PER_PAGE = 12;

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;
type SortKey = 'plate' | 'section' | 'amount';
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

function BackLink({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ minHeight: BACK_LINK_HEIGHT, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: MUTED, fontSize: 12, fontWeight: '700' }}>Atrás</Text></Pressable>;
}

export function Ganancias({ v }: { v: MobileView }) {
  const g = v.ganancias;
  const [tablePage, setTablePage] = useState(0);
  const [resultsHeight, setResultsHeight] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const tableRows = useMemo(() => {
    const sorted = [...g.rows];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'plate') comparison = a.plate.localeCompare(b.plate, 'es', { sensitivity: 'base' });
      else if (sortKey === 'section') comparison = a.section.localeCompare(b.section, 'es', { sensitivity: 'base' });
      else comparison = a.amountValue - b.amountValue;
      return (sortDirection === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
    });
    return sorted;
  }, [g.rows, sortKey, sortDirection]);
  const tableRowsKey = useMemo(() => `${sortKey}:${sortDirection}:${tableRows.map((row) => `${row.id}:${row.amountValue}`).join('|')}`, [sortKey, sortDirection, tableRows]);
  const rowsWithoutPagination = resultsHeight > 0
    ? Math.max(MIN_ROWS_PER_PAGE, Math.min(MAX_ROWS_PER_PAGE, Math.floor((resultsHeight - TABLE_HEADER_HEIGHT - TOTAL_ROW_HEIGHT - BACK_LINK_HEIGHT - RESULT_GAP) / TABLE_ROW_HEIGHT)))
    : MIN_ROWS_PER_PAGE;
  const paginationNeeded = tableRows.length > rowsWithoutPagination;
  const footerHeight = TOTAL_ROW_HEIGHT + BACK_LINK_HEIGHT + RESULT_GAP + (paginationNeeded ? PAGINATION_HEIGHT + RESULT_GAP : 0);
  const rowsPerPage = resultsHeight > 0
    ? Math.max(MIN_ROWS_PER_PAGE, Math.min(MAX_ROWS_PER_PAGE, Math.floor((resultsHeight - TABLE_HEADER_HEIGHT - footerHeight) / TABLE_ROW_HEIGHT)))
    : MIN_ROWS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const visibleRows = tableRows.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

  useEffect(() => {
    setTablePage(0);
  }, [tableRowsKey]);

  useEffect(() => {
    setTablePage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

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
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0, gap: RESULT_GAP }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Detalle de sección</Text>
        <Text numberOfLines={2} style={{ color: INK, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 }}>Ganancia por sección</Text>
        <Text numberOfLines={1} style={{ color: MUTED, fontSize: 12 }}>{g.sectionLabel} · {g.periodLabel}</Text>
      </View>

      {g.rows.length === 0 ? (
        <View style={{ ...card, alignItems: 'center', paddingVertical: 30, gap: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: INK }}>No hay vehículos en esta sección</Text>
          <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13 }}>No hay ganancias para mostrar en el período seleccionado.</Text>
          <BackLink onPress={v.back} />
        </View>
      ) : (
        <View style={{ flex: 1, minHeight: 0 }} onLayout={handleResultsLayout}>
          <View style={{ gap: RESULT_GAP }}>
            <View style={[card, { padding: 0, overflow: 'hidden' }]}>
              <View style={{ height: TABLE_HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, backgroundColor: '#f7f3eb', borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <SortHeader label="Chapa" sortKey="plate" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={76} />
                <SortHeader label="Sección" sortKey="section" activeKey={sortKey} direction={sortDirection} onPress={changeSort} flex={1} />
                <SortHeader label="Ganancia" sortKey="amount" activeKey={sortKey} direction={sortDirection} onPress={changeSort} width={82} right />
              </View>
              {visibleRows.map((row, index) => (
                <Pressable
                  key={row.id}
                  onPress={row.open}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ganancia del vehículo ${row.plate}`}
                  style={{ height: TABLE_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderBottomWidth: index === visibleRows.length - 1 ? 0 : 1, borderBottomColor: '#f0ebe0' }}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} allowFontScaling={false} style={{ width: 76, color: INK, fontSize: 12, fontWeight: '700' }}>{row.plate}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ flex: 1, minWidth: 0, color: MUTED, fontSize: 11, fontWeight: '600' }}>{row.section}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} allowFontScaling={false} style={{ width: 82, color: row.color, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{row.amount}</Text>
                </Pressable>
              ))}
              <View style={{ height: TOTAL_ROW_HEIGHT, borderTopWidth: 1, borderTopColor: '#e5ded2', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, backgroundColor: '#faf7f0' }}>
                <Text style={{ width: 76, color: INK, fontSize: 13, fontWeight: '800' }}>Total</Text>
                <View style={{ flex: 1, minWidth: 0 }} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} allowFontScaling={false} style={{ width: 82, color: INK, fontSize: 14, fontWeight: '800', textAlign: 'right' }}>{g.total}</Text>
              </View>
            </View>
            <Pagination page={tablePage} pageSize={rowsPerPage} total={tableRows.length} itemLabel="vehículos" onPageChange={setTablePage} compact />
            <BackLink onPress={v.back} />
          </View>
        </View>
      )}
    </View>
  );
}
