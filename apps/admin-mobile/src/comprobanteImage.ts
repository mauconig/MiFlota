import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import type { PickedFile } from './types';

export const MAX_COMPROBANTE_IMAGE_DIMENSION = 1600;
export const COMPROBANTE_IMAGE_QUALITY = 0.78;

function esImagen(file: PickedFile): boolean {
  return file.mimeType.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function nombreJpeg(name: string): string {
  const original = name.split(/[\\/]/).pop() || 'comprobante';
  const base = original.replace(/\.[^.]+$/, '') || 'comprobante';
  return `${base}.jpg`;
}

async function dimensionesDe(uri: string): Promise<{ width: number; height: number } | null> {
  try {
    return await Image.getSize(uri);
  } catch {
    return null;
  }
}

/** Devuelve el comprobante listo para multipart. Los PDFs pasan sin cambios. */
export async function optimizarComprobante(file: PickedFile): Promise<PickedFile> {
  if (!esImagen(file)) return file;

  const dimensiones = await dimensionesDe(file.uri);
  const acciones = dimensiones
    ? (() => {
        const ladoMayor = Math.max(dimensiones.width, dimensiones.height);
        if (ladoMayor <= MAX_COMPROBANTE_IMAGE_DIMENSION) return [];
        return dimensiones.width >= dimensiones.height
          ? [{ resize: { width: MAX_COMPROBANTE_IMAGE_DIMENSION } }]
          : [{ resize: { height: MAX_COMPROBANTE_IMAGE_DIMENSION } }];
      })()
    : [];
  const resultado = await ImageManipulator.manipulateAsync(file.uri, acciones, {
    compress: COMPROBANTE_IMAGE_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: resultado.uri,
    name: nombreJpeg(file.name),
    mimeType: 'image/jpeg',
  };
}
