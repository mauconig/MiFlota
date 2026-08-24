import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const AMBER = '#b5791a';
const RED = '#c0553f';
const GROUP_PAGE_SIZE = 3;

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;

function PeriodButton({ v }: { v: MobileView }) {
  return (
    <Pressable onPress={v.period.openSheet} style={{ ...card, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>Período</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 3, color: INK }}>{v.period.label}</Text>
      </View>
      <Text style={{ color: AMBER, fontWeight: '700' }}>Cambiar</Text>
    </Pressable>
  );
}

function StepHeader({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Paso {step} de 3</Text>
      <Text numberOfLines={2} style={{ color: INK, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
      <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18 }}>{hint}</Text>
    </View>
  );
}

function ChoiceCard({ label, sub, selected, onPress }: { label: string; sub: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 72, borderWidth: 1.5, borderColor: selected ? INK : BORDER, backgroundColor: selected ? '#f0ece3' : PAPER, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: INK, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        <Text numberOfLines={2} style={{ color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{sub}</Text>
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
  const groupsKey = useMemo(() => `${g.selectedCarLabel}|${g.selectedCategoryLabel}|${g.groups.map((group) => group.carId).join('|')}`, [g.selectedCarLabel, g.selectedCategoryLabel, g.groups]);
  const groupPageCount = Math.max(1, Math.ceil(g.groups.length / GROUP_PAGE_SIZE));
  const visibleGroups = g.groups.slice(groupPage * GROUP_PAGE_SIZE, (groupPage + 1) * GROUP_PAGE_SIZE);

  useEffect(() => {
    setGroupPage(0);
  }, [groupsKey]);

  useEffect(() => {
    setGroupPage((current) => Math.min(current, groupPageCount - 1));
  }, [groupPageCount]);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 14 }}>
      <PeriodButton v={v} />

      {g.step === 'vehicle' && (
        <>
          <StepHeader step={1} title="¿Qué vehículo querés ver?" hint="Elegí un vehículo o mirá toda la flota." />
          <View style={{ gap: 10 }}>
            {g.carOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} selected={option.selected} onPress={option.pick} />)}
          </View>
        </>
      )}

      {g.step === 'category' && (
        <>
          <StepHeader step={2} title="¿Qué categoría querés ver?" hint={`Vehículo elegido: ${g.selectedCarLabel}`} />
          <View style={{ gap: 10 }}>
            {g.categoryOptions.map((option) => <ChoiceCard key={option.id} label={option.label} sub={option.sub} selected={option.selected} onPress={option.pick} />)}
          </View>
          <BackLink onPress={g.back} />
        </>
      )}

      {g.step === 'results' && (
        <>
          <StepHeader step={3} title="Estos son tus gastos" hint={`${g.selectedCarLabel} · ${g.selectedCategoryLabel}`} />
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
          ) : visibleGroups.map((group) => (
            <View key={group.carId} style={card}>
              <Pressable onPress={group.toggle} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View><Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>{group.plate}</Text><Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{group.rows.length} gasto{group.rows.length === 1 ? '' : 's'}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ color: RED, fontSize: 16, fontWeight: '800' }}>{group.total}</Text><Text style={{ color: MUTED, fontSize: 11 }}>{group.expanded ? 'Ocultar' : 'Ver gastos'}</Text></View>
              </Pressable>
              {group.expanded && group.rows.map((row) => (
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
            </View>
          ))}
          {!g.empty && <Pagination page={groupPage} pageSize={GROUP_PAGE_SIZE} total={g.groups.length} itemLabel="autos con gastos" onPageChange={setGroupPage} />}
          <BackLink onPress={g.back} />
        </>
      )}
    </View>
  );
}
