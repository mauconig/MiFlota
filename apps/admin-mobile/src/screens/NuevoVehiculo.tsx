import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';
import { useDateField } from '../components/DateField';
import { NuevoVehiculoConfirmSheet } from '../components/NuevoVehiculoConfirmSheet';
import { dLblFull } from '../format';

const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 12 };
const label = { width: 118, fontSize: 13, fontWeight: '600' as const };
const valueInput = { flex: 1, textAlign: 'right' as const, fontSize: 13, color: '#3d3a34', padding: 0 };
const sectionTitle = { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const, color: '#6b665c' };
const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 };
const divider = { borderBottomWidth: 1, borderBottomColor: '#f4efe4' };

export function NuevoVehiculo({ v }: { v: MobileView }) {
  const nc = v.nuevoVehiculo;
  const lastService = useDateField(nc.lastService, nc.setLastService, nc.hoy);
  const seguroVence = useDateField(nc.seguroVence, nc.setSeguroVence);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 14 }}>
      <Text style={{ fontSize: 12, color: '#6b665c', paddingHorizontal: 4 }}>Chapa y modelo son obligatorios. El chofer se asigna después, desde la ficha del vehículo.</Text>

      <View style={card}>
        <View style={[row, divider]}>
          <Text style={label}>Chapa</Text>
          <TextInput
            value={nc.plate}
            onChangeText={nc.setPlate}
            placeholder="ABC 123"
            autoCapitalize="characters"
            style={[valueInput, { fontWeight: '700', letterSpacing: 0.3, color: '#1a1a18' }]}
          />
        </View>
        <View style={[row, divider]}>
          <Text style={label}>Marca y modelo</Text>
          <TextInput value={nc.model} onChangeText={nc.setModel} placeholder="Toyota Vitz" style={valueInput} />
        </View>
        <View style={[row, divider]}>
          <Text style={label}>Año</Text>
          <TextInput keyboardType="numeric" value={nc.year} onChangeText={nc.setYear} placeholder="2018" style={valueInput} />
        </View>
        <View style={[row, divider]}>
          <Text style={label}>GPS tag</Text>
          <TextInput value={nc.gpsTag} onChangeText={nc.setGpsTag} placeholder="Opcional" maxLength={40} style={valueInput} />
        </View>
        <Pressable onPress={lastService.open} style={[row, divider]}>
          <Text style={label}>Último service</Text>
          <Text style={valueInput}>{nc.lastService ? dLblFull(new Date(nc.lastService + 'T12:00:00')) : 'Elegir fecha'}</Text>
        </Pressable>
        <View style={[row, { paddingBottom: 12 }]}>
          <Text style={label}>Service cada</Text>
          <TextInput keyboardType="numeric" value={nc.serviceCada} onChangeText={nc.setServiceCada} placeholder="6" style={valueInput} />
        </View>
        <View style={{ paddingBottom: 12 }}>
          <ChipRow chips={nc.unidadOpts} equal />
        </View>
      </View>
      {lastService.picker}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
        <Text style={sectionTitle}>Seguro</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#f0ebe0' }} />
      </View>

      <View style={card}>
        <Pressable onPress={seguroVence.open} style={[row, divider]}>
          <Text style={label}>Vence el</Text>
          <Text style={valueInput}>{nc.seguroVence ? dLblFull(new Date(nc.seguroVence + 'T12:00:00')) : 'Elegir fecha'}</Text>
        </Pressable>
        <View style={[row, divider]}>
          <Text style={label}>Costo de la póliza</Text>
          <TextInput keyboardType="numeric" value={nc.seguroCosto} onChangeText={nc.setSeguroCosto} placeholder="400.000" style={valueInput} />
        </View>
        <View style={[row, { paddingBottom: 12 }]}>
          <Text style={label}>Renovar cada</Text>
          <TextInput keyboardType="numeric" value={nc.seguroCada} onChangeText={nc.setSeguroCada} placeholder="12" style={valueInput} />
          <Text style={{ fontSize: 13, color: '#6b665c' }}>{nc.cadaUnitLabel}</Text>
        </View>
        <View style={{ paddingBottom: 12 }}>
          <ChipRow chips={nc.periodoOpts} equal />
        </View>
      </View>
      {seguroVence.picker}

      <Text style={{ fontSize: 12, color: '#6b665c', paddingHorizontal: 4 }}>La cuota se define al asignarle un chofer.</Text>

      <Pressable onPress={nc.guardar} style={{ borderRadius: 20, backgroundColor: '#16150f', minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fffdf8', fontSize: 15, fontWeight: '700' }}>Agregar a la flota</Text>
      </Pressable>
      <Pressable onPress={v.back} style={{ borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 20, backgroundColor: '#fffdf8', minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#3d3a34', fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
      </Pressable>

      <NuevoVehiculoConfirmSheet v={v} />
    </View>
  );
}
