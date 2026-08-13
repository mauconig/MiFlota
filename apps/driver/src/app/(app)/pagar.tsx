import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth';
import * as api from '../../api';
import { SinSesion, type ComprobanteFile } from '../../api';
import { Card } from '../../components/Card';
import { ChipList, ChipRow } from '../../components/ChipRow';
import { FileAttach } from '../../components/FileAttach';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SubHeader } from '../../components/Header';
import { fmtG, plural } from '../../format';
import { COLORS } from '../../theme';
import { MEDIOS_PAGO } from '../../types';
import type { Resumen } from '../../types';

export default function Pagar() {
  const { token, sesionVencida } = useAuth();
  const router = useRouter();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [dias, setDias] = useState(1);
  const [medio, setMedio] = useState<string>('Efectivo');
  const [comprobante, setComprobante] = useState<ComprobanteFile | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .getResumen(token)
      .then((r) => {
        setResumen(r);
        setDias(r.estado === 'atrasado' ? Math.max(1, Math.round(r.deuda / (r.cuota || 1))) : 1);
      })
      .catch((e) => {
        if (e instanceof SinSesion) sesionVencida();
      });
  }, [token, sesionVencida]);

  if (!resumen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.bgDark} />
      </View>
    );
  }

  const cuota = resumen.cuota;
  const deudaDias = cuota > 0 ? Math.max(0, Math.round(resumen.deuda / cuota)) : 0;
  const chipsDias = [1, 3, 7];
  const total = dias * cuota;
  const needsProof = medio === 'Transferencia';

  const confirmar = async () => {
    if (!token) return;
    if (!dias || total <= 0) {
      setErr('Elegí cuántos días vas a pagar');
      return;
    }
    if (needsProof && !comprobante) {
      setErr('Adjuntá el comprobante de la transferencia');
      return;
    }
    setErr('');
    setEnviando(true);
    try {
      await api.postPago(token, total, medio, comprobante);
      router.replace('/(app)/pagos' as never);
    } catch (e) {
      if (e instanceof SinSesion) {
        sesionVencida();
        return;
      }
      setErr(e instanceof Error ? e.message : 'No se pudo registrar el pago');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SubHeader title="Pagar cuota" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 12 }}>
        <Card style={{ gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Cuántos días pagás</Text>
          <ChipRow
            chips={[
              ...chipsDias.map((n) => ({ label: plural(n, 'día', 'días'), selected: dias === n, pick: () => setDias(n) })),
              ...(deudaDias > 1 ? [{ label: 'Todo lo atrasado · ' + deudaDias, selected: dias === deudaDias, pick: () => setDias(deudaDias) }] : []),
            ]}
          />
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ebe0', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Total a pagar</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.3, color: COLORS.text }}>{fmtG(total)}</Text>
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted }}>Forma de pago</Text>
          <ChipList chips={MEDIOS_PAGO.map((m) => ({ label: m, selected: medio === m, pick: () => setMedio(m) }))} />
        </Card>

        {needsProof && <FileAttach value={comprobante} onChange={setComprobante} />}

        {!!err && <Text style={{ color: COLORS.redText2, fontSize: 12, textAlign: 'center' }}>{err}</Text>}

        <PrimaryButton label={enviando ? 'Enviando…' : 'Enviar pago'} variant="dark" onPress={confirmar} />
        <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16 }}>El pago se aplica al instante a tu cuenta.</Text>
      </ScrollView>
    </View>
  );
}
