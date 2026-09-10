import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import type { MobileView } from '../useMobileView';

const PAPER = '#fffdf8';
const BORDER = '#e8dfd1';
const INK = '#16150f';
const MUTED = '#6b665c';
const SOFT = '#f7f3eb';
const DANGER = '#b34732';

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 14 } as const;
const textInput = { minHeight: 44, borderWidth: 1, borderColor: '#ded3c1', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, color: INK, backgroundColor: PAPER, fontSize: 15 } as const;

export function Secciones({ v }: { v: MobileView }) {
  const [newName, setNewName] = useState('');
  const [names, setNames] = useState<Record<number, string>>({});

  const saveNew = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await v.secciones.add(name);
      setNewName('');
    } catch (e) {
      Alert.alert('No se pudo crear', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  };

  const saveName = async (id: number, originalName: string) => {
    const name = (names[id] ?? originalName).trim();
    if (!name || name === originalName.trim()) return;
    try {
      await v.secciones.rename(id, name);
      setNames((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  };

  const removeSection = (id: number, name: string) => {
    Alert.alert(
      'Eliminar sección',
      `Los vehículos de “${name}” quedarán sin sección.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void v.secciones.remove(id).catch((e: unknown) => Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Intentá de nuevo.'));
          },
        },
      ],
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 }}>
      <View style={{ paddingHorizontal: 4, gap: 3 }}>
        <Text style={{ color: INK, fontSize: 15, fontWeight: '700' }}>Organizá tu flota</Text>
        <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18 }}>Creá grupos, cambiales el nombre y ordenalos como prefieras.</Text>
      </View>

      <View style={[card, { gap: 10 }]}>
        {v.secciones.items.map((section, index) => {
          const draft = names[section.id] ?? section.name;
          const canSave = draft.trim().length > 0 && draft.trim() !== section.name.trim();
          const isFirst = index === 0;
          const isLast = index === v.secciones.items.length - 1;
          return (
            <View key={section.id} style={{ backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 11, gap: 10 }}>
              <TextInput
                value={draft}
                onChangeText={(name) => setNames((current) => ({ ...current, [section.id]: name }))}
                placeholder="Nombre de la sección"
                placeholderTextColor="#a39b8e"
                style={textInput}
                accessibilityLabel={`Nombre de ${section.name}`}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    disabled={isFirst}
                    onPress={() => void v.secciones.move(section.id, -1)}
                    accessibilityLabel={`Subir ${section.name}`}
                    style={{ width: 36, height: 34, borderRadius: 10, borderWidth: 1, borderColor: isFirst ? '#e1d9cd' : '#d7cbb9', backgroundColor: isFirst ? '#f1ece4' : PAPER, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: isFirst ? '#bdb4a6' : INK, fontSize: 18, lineHeight: 20 }}>↑</Text>
                  </Pressable>
                  <Pressable
                    disabled={isLast}
                    onPress={() => void v.secciones.move(section.id, 1)}
                    accessibilityLabel={`Bajar ${section.name}`}
                    style={{ width: 36, height: 34, borderRadius: 10, borderWidth: 1, borderColor: isLast ? '#e1d9cd' : '#d7cbb9', backgroundColor: isLast ? '#f1ece4' : PAPER, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: isLast ? '#bdb4a6' : INK, fontSize: 18, lineHeight: 20 }}>↓</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    disabled={!canSave}
                    onPress={() => void saveName(section.id, section.name)}
                    accessibilityLabel={`Guardar ${section.name}`}
                    style={{ minHeight: 34, borderRadius: 10, paddingHorizontal: 11, backgroundColor: canSave ? INK : '#e7e0d5', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: canSave ? PAPER : '#a39b8e', fontSize: 12, fontWeight: '800' }}>Guardar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeSection(section.id, section.name)}
                    accessibilityLabel={`Eliminar ${section.name}`}
                    style={{ minHeight: 34, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e2b9ae', backgroundColor: '#fff8f5', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: DANGER, fontSize: 12, fontWeight: '800' }}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 2 }} />
        <View style={{ gap: 8 }}>
          <Text style={{ color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Nueva sección</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Ej. Vehículos nuevos"
              placeholderTextColor="#a39b8e"
              style={[textInput, { flex: 1 }]}
              accessibilityLabel="Nombre de la nueva sección"
              onSubmitEditing={() => void saveNew()}
              returnKeyType="done"
            />
            <Pressable
              disabled={!newName.trim()}
              onPress={() => void saveNew()}
              style={{ minHeight: 44, borderRadius: 13, paddingHorizontal: 13, backgroundColor: newName.trim() ? INK : '#e7e0d5', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: newName.trim() ? PAPER : '#a39b8e', fontSize: 13, fontWeight: '800' }}>Agregar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
