import { ActivityIndicator, Image, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useComprobanteUri } from './comprobanteCache';

export interface ComprobanteSource {
  uri: string;
  name: string;
  type: string;
  headers?: Record<string, string>;
}

export function ComprobanteViewer({ source, visible, onClose }: { source: ComprobanteSource | null; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [scale, setScale] = useState(1);
  const [imageError, setImageError] = useState(false);
  const isImage = !!source && (source.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(source.name));
  const local = useComprobanteUri(source, visible && isImage);

  useEffect(() => {
    if (visible) {
      setScale(1);
      setImageError(false);
    }
  }, [visible, source?.uri]);

  if (!source) return null;
  const imageSize = Math.min(width - 36, height * 0.62, 420);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,10,8,0.94)', paddingTop: 42, paddingBottom: 28, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, color: '#fffdf8', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{source.name}</Text>
          <Pressable onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#706d64', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cerrar comprobante">
            <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fffdf8" strokeWidth={2} strokeLinecap="round"><Path d="M18 6 6 18" /><Path d="m6 6 12 12" /></Svg>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {isImage && !imageError && local.loading ? <ActivityIndicator color="#e8a13a" size="large" /> : isImage && !imageError && local.uri ? (
            <Image
              source={{ uri: local.uri }}
              onError={() => setImageError(true)}
              resizeMode="contain"
              style={{ width: imageSize, height: imageSize, transform: [{ scale }] }}
            />
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 54, height: 62, borderRadius: 8, backgroundColor: '#c0553f', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '800' }}>{isImage ? '!' : 'PDF'}</Text></View>
              <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{isImage ? 'No se pudo cargar el comprobante' : 'Comprobante en PDF'}</Text>
              <Text style={{ color: '#c9c4b8', fontSize: 12, textAlign: 'center' }}>{isImage ? 'Probá cerrar y volver a abrirlo.' : 'Este formato no se puede previsualizar acá.'}</Text>
              {isImage && <Pressable onPress={local.retry} style={{ minHeight: 40, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#2b2a24', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontSize: 12, fontWeight: '700' }}>Reintentar</Text></Pressable>}
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          {isImage && !imageError && <Text style={{ color: '#aaa69c', fontSize: 11 }}>Usá los botones para ajustar el zoom</Text>}
          {isImage && !imageError && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <ZoomButton label="−" onPress={() => setScale((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))} />
            <ZoomButton label={`${Math.round(scale * 100)}%`} onPress={() => setScale(1)} wide />
            <ZoomButton label="+" onPress={() => setScale((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))} />
          </View>}
          <Pressable onPress={onClose} style={{ minHeight: 46, width: '100%', borderRadius: 16, backgroundColor: '#e8a13a', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cerrar visor de comprobante">
            <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '800' }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ZoomButton({ label, onPress, wide = false }: { label: string; onPress: () => void; wide?: boolean }) {
  return <Pressable onPress={onPress} style={{ width: wide ? 70 : 46, height: 38, borderRadius: 12, backgroundColor: '#2b2a24', borderWidth: 1, borderColor: '#535047', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontSize: wide ? 11 : 20, fontWeight: '700' }}>{label}</Text></Pressable>;
}
