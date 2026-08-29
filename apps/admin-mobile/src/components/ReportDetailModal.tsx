import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';

export function ReportDetailModal({ v }: { v: MobileView }) {
  const report = v.reportDetail;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setConfirming(false);
    setBusy(false);
  }, [report?.plate, report?.description]);
  if (!report) return null;

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    void action().finally(() => setBusy(false));
  };
  const fields = [
    ['Vehículo', report.plate], ['Chofer', report.driver], ['Fecha', report.date],
    ['Categoría', report.category], ['Gravedad', report.urgency], ['Estado', report.status],
  ];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={report.close}>
      <Pressable onPress={report.close} style={{ flex: 1, backgroundColor: 'rgba(18,17,14,0.55)', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '88%', borderRadius: 24, backgroundColor: '#f4f0e8', padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800' }}>Reporte del chofer</Text>
              <Text style={{ color: '#6b665c', marginTop: 2 }}>{report.plate}</Text>
            </View>
            <Pressable onPress={report.close} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf8' }}><Text style={{ fontSize: 20 }}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {fields.map(([label, value]) => (
                <View key={label} style={{ width: '48%', minWidth: 130, flexGrow: 1, borderWidth: 1, borderColor: '#ece4d6', borderRadius: 14, padding: 11, backgroundColor: '#fffdf8' }}>
                  <Text style={{ color: '#8b8477', fontSize: 11 }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 3 }}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={{ borderWidth: 1, borderColor: '#ece4d6', borderRadius: 14, padding: 13, backgroundColor: '#fffdf8' }}>
              <Text style={{ color: '#8b8477', fontSize: 11 }}>Descripción</Text>
              <Text style={{ fontSize: 14, lineHeight: 21, marginTop: 5 }}>{report.description}</Text>
            </View>
          </ScrollView>
          {confirming ? (
            <View style={{ borderRadius: 16, padding: 13, backgroundColor: '#fdeeea', gap: 10 }}>
              <Text style={{ fontWeight: '800' }}>¿Marcar este reporte como resuelto?</Text>
              <Text style={{ fontSize: 12, color: '#6b665c' }}>Desaparecerá de Alertas. El vehículo conservará su estado actual.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable disabled={busy} onPress={() => setConfirming(false)} style={{ flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: '#dccfbc', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '700' }}>Cancelar</Text></Pressable>
                <Pressable disabled={busy} onPress={() => run(report.resolve)} style={{ flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: '#a8412f', alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Sí, resolver</Text>}</Pressable>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable disabled={busy} onPress={() => setConfirming(true)} style={{ flex: 1, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: '#dccfbc', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '700' }}>Marcar resuelto</Text></Pressable>
              <Pressable disabled={busy} onPress={() => run(report.sendToWorkshop)} style={{ flex: 1, minHeight: 46, borderRadius: 16, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{report.inWorkshop ? 'Vincular al taller' : 'Enviar a taller'}</Text>}</Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
