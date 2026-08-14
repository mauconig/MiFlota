import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

const primaryButton = { borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const };
const secondaryButton = { borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 46, alignItems: 'center' as const, justifyContent: 'center' as const };

export function ChoferSheet({ v }: { v: MobileView }) {
  const s = v.choferSheet;
  const credentials = s.credentials;

  return (
    <BottomSheet title={s.title} onClose={s.close}>
      {credentials ? (
        <>
          <Text style={{ fontSize: 13, lineHeight: 19, color: '#6b665c' }}>
            Compartí estos datos con <Text style={{ fontWeight: '700', color: '#1a1a18' }}>{s.name.trim()}</Text> para que pueda entrar a la app. Revisalos antes de asignar el chofer.
          </Text>
          <View style={{ overflow: 'hidden', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18 }}>
            <CredentialRow label="Vehículo" value={s.carLabel} />
            <CredentialRow label="Usuario" value={credentials.username} mono />
            <CredentialRow label="Contraseña" value={credentials.password} mono last />
          </View>
          <View style={{ paddingVertical: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: '#f2dfbd', borderRadius: 14, backgroundColor: '#fdf6e8' }}>
            <Text style={{ fontSize: 12, lineHeight: 17, color: '#8a641c' }}>La contraseña se guarda cifrada y no podrá volver a verse. Anotala o compartila antes de continuar.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={s.credentialsLoading} onPress={s.volver} style={{ ...secondaryButton, flex: 1, opacity: s.credentialsLoading ? 0.6 : 1 }}>
              <Text style={{ color: '#3d3a34', fontSize: 14, fontWeight: '700' }}>Volver</Text>
            </Pressable>
            <Pressable disabled={s.credentialsLoading} onPress={s.guardar} style={{ ...primaryButton, flex: 1, opacity: s.credentialsLoading ? 0.6 : 1 }}>
              {s.credentialsLoading ? <ActivityIndicator color="#fffdf8" /> : <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Asignar chofer</Text>}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18, paddingHorizontal: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
              <Text style={{ width: 104, fontSize: 13, fontWeight: '600' }}>Nombre</Text>
              <TextInput value={s.name} onChangeText={s.setName} placeholder="Nombre y apellido" style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
              <Text style={{ width: 104, fontSize: 13, fontWeight: '600' }}>Cuota diaria</Text>
              <TextInput
                keyboardType="numeric"
                value={s.cuota}
                onChangeText={s.setCuota}
                placeholder="190.000"
                style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }}
              />
            </View>
          </View>
          <Pressable
            disabled={s.credentialsLoading}
            onPress={s.needsCredentials ? s.continuar : s.guardar}
            style={{ ...primaryButton, opacity: s.credentialsLoading ? 0.6 : 1 }}
          >
            {s.credentialsLoading ? (
              <ActivityIndicator color="#fffdf8" />
            ) : (
              <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{s.needsCredentials ? 'Continuar' : 'Guardar cambios'}</Text>
            )}
          </Pressable>
          {s.hasDriver && (
            <Pressable onPress={s.desvincular} style={{ borderWidth: 1, borderColor: '#f0d8cf', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#a8412f', fontSize: 13, fontWeight: '600' }}>Desvincular chofer</Text>
            </Pressable>
          )}
        </>
      )}
    </BottomSheet>
  );
}

function CredentialRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#ece4d6' }}>
      <Text style={{ width: 92, fontSize: 12, fontWeight: '700', color: '#6b665c' }}>{label}</Text>
      <Text selectable style={{ flex: 1, textAlign: 'right', fontSize: mono ? 15 : 13, fontWeight: mono ? '700' : '600', letterSpacing: mono ? 0.4 : 0, color: '#1a1a18' }}>
        {value}
      </Text>
    </View>
  );
}
