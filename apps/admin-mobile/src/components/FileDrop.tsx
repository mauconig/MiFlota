import { Pressable, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import type { PickedFile } from '../types';

/** Reemplazo de `<input type="file" capture="environment">`: no existe en
 *  React Native. Abre el selector nativo (galería/archivos, que en Android
 *  e iOS también ofrece la cámara como origen). */
export function FileDrop({ file, onChange }: { file: PickedFile | null; onChange: (f: PickedFile | null) => void }) {
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    onChange({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
  };

  return (
    <Pressable
      onPress={() => (file ? onChange(null) : pick())}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: file ? '#e8a13a' : '#d8cdb8',
        backgroundColor: file ? '#fdf6e8' : 'transparent',
        borderRadius: 18,
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
      }}
    >
      <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke={file ? '#8a6410' : '#6b665c'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <Circle cx="12" cy="13" r="3" />
      </Svg>
      <Text style={{ fontSize: 13, fontWeight: '600', color: file ? '#8a6410' : '#6b665c' }}>
        {file ? file.name.slice(0, 28) + ' · quitar' : 'Adjuntar captura o foto del comprobante'}
      </Text>
    </Pressable>
  );
}
