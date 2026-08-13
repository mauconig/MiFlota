import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion } from '../../api';
import { TabHeader } from '../../components/Header';
import { fmtD, plural } from '../../format';
import { COLORS } from '../../theme';
import type { EstadoReporte, Reporte } from '../../types';

const ESTADO_TAG: Record<EstadoReporte, { label: string; bg: string; fg: string }> = {
  enviada: { label: 'Enviada', bg: COLORS.amberBg, fg: COLORS.amberDark },
  vista: { label: 'Vista', bg: COLORS.blueBg, fg: COLORS.blue },
  en_taller: { label: 'En taller', bg: COLORS.purpleBg, fg: COLORS.purple },
  resuelta: { label: 'Resuelta', bg: COLORS.greenBg, fg: COLORS.green },
};

export default function Reportes() {
  const { me, token, sesionVencida } = useAuth();
  const router = useRouter();
  const [reportes, setReportes] = useState<Reporte[] | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setReportes(await api.getReportes(token));
    } catch (e) {
      if (e instanceof SinSesion) sesionVencida();
    } finally {
      setCargando(false);
    }
  }, [token, sesionVencida]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <View style={{ flex: 1 }}>
      <TabHeader
        title="Reportes del auto"
        sub={reportes ? plural(reportes.length, 'reporte enviado', 'reportes enviados') : ''}
        initials={me ? initials(me.driver) : ''}
        onPerfil={() => router.push('/(app)/perfil' as never)}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}>
        <Pressable
          onPress={() => router.push('/(app)/nueva-queja' as never)}
          style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#d8cdb8', backgroundColor: '#fbf7ee', borderRadius: 20, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }}
        >
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.textSoft} strokeWidth={2} strokeLinecap="round">
            <Path d="M5 12h14" />
            <Path d="M12 5v14" />
          </Svg>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textSoft }}>Reportar una falla</Text>
        </Pressable>

        {cargando && !reportes ? (
          <ActivityIndicator color={COLORS.bgDark} style={{ marginTop: 20 }} />
        ) : (reportes ?? []).length === 0 ? (
          <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>Todavía no reportaste ninguna falla.</Text>
        ) : (
          (reportes ?? []).map((q) => {
            const t = ESTADO_TAG[q.estado];
            return (
              <View key={q.id} style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, padding: 16, gap: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text }}>{q.cat}</Text>
                  <View style={{ backgroundColor: t.bg, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: t.fg }}>{t.label}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: COLORS.textSoft, lineHeight: 19 }}>{q.texto}</Text>
                <View style={{ flexDirection: 'row', gap: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#f4efe4' }}>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{fmtD(q.fecha)}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>·</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{q.urgencia === 'urgente' ? 'No puedo manejar' : 'Puedo seguir manejando'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
