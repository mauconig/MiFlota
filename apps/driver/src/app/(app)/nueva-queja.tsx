import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion } from '../../api';
import { Card } from '../../components/Card';
import { ChipList, ChipRow } from '../../components/ChipRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SubHeader } from '../../components/Header';
import { COLORS } from '../../theme';
import { CATS_REPORTE, type Urgencia } from '../../types';
import { notifyReporte } from '../../notifications';

const URGENCIAS: { key: Urgencia; label: string; sub: string }[] = [
  { key: 'puedo', label: 'Puedo seguir manejando', sub: 'Se puede arreglar en los próximos días' },
  { key: 'urgente', label: 'No puedo manejar', sub: 'El auto está parado, pierdo la jornada' },
];

export default function NuevaQueja() {
  const { me, token, sesionVencida } = useAuth();
  const router = useRouter();
  const [cat, setCat] = useState(CATS_REPORTE[0]);
  const [urgencia, setUrgencia] = useState<Urgencia>('puedo');
  const [texto, setTexto] = useState('');
  const [err, setErr] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!token) return;
    if (!texto.trim()) {
      setErr('Escribí qué le pasa al auto');
      return;
    }
    setErr('');
    setEnviando(true);
    try {
      await api.postReporte(token, cat, urgencia, texto.trim());
      await notifyReporte(cat);
      router.replace('/(app)/reportes' as never);
    } catch (e) {
      if (e instanceof SinSesion) {
        sesionVencida();
        return;
      }
      setErr(e instanceof Error ? e.message : 'No se pudo enviar el reporte');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader title="Nuevo reporte" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 4 }}>
          Contale al dueño qué pasa con el {me?.car.plate}. Lo ve apenas lo envías.
        </Text>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Qué falla</Text>
          <ChipRow chips={CATS_REPORTE.map((c) => ({ label: c, selected: cat === c, pick: () => setCat(c) }))} />
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Gravedad</Text>
          <ChipList chips={URGENCIAS.map((u) => ({ label: u.label, sub: u.sub, selected: urgencia === u.key, pick: () => setUrgencia(u.key) }))} />
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Detalle</Text>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            multiline
            numberOfLines={4}
            placeholder="Ej: hace un ruido fuerte al frenar en bajada"
            placeholderTextColor={COLORS.textMuted}
            style={{ borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 16, padding: 14, fontSize: 13, lineHeight: 19, color: COLORS.text, minHeight: 90, textAlignVertical: 'top' }}
          />
        </Card>

        {!!err && <Text style={{ color: COLORS.redText2, fontSize: 12, textAlign: 'center' }}>{err}</Text>}

        <PrimaryButton label={enviando ? 'Enviando…' : 'Enviar reporte'} variant="dark" onPress={enviar} />
      </ScrollView>
    </View>
  );
}
