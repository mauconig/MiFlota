import { Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';
import { BrandIcon } from '../components/BrandIcon';
import { DateRangeInputs } from '../components/DateRangeInputs';
import { ChipRow } from '../components/ChipRow';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const AMBER = '#b5791a';
const RED = '#c0553f';
const GROUP_PAGE_SIZE = 3;
const ROW_PAGE_SIZE = 5;

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;

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
  return <Pressable onPress={onPress} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: MUTED, fontSize: 13, fontWeight: '700' }}>Atrás</Text></Pressable>;
}

export function Gastos({ v }: { v: MobileView }) {
  const g = v.gastos;
  const [groupPage, setGroupPage] = useState(0);
  const [rowPages, setRowPages] = useState<Record<string, number>>({});
  const vehicleOptions = g.sectionOptions;
  const groupsKey = useMemo(() => `${g.selectedCarLabel}|${g.selectedCategoryLabel}|${g.groups.map((group) => `${group.carId}:${group.rows.length}:${group.rows[0]?.id ?? ''}:${group.rows[group.rows.length - 1]?.id ?? ''}`).join('|')}`, [g.selectedCarLabel, g.selectedCategoryLabel, g.groups]);
  const groupPageCount = Math.max(1, Math.ceil(g.groups.length / GROUP_PAGE_SIZE));
  const visibleGroups = g.groups.slice(groupPage * GROUP_PAGE_SIZE, (groupPage + 1) * GROUP_PAGE_SIZE);

  useEffect(() => {
    setGroupPage(0);
    setRowPages({});
  }, [groupsKey]);

  useEffect(() => {
    setGroupPage((current) => Math.min(current, groupPageCount - 1));
  }, [groupPageCount]);

  useEffect(() => {
    setRowPages((current) => {
      let changed = false;
      const next = { ...current };
      for (const group of g.groups) {
        const lastPage = Math.max(0, Math.ceil(group.rows.length / ROW_PAGE_SIZE) - 1);
        const page = next[group.carId] ?? 0;
        if (page > lastPage) {
          next[group.carId] = lastPage;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [g.groups]);

  return (
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 14 }}>
      {g.step === 'period' && (
        <>
          <StepHeader step={1} title="¿Qué período querés ver?" />
          <View style={{ ...card, gap: 12 }}>
            <ChipRow chips={v.period.chips} wrap />
            <DateRangeInputs fromText={v.period.fromText} toText={v.period.toText} error={v.period.error} onFromChange={v.period.setFromText} onToChange={v.period.setToText} />
          </View>
          <Pressable onPress={() => { if (v.period.applyTextRange()) g.continuePeriod(); }} style={{ minHeight: 52, borderRadius: 18, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
          </Pressable>
        </>
      )}

      {g.step === 'vehicle' && (
        <>
          <StepHeader step={2} title="¿Qué sección querés ver?" />
          <View style={{ gap: 10 }}>
            <ChoiceCard key={g.allOption.id} label={g.allOption.label} sub={g.allOption.sub} selected={g.allOption.selected} onPress={g.allOption.pick} />
            {vehicleOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} brand={option.brand} selected={option.selected} onPress={option.pick} />)}
          </View>
          <Pressable disabled={!g.vehicleSelectionValid} onPress={g.continueVehicles} style={{ minHeight: 52, borderRadius: 18, backgroundColor: g.vehicleSelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
          </Pressable>
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
              <Pressable disabled={!g.categorySelectionValid} onPress={g.continueCategory} style={{ minHeight: 52, borderRadius: 18, backgroundColor: g.categorySelectionValid ? INK : '#d8d1c5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700' }}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {g.step === 'results' && (
        <>
          <StepHeader step={4} title="Estos son tus gastos" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={g.back} style={{ ...card, flex: 1, padding: 13 }}><Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Vehículo</Text><Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{g.selectedCarLabel}</Text></Pressable>
            <Pressable onPress={g.back} style={{ ...card, flex: 1, padding: 13 }}><Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Categoría</Text><Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{g.selectedCategoryLabel}</Text></Pressable>
          </View>

          {g.empty ? (
            <View style={{ ...card, alignItems: 'center', paddingVertical: 30, gap: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: INK }}>No hay gastos con estos filtros</Text>
              <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13 }}>Probá con otro vehículo o categoría, o registrá un gasto nuevo.</Text>
              <Pressable onPress={v.registroChoice.gasto} style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: PAPER, fontWeight: '700' }}>Registrar gasto</Text></Pressable>
            </View>
          ) : visibleGroups.map((group) => {
            const rowPage = rowPages[group.carId] ?? 0;
            const visibleRows = group.rows.slice(rowPage * ROW_PAGE_SIZE, (rowPage + 1) * ROW_PAGE_SIZE);
            return (
            <View key={group.carId} style={card}>
              <Pressable onPress={group.toggle} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View><Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>{group.plate}</Text><Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{group.rows.length} gasto{group.rows.length === 1 ? '' : 's'}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ color: RED, fontSize: 16, fontWeight: '800' }}>{group.total}</Text><Text style={{ color: MUTED, fontSize: 11 }}>{group.expanded ? 'Ocultar' : 'Ver gastos'}</Text></View>
              </Pressable>
              {group.expanded && visibleRows.map((row) => (
                <View key={row.id} style={{ borderTopWidth: 1, borderTopColor: '#f0ebe0', paddingTop: 10, marginTop: 6 }}>
                  <Pressable onPress={row.toggle} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={{ color: INK, fontSize: 13, fontWeight: '700' }}>{row.desc}</Text><Text style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{row.cat} · {row.date}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}><Text style={{ color: RED, fontWeight: '800' }}>{row.amount}</Text><Text style={{ color: AMBER, fontSize: 11 }}>{row.expanded ? 'Ocultar' : 'Detalle'}</Text></View>
                  </Pressable>
                  {row.expanded && <View style={{ backgroundColor: '#faf7f0', borderRadius: 13, padding: 11, gap: 6 }}>
                    {row.items.length === 0 ? <Text style={{ color: MUTED, fontSize: 12 }}>Sin repuestos detallados</Text> : row.items.map((item, i) => <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ flex: 1, fontSize: 12 }}>{item.cantidad} × {item.nombre}</Text><Text style={{ color: MUTED, fontSize: 12 }}>{item.costoUnitario} c/u</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{item.subtotal}</Text></View>)}
                    {row.items.length > 0 && <View style={{ borderTopWidth: 1, borderTopColor: '#e8dfd0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: MUTED, fontSize: 12 }}>Repuestos</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{row.repuestos}</Text></View>}
                    {!!row.manoObra && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: MUTED, fontSize: 12 }}>Mano de obra</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{row.manoObra}</Text></View>}
                  </View>}
                </View>
              ))}
              {group.expanded && <Pagination page={rowPage} pageSize={ROW_PAGE_SIZE} total={group.rows.length} itemLabel="gastos" onPageChange={(page) => setRowPages((current) => ({ ...current, [group.carId]: page }))} />}
            </View>
            );
          })}
          {!g.empty && <Pagination page={groupPage} pageSize={GROUP_PAGE_SIZE} total={g.groups.length} itemLabel="autos con gastos" onPageChange={setGroupPage} />}
          <BackLink onPress={g.back} />
        </>
      )}
    </View>
  );
}
