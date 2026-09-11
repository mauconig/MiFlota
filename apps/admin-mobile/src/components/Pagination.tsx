import { Pressable, Text, View } from 'react-native';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel: string;
  compact?: boolean;
}

export function Pagination({ page, pageSize, total, onPageChange, itemLabel, compact = false }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  const canPrevious = page > 0;
  const canNext = page < pageCount - 1;

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36 }}>
        <PageButton compact label="‹" accessibilityLabel="Página anterior" disabled={!canPrevious} onPress={() => onPageChange(page - 1)} />
        <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: '#6b665c', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
          {first}-{last} de {total} {itemLabel} · {page + 1}/{pageCount}
        </Text>
        <PageButton compact label="›" accessibilityLabel="Página siguiente" disabled={!canNext} onPress={() => onPageChange(page + 1)} />
      </View>
    );
  }

  return (
    <View style={{ gap: 9, paddingTop: 4 }}>
      <Text style={{ color: '#6b665c', fontSize: 12, textAlign: 'center' }}>
        Mostrando {first}-{last} de {total} {itemLabel}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <PageButton label="‹" accessibilityLabel="Página anterior" disabled={!canPrevious} onPress={() => onPageChange(page - 1)} />
        <Text style={{ minWidth: 88, color: '#3d3a34', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
          Página {page + 1} de {pageCount}
        </Text>
        <PageButton label="›" accessibilityLabel="Página siguiente" disabled={!canNext} onPress={() => onPageChange(page + 1)} />
      </View>
    </View>
  );
}

function PageButton({ label, accessibilityLabel, disabled, onPress, compact = false }: { label: string; accessibilityLabel: string; disabled: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={{ width: compact ? 34 : 44, height: compact ? 34 : 44, borderRadius: compact ? 11 : 14, borderWidth: 1, borderColor: disabled ? '#eee8de' : '#d8cdb8', backgroundColor: disabled ? '#f7f3ec' : '#fffdf8', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.55 : 1 }}
    >
      <Text style={{ color: disabled ? '#a9a293' : '#16150f', fontSize: compact ? 19 : 24, lineHeight: compact ? 21 : 26, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}
