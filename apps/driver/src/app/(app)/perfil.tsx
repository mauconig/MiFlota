import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion } from '../../api';
import { Card } from '../../components/Card';
import { TabHeader } from '../../components/Header';
import { fmtG } from '../../format';
import { COLORS } from '../../theme';
import type { Resumen } from '../../types';

const ESTADO_LABEL: Record<Resumen['estado'], string> = { atrasado: 'Atrasado', adelantado: 'Adelantado', al_dia: 'Al día' };

export default function Perfil() {
  const { me, token, salir, sesionVencida, locationStatus, activarUbicacion } = useAuth();
  const router = useRouter();
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setResumen(await api.getResumen(token));
    } catch (e) {
      if (e instanceof SinSesion) sesionVencida();
    }
  }, [token, sesionVencida]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (!me) return null;

  const rows: [string, string][] = [
    ['Auto asignado', me.car.plate],
    ['Modelo', `${me.car.model} · ${me.car.year}`],
    ['Cuota diaria', fmtG(me.cuota)],
    ['Estado de cuenta', resumen ? ESTADO_LABEL[resumen.estado] : '…'],
  ];

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title="Mi cuenta" sub={`${me.car.plate} · ${me.car.model}`} initials={initials(me.driver)} onPerfil={() => {}} />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#f7dfae' }}>{initials(me.driver)}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.2, color: COLORS.text }}>{me.driver}</Text>
        </Card>

        <Card style={{ paddingVertical: 2 }}>
          {rows.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: '#f4efe4' }}>
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.textMuted }}>{k}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>{v}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: 9 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Ubicación del auto</Text>
          <Text style={{ fontSize: 13, color: COLORS.text }}>
            {locationStatus === 'active'
              ? 'Ubicación compartida. Se actualiza cada hora mientras la app esté abierta.'
              : locationStatus === 'services-disabled'
                ? 'Activá la ubicación del teléfono para compartirla.'
                : locationStatus === 'permission-required'
                  ? 'Falta permiso de ubicación para compartirla.'
                  : locationStatus === 'error'
                    ? 'No se pudo compartir la ubicación.'
                    : 'La ubicación todavía no se compartió.'}
          </Text>
          <Pressable
            onPress={() => void activarUbicacion()}
            style={{ minHeight: 48, borderRadius: 16, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.onDark }}>Compartir ahora</Text>
          </Pressable>
        </Card>

        <Pressable
          onPress={async () => {
            await salir();
            router.replace('/login');
          }}
          style={{ minHeight: 50, borderRadius: 20, borderWidth: 1, borderColor: '#f0d8cf', backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.redText2 }}>Cerrar sesión</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
