import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion } from '../../api';
import { Card } from '../../components/Card';
import { ChipRow } from '../../components/ChipRow';
import { TabHeader } from '../../components/Header';
import { SkeletonPayments } from '../../components/Skeleton';
import { fmtD, fmtG, plural } from '../../format';
import { COLORS } from '../../theme';
import type { Pago } from '../../types';

const FILTROS: { dias: number; label: string }[] = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 3650, label: 'Todo' },
];

export default function Pagos() {
  const { me, token, sesionVencida } = useAuth();
  const router = useRouter();
  const [dias, setDias] = useState(30);
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const r = await api.getPagos(token, dias);
      setPagos(r);
    } catch (e) {
      if (e instanceof SinSesion) sesionVencida();
    } finally {
      setCargando(false);
    }
  }, [token, dias, sesionVencida]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const cuota = me?.cuota ?? 0;
  const totalPeriodo = (pagos ?? []).reduce((a, p) => a + p.monto, 0);
  const diasCubiertos = cuota > 0 ? Math.round(totalPeriodo / cuota) : 0;

  if (cargando && !pagos) {
    return (
      <View style={{ flex: 1 }}>
        <TabHeader title="Mis pagos" sub="Cargando…" initials={me ? initials(me.driver) : ''} onPerfil={() => router.push('/(app)/perfil' as never)} />
        <SkeletonPayments />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TabHeader
        title="Mis pagos"
        sub="Todo confirmado"
        initials={me ? initials(me.driver) : ''}
        onPerfil={() => router.push('/(app)/perfil' as never)}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textMuted} />}
      >
        <ChipRow
          wrap={false}
          chips={FILTROS.map((f) => ({ label: f.label, selected: dias === f.dias, pick: () => setDias(f.dias) }))}
        />

        <Card style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Pagado en el período</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 2 }}>{fmtG(totalPeriodo)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Días cubiertos (aprox.)</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 2 }}>{diasCubiertos}</Text>
          </View>
        </Card>

        <Card style={{ paddingVertical: 2, paddingHorizontal: 15 }}>
          {(pagos ?? []).length === 0 ? (
            <Text style={{ fontSize: 13, color: COLORS.textMuted, paddingVertical: 16 }}>Todavía no registraste ningún pago.</Text>
          ) : (
            (pagos ?? []).map((p, i) => {
              const diasAprox = cuota > 0 ? Math.max(1, Math.round(p.monto / cuota)) : null;
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: i === (pagos?.length ?? 0) - 1 ? 0 : 1,
                    borderBottomColor: '#f4efe4',
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.greenBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.green, fontSize: 16 }}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>{fmtD(p.fecha)}{p.fecha === hoy ? ' · hoy' : ''}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                      {diasAprox ? plural(diasAprox, 'día', 'días') + ' · ' : ''}
                      {p.medio || (p.tipo === 'ajuste' ? 'Ajuste' : '—')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>{fmtG(p.monto)}</Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
