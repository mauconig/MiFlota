import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import type { PickedFile } from '../types';
import { ComprobantePreview } from './ComprobantePreview';
import { optimizarComprobante } from '../comprobanteImage';

/** Reemplazo de `<input type="file" capture="environment">`: no existe en
 *  React Native. Abre el selector nativo (galería/archivos, que en Android
 *  e iOS también ofrece la cámara como origen). */
export function FileDrop({ file, onChange }: { file: PickedFile | null; onChange: (f: PickedFile | null) => void }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const pick = async () => {
    if (procesando) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const seleccionado = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' };
    setError('');
    const parecePdf = seleccionado.mimeType === 'application/pdf' || /\.pdf$/i.test(seleccionado.name);
    if (parecePdf) {
      onChange(seleccionado);
      return;
    }
    setProcesando(true);
    try {
      onChange(await optimizarComprobante(seleccionado));
    } catch {
      setError('No se pudo optimizar la imagen; se procesará al enviarla.');
      onChange(seleccionado);
    } finally {
      setProcesando(false);
    }
  };

  if (file) return <ComprobantePreview source={{ uri: file.uri, name: file.name, type: file.mimeType }} onRemove={() => onChange(null)} />;

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={pick}
        disabled={procesando}
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#d8cdb8',
          backgroundColor: 'transparent',
          borderRadius: 18,
          minHeight: 46,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          opacity: procesando ? 0.6 : 1,
        }}
      >
        <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <Circle cx="12" cy="13" r="3" />
        </Svg>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b665c' }}>{procesando ? 'Optimizando imagen…' : 'Adjuntar captura o foto del comprobante'}</Text>
      </Pressable>
      {!!error && <Text style={{ fontSize: 11, color: '#a8412f' }}>{error}</Text>}
    </View>
  );
}
