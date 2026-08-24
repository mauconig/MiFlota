import { useCallback, useState } from 'react';
import { RefreshControl, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion } from '../../api';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TabHeader } from '../../components/Header';
import { SkeletonDashboard } from '../../components/Skeleton';
import { fmtG, fmtD, fmtHoy, mesLabel } from '../../format';
import { COLORS } from '../../theme';
import type { Resumen } from '../../types';
import { notifyKilometrajePendiente, scheduleKilometrajeReminder } from '../../notifications';

const ESTADO_TAG: Record<Resumen['estado'], { label: string; bg: string; fg: string }> = {
  atrasado: { label: 'Atrasado', bg: COLORS.redDark, fg: COLORS.onDark },
  adelantado: { label: 'Adelantado', bg: COLORS.green, fg: COLORS.onDark },
  al_dia: { label: 'Al día', bg: COLORS.green, fg: COLORS.onDark },
};

function AlertIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.onDark} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 8v5" />
      <Path d="M12 17h.01" />
    </Svg>
  );
}

export default function Inicio() {
  const { me, token, sesionVencida } = useAuth();
  const router = useRouter();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kmInput, setKmInput] = useState('');
  const [guardandoKm, setGuardandoKm] = useState(false);
  const [kmError, setKmError] = useState('');

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.getResumen(token);
      setResumen(r);
      setKmInput(String(r.kilometraje));
      if (r.kilometrajeVencido) void notifyKilometrajePendiente();
      else void scheduleKilometrajeReminder();
    } catch (e) {
      if (e instanceof SinSesion) sesionVencida();
    } finally {
      setCargando(false);
    }
  }, [token, sesionVencida]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }, [cargar]);

  const guardarKilometraje = async () => {
    if (!token || guardandoKm) return;
    const km = Number(kmInput.replace(/\D/g, ''));
    if (!Number.isInteger(km) || km < resumen!.kilometraje) {
      setKmError('Ingresá un kilometraje válido y no menor al anterior.');
      return;
    }
    setKmError('');
    setGuardandoKm(true);
    try {
      await api.postKilometraje(token, km);
      await cargar();
    } catch (e) {
      if (e instanceof SinSesion) sesionVencida();
      else setKmError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardandoKm(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (cargando && !resumen) {
    return (
      <View style={{ flex: 1 }}>
        <TabHeader title="Cargando…" sub="" initials="" onPerfil={() => {}} />
        <SkeletonDashboard />
      </View>
    );
  }

  if (!resumen || !me) return null;

  const tag = ESTADO_TAG[resumen.estado];
  const primerNombre = me.driver.split(' ')[0];
  const balanceLabel = resumen.estado === 'adelantado' ? 'Pagado por adelantado' : 'Saldo pendiente';
  const balanceAmt = resumen.estado === 'atrasado' ? resumen.deuda : resumen.estado === 'adelantado' ? resumen.aFavor : 0;
  const pct = resumen.diasTranscurridos > 0 ? Math.min(100, Math.round((resumen.diasPagados / resumen.diasTranscurridos) * 100)) : 0;

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={`Hola, ${primerNombre}`} sub={fmtHoy()} initials={initials(me.driver)} onPerfil={() => router.push('/(app)/perfil' as never)} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textMuted} />}
      >
        {resumen.estado === 'atrasado' && (
          <View style={{ backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: '#f0d0c6', borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.redDark, alignItems: 'center', justifyContent: 'center' }}>
              <AlertIcon />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.red }}>Estás atrasado con tu cuota</Text>
                <Text style={{ fontSize: 12, color: COLORS.redText, marginTop: 2, lineHeight: 17 }}>Debés {fmtG(resumen.deuda)}.</Text>
              </View>
              <PrimaryButton label="Pagar ahora" variant="dark" onPress={() => router.push('/(app)/pagar' as never)} />
            </View>
          </View>
        )}

        <Card dark>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.onDarkMuted }}>{balanceLabel}</Text>
            <View style={{ backgroundColor: tag.bg, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: tag.fg }}>{tag.label}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.4, color: COLORS.onDark, marginTop: 14 }}>{fmtG(balanceAmt)}</Text>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, marginTop: 14, borderTopWidth: 1, borderTopColor: '#333024' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: COLORS.onDarkMuted }}>{resumen.estado === 'atrasado' ? 'Vencido desde' : 'Días pagados'}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.onDark, marginTop: 2 }}>
                {resumen.estado === 'atrasado' && resumen.atrasadoDesde ? fmtD(resumen.atrasadoDesde) : `${resumen.diasPagados} de ${resumen.diasTranscurridos}`}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: COLORS.onDarkMuted }}>Cuota diaria</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.onDark, marginTop: 2 }}>{fmtG(resumen.cuota)}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <PrimaryButton label="Pagar cuota" onPress={() => router.push('/(app)/pagar' as never)} />
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{mesLabel(new Date().toISOString().slice(0, 10))}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              {resumen.diasPagados} de {resumen.diasTranscurridos} días
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#f0ebe0', overflow: 'hidden', marginTop: 11 }}>
            <View style={{ height: '100%', borderRadius: 4, backgroundColor: COLORS.green, width: `${pct}%` }} />
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 11 }}>Pagaste {fmtG(resumen.cobradoMes)} este mes.</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>Kilometraje</Text>
            <Text style={{ fontSize: 11, color: resumen.kilometrajeVencido ? COLORS.redText2 : COLORS.textMuted }}>{resumen.kilometrajeVencido ? 'Pendiente esta semana' : 'Actualizado'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput value={kmInput} onChangeText={setKmInput} keyboardType="number-pad" style={{ flex: 1, borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 14, minHeight: 48, paddingHorizontal: 13, fontSize: 16, color: COLORS.text }} />
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>km</Text>
            <PrimaryButton label={guardandoKm ? 'Guardando…' : 'Actualizar'} variant="ghost" onPress={guardarKilometraje} />
          </View>
          {!!kmError && <Text style={{ fontSize: 12, color: COLORS.redText2 }}>{kmError}</Text>}
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.bgApp, alignItems: 'center', justifyContent: 'center' }}>
            <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={COLORS.textMuted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L4.5 10.6c-.9.2-1.5 1-1.5 1.9v3.5c0 .6.4 1 1 1h2" />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Mi auto</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 2, color: COLORS.text }}>{me.car.plate}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{me.car.model} · {me.car.year}</Text>
          </View>
          <PrimaryButton label="Reportar falla" variant="ghost" onPress={() => router.push('/(app)/nueva-queja' as never)} />
        </Card>
      </KeyboardAwareScrollView>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
