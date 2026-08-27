import { Pressable, Text, View } from 'react-native';
import type { QuotaDetailView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function QuotaDetailSheet({ quota }: { quota: QuotaDetailView | null }) {
  if (!quota) return null;

  return (
    <BottomSheet title="Detalle de la cuota" onClose={quota.close}>
      <View style={{ backgroundColor: '#fdf6e8', borderRadius: 18, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#8a6410', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>Cuota emitida</Text>
            <Text style={{ color: '#3d3a34', fontSize: 22, fontWeight: '800', marginTop: 5 }} numberOfLines={2}>{quota.title}</Text>
          </View>
          <View style={{ backgroundColor: quota.statusBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: quota.statusFg, fontSize: 10, fontWeight: '800' }}>{quota.status}</Text>
          </View>
        </View>
        <Text style={{ color: '#6b665c', fontSize: 12, marginTop: 5 }}>{quota.date} · {quota.driver}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Summary label="Emitida" value={quota.amount} />
        <Summary label="Pagada" value={quota.paid} color="#2e7d5b" />
        <Summary label="Saldo" value={quota.remaining} color={quota.remaining === '₲0' ? '#2e7d5b' : '#a8412f'} />
      </View>

      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 16, paddingHorizontal: 13 }}>
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '800' }}>Pagos que afectan esta cuota</Text>
          <Text style={{ color: '#6b665c', fontSize: 11, marginTop: 3 }}>
            {quota.payments.length ? 'Tocá un pago para ver su detalle en Movimientos.' : 'Todavía no hay pagos imputados a esta cuota.'}
          </Text>
        </View>
        {quota.payments.map((payment) => (
          <Pressable key={payment.id} onPress={payment.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f4efe4' }} accessibilityRole="button" accessibilityLabel={`Ver detalle de ${payment.title}`}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#e7f2ec', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#2e7d5b', fontSize: 16, fontWeight: '800' }}>↓</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{payment.title}</Text>
              <Text style={{ color: '#6b665c', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{payment.date} · {payment.medio}</Text>
              {!!payment.note && <Text style={{ color: '#8b8478', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{payment.note}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#2e7d5b', fontSize: 13, fontWeight: '800' }}>{payment.applied}</Text>
              <Text style={{ color: '#8b8478', fontSize: 10, marginTop: 2 }}>imputado</Text>
            </View>
            <Text style={{ color: '#b5791a', fontSize: 22, lineHeight: 24 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

function Summary({ label, value, color = '#3d3a34' }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: '#f7f3eb', borderRadius: 15, padding: 11 }}>
      <Text style={{ color: '#6b665c', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color, fontSize: 14, fontWeight: '800', marginTop: 5 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
