import { Alert, Pressable, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS } from '../theme';
import type { ComprobanteFile } from '../api';

interface Props {
  value: ComprobanteFile | null;
  onChange: (f: ComprobanteFile | null) => void;
}

export function FileAttach({ value, onChange }: Props) {
  const elegir = () => {
    if (value) {
      onChange(null);
      return;
    }
    Alert.alert('Adjuntar comprobante', undefined, [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirGaleria },
      { text: 'Elegir PDF', onPress: elegirPdf },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
  );
}
