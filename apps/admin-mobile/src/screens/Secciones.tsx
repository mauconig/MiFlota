import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import type { MobileView } from '../useMobileView';

const PAPER = '#fffdf8';
const BORDER = '#e8dfd1';
const INK = '#16150f';
const MUTED = '#6b665c';
const SOFT = '#f7f3eb';
const DANGER = '#b34732';

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 22 } as const;

type SectionItem = MobileView['secciones']['items'][number];
type ActionTarget = SectionItem | null;
type EditorState = { mode: 'new' | 'edit'; id?: number; originalName?: string } | null;

export function Secciones({ v }: { v: MobileView }) {
  const [actions, setActions] = useState<ActionTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionTarget>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setActions(null);
    setDraft('');
    setEditor({ mode: 'new' });
  };

  const openEdit = (section: SectionItem) => {
    setActions(null);
    setDraft(section.name);
    setEditor({ mode: 'edit', id: section.id, originalName: section.name });
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const saveEditor = async () => {
    const name = draft.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Ingresá un nombre para la sección.');
      return;
    }
    if (editor?.mode === 'edit' && name === editor.originalName?.trim()) {
      setEditor(null);
      return;
    }
    setSaving(true);
    try {
      if (editor?.mode === 'edit' && editor.id != null) await v.secciones.rename(editor.id, name);
      else await v.secciones.add(name);
      setEditor(null);
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const removeSection = (section: SectionItem) => {
    setActions(null);
    setDeleteTarget(section);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const section = deleteTarget;
    setDeleteTarget(null);
    try {
      await v.secciones.remove(section.id);
    } catch (e) {
      Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    }
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 }}>
      <View style={{ paddingHorizontal: 4, gap: 3 }}>
        <Text style={{ color: INK, fontSize: 15, fontWeight: '700' }}>Organizá tu flota</Text>
        <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18 }}>Agrupá tus vehículos y mantené tu flota al día.</Text>
      </View>

      <View style={[card, { padding: 10, gap: 8 }]}>
        {v.secciones.items.length === 0 ? (
          <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 5 }}>
            <Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>No hay secciones</Text>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>Creá una sección para organizar tus vehículos.</Text>
          </View>
        ) : (
          v.secciones.items.map((section) => <SectionCard key={section.id} section={section} onActions={() => setActions(section)} />)
        )}

        <Pressable
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Agregar sección"
          style={{ minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: '#d8cbb9', backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
        >
          <Text style={{ color: INK, fontSize: 14, fontWeight: '800' }}>＋ Agregar sección</Text>
        </Pressable>
      </View>

      <ActionsModal section={actions} onClose={() => setActions(null)} onEdit={() => actions && openEdit(actions)} onDelete={() => actions && removeSection(actions)} />
      <DeleteSectionModal section={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmRemove()} />
      <EditorModal editor={editor} draft={draft} saving={saving} onChange={setDraft} onClose={closeEditor} onSave={() => void saveEditor()} />
    </View>
  );
}

function SectionCard({ section, onActions }: { section: SectionItem; onActions: () => void }) {
  const countLabel = section.vehicleCount === 1 ? '1 vehículo' : `${section.vehicleCount} vehículos`;
  return (
    <View style={{ minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SOFT, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: INK, fontSize: 15, fontWeight: '800' }}>{section.name}</Text>
        <Text style={{ color: MUTED, fontSize: 12 }}>{countLabel}</Text>
      </View>
      <Pressable
        onPress={onActions}
        accessibilityRole="button"
        accessibilityLabel={`Acciones de ${section.name}`}
        hitSlop={8}
        style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#d8cbb9', backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: INK, fontSize: 21, lineHeight: 22, marginTop: -5 }}>⋯</Text>
      </Pressable>
    </View>
  );
}

function ActionsModal({ section, onClose, onEdit, onDelete }: { section: ActionTarget; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <Modal visible={section != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLabel="Cerrar menú" />
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: PAPER, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 10 }}>
          <Text numberOfLines={1} style={{ color: INK, fontSize: 17, fontWeight: '800' }}>{section?.name ?? ''}</Text>
          <Pressable onPress={onEdit} style={{ minHeight: 44, borderRadius: 13, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Editar sección">
            <Text style={{ color: PAPER, fontWeight: '800' }}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={{ minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: '#e2b9ae', backgroundColor: '#fff8f5', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Eliminar sección">
            <Text style={{ color: DANGER, fontWeight: '800' }}>Eliminar</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={{ color: MUTED, fontWeight: '700' }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DeleteSectionModal({ section, onCancel, onConfirm }: { section: ActionTarget; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={section != null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={onCancel} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLabel="Cerrar confirmación" />
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: PAPER, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 14 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#fbe9e5', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: DANGER, fontSize: 22, fontWeight: '800' }}>!</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: INK, fontSize: 19, fontWeight: '800' }}>Eliminar sección</Text>
            <Text style={{ color: MUTED, fontSize: 14, lineHeight: 20 }}>
              Los vehículos de “{section?.name ?? ''}” quedarán sin sección.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <Pressable onPress={onCancel} style={{ minHeight: 42, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cancelar eliminación">
              <Text style={{ color: MUTED, fontWeight: '800' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={{ minHeight: 42, borderRadius: 12, paddingHorizontal: 16, backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Confirmar eliminación">
              <Text style={{ color: PAPER, fontWeight: '800' }}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditorModal({ editor, draft, saving, onChange, onClose, onSave }: { editor: EditorState; draft: string; saving: boolean; onChange: (value: string) => void; onClose: () => void; onSave: () => void }) {
  const title = editor?.mode === 'edit' ? 'Editar sección' : 'Nueva sección';
  return (
    <Modal visible={editor != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLabel="Cerrar editor" />
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: PAPER, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: INK, fontSize: 18, fontWeight: '800' }}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: MUTED, fontSize: 18 }}>×</Text>
            </Pressable>
          </View>
          <Text style={{ color: MUTED, fontSize: 12, fontWeight: '700' }}>Nombre</Text>
          <TextInput value={draft} onChangeText={onChange} autoFocus maxLength={50} placeholder="Ej. Toyota" placeholderTextColor="#a39b8e" style={{ minHeight: 46, borderWidth: 1, borderColor: '#ded3c1', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, color: INK, backgroundColor: PAPER, fontSize: 15 }} accessibilityLabel="Nombre de la sección" returnKeyType="done" onSubmitEditing={onSave} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
            <Pressable onPress={onClose} disabled={saving} style={{ minHeight: 42, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={{ color: MUTED, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onSave} disabled={saving} style={{ minHeight: 42, borderRadius: 12, paddingHorizontal: 16, backgroundColor: saving ? '#bdb4a6' : INK, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Guardar sección">
              <Text style={{ color: PAPER, fontWeight: '800' }}>{saving ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
