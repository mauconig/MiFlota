import { Modal, Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS } from '../theme';
import type { ComprobanteFile } from '../api';

interface Props {
  value: ComprobanteFile | null;
  onChange: (f: ComprobanteFile | null) => void;
}

type OpcionAdjunto = 'foto' | 'galeria' | 'pdf';

function OpcionIcon({ tipo }: { tipo: OpcionAdjunto }) {
  if (tipo === 'pdf') {
    return (
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.redBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.redDark, fontSize: 11, fontWeight: '800' }}>PDF</Text>
      </View>
    );
  }

  return (
    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.amberBg, alignItems: 'center', justifyContent: 'center' }}>
      <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke={COLORS.amberDark} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {tipo === 'foto' ? (
          <>
            <Path d="M5 8h3l1.5-2h5L16 8h3v11H5z" />
            <Circle cx="12" cy="13" r="3" />
          </>
        ) : (
          <>
            <Rect x="3" y="4" width="18" height="16" rx="2" />
            <Circle cx="8" cy="9" r="1.5" />
            <Path d="m5 17 4-4 3 3 2-2 5 3" />
          </>
        )}
      </Svg>
    </View>
  );
}

export function FileAttach({ value, onChange }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const elegir = () => {
    if (value) {
      onChange(null);
      return;
    }
    setMenuAbierto(true);
  };

  const elegirOpcion = (accion: () => Promise<void>) => {
    setMenuAbierto(false);
    setTimeout(() => void accion(), 160);
  };

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return;
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      onChange({ uri: a.uri, name: a.fileName || 'comprobante.jpg', type: a.mimeType || 'image/jpeg' });
    }
  };

  const elegirGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      onChange({ uri: a.uri, name: a.fileName || 'comprobante.jpg', type: a.mimeType || 'image/jpeg' });
    }
  };

  const elegirPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      onChange({ uri: a.uri, name: a.name, type: a.mimeType || 'application/pdf' });
    }
  };

  return (
    <>
      <Pressable
        onPress={elegir}
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: value ? '#bcd7c8' : '#d8cdb8',
          backgroundColor: value ? COLORS.greenBg : '#fbf7ee',
          borderRadius: 20,
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
        }}
      >
        {value ? (
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m5 13 4 4L19 7" />
          </Svg>
        ) : (
          <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={COLORS.textSoft} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m21 15-5-5L5 21" />
            <Rect x={3} y={3} width={18} height={18} rx={2} />
            <Circle cx={9} cy={9} r={2} />
          </Svg>
        )}
        <Text style={{ fontSize: 13, fontWeight: '700', color: value ? COLORS.green : COLORS.textSoft }}>
          {value ? 'Comprobante adjunto · tocá para quitar' : 'Adjuntar comprobante'}
        </Text>
      </Pressable>

      <Modal visible={menuAbierto} transparent animationType="fade" onRequestClose={() => setMenuAbierto(false)} statusBarTranslucent>
        <Pressable
          onPress={() => setMenuAbierto(false)}
          style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.58)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, backgroundColor: COLORS.card, borderRadius: 24, padding: 22, gap: 14, elevation: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
            <View style={{ gap: 5, paddingBottom: 3 }}>
              <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: '700' }}>Adjuntar comprobante</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 17 }}>Elegí cómo querés cargar el comprobante de la transferencia.</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tomar foto"
              onPress={() => elegirOpcion(tomarFoto)}
              style={{ minHeight: 62, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.bgApp, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 13 }}
            >
              <OpcionIcon tipo="foto" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>Tomar foto</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Usar la cámara del teléfono</Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir de galería"
              onPress={() => elegirOpcion(elegirGaleria)}
              style={{ minHeight: 62, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.bgApp, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 13 }}
            >
              <OpcionIcon tipo="galeria" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>Elegir de galería</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Seleccionar una imagen existente</Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir PDF"
              onPress={() => elegirOpcion(elegirPdf)}
              style={{ minHeight: 62, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.bgApp, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 13 }}
            >
              <OpcionIcon tipo="pdf" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>Elegir PDF</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Buscar un archivo en el teléfono</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setMenuAbierto(false)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
