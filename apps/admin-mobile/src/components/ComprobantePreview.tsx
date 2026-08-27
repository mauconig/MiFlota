import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View, useWindowDimensions, type DimensionValue } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Path } from 'react-native-svg';

export interface ComprobanteSource {
  uri: string;
  name: string;
  type: string;
  headers?: Record<string, string>;
}

export function ComprobantePreview({ source, onRemove }: { source: ComprobanteSource; onRemove?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={{ borderWidth: 1, borderColor: '#e8a13a', borderRadius: 18, backgroundColor: '#fdf6e8', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => setOpen(true)} style={{ width: 66, height: 66, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f2eadb', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Ampliar comprobante">
          <PreviewImage source={source} style={{ width: '100%', height: '100%' }} />
        </Pressable>
        <Pressable onPress={() => setOpen(true)} style={{ flex: 1, minWidth: 0 }} accessibilityRole="button" accessibilityLabel="Ver comprobante">
          <Text style={{ color: '#8a6410', fontSize: 13, fontWeight: '700' }} numberOfLines={2}>{source.name}</Text>
          <Text style={{ color: '#9a7b3f', fontSize: 11, marginTop: 3 }}>Tocá para ampliar</Text>
        </Pressable>
        {onRemove && <Pressable onPress={onRemove} style={{ paddingHorizontal: 6, paddingVertical: 8 }} accessibilityRole="button" accessibilityLabel="Quitar comprobante"><Text style={{ color: '#a8412f', fontSize: 12, fontWeight: '700' }}>Quitar</Text></Pressable>}
      </View>
      <ComprobanteViewer source={source} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ComprobanteViewer({ source, visible, onClose }: { source: ComprobanteSource; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [scale, setScale] = useState(1);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const image = source.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(source.name);
  const imageSize = Math.min(width - 36, height * 0.58, 420);

  useEffect(() => {
    if (!visible) return;
    setScale(1);
    setShareError('');
  }, [visible, source.uri]);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError('');
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo');
      const extension = source.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || (source.type === 'application/pdf' ? 'pdf' : 'jpg');
      let uri = source.uri;
      if (/^https?:\/\//i.test(uri)) {
        const directory = FileSystem.cacheDirectory;
        if (!directory) throw new Error('No se pudo preparar el archivo para compartir');
        const downloaded = await FileSystem.downloadAsync(uri, `${directory}miflota-comprobante-${Date.now()}.${extension}`, { headers: source.headers });
        uri = downloaded.uri;
      }
      await Sharing.shareAsync(uri, { dialogTitle: 'Compartir comprobante', mimeType: source.type });
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'No se pudo compartir el comprobante');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,10,8,0.92)', paddingTop: 42, paddingBottom: 28, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, color: '#fffdf8', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{source.name}</Text>
          <Pressable onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#706d64', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cerrar comprobante">
            <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fffdf8" strokeWidth={2} strokeLinecap="round"><Path d="M18 6 6 18" /><Path d="m6 6 12 12" /></Svg>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {image ? <Image source={{ uri: source.uri, headers: source.headers }} resizeMode="contain" style={{ width: imageSize, height: imageSize, transform: [{ scale }] }} /> : <View style={{ alignItems: 'center', gap: 12 }}><PdfIcon /><Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Documento PDF</Text><Text style={{ color: '#c9c4b8', fontSize: 12 }}>Podés compartirlo desde este visor.</Text></View>}
          {image && <Text style={{ color: '#aaa69c', fontSize: 11, marginTop: 16 }}>Usá los botones para ajustar el zoom</Text>}
        </View>

        <View style={{ gap: 10 }}>
          {image && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <ZoomButton label="−" onPress={() => setScale((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))} />
            <ZoomButton label="100%" onPress={() => setScale(1)} wide />
            <ZoomButton label="+" onPress={() => setScale((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))} />
          </View>}
          <Pressable onPress={() => void share()} disabled={sharing} style={{ minHeight: 48, borderRadius: 16, backgroundColor: '#e8a13a', alignItems: 'center', justifyContent: 'center', opacity: sharing ? 0.7 : 1 }} accessibilityRole="button" accessibilityLabel="Compartir comprobante">
            {sharing ? <ActivityIndicator color="#16150f" /> : <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '800' }}>Compartir comprobante</Text>}
          </Pressable>
          {!!shareError && <Text style={{ color: '#f2b8aa', fontSize: 11, textAlign: 'center' }}>{shareError}</Text>}
        </View>
      </View>
    </Modal>
  );
}

function PreviewImage({ source, style }: { source: ComprobanteSource; style: { width: DimensionValue; height: DimensionValue } }) {
  const image = source.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(source.name);
  return image ? <Image source={{ uri: source.uri, headers: source.headers }} resizeMode="cover" style={style} /> : <PdfIcon />;
}

function PdfIcon() {
  return <View style={{ width: 30, height: 34, borderRadius: 5, backgroundColor: '#c0553f', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontSize: 9, fontWeight: '800' }}>PDF</Text></View>;
}

function ZoomButton({ label, onPress, wide = false }: { label: string; onPress: () => void; wide?: boolean }) {
  return <Pressable onPress={onPress} style={{ width: wide ? 70 : 46, height: 38, borderRadius: 12, backgroundColor: '#2b2a24', borderWidth: 1, borderColor: '#535047', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontSize: wide ? 11 : 20, fontWeight: '700' }}>{label}</Text></Pressable>;
}
