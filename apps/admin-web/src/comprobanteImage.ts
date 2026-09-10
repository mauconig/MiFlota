const MAX_COMPROBANTE_IMAGE_DIMENSION = 1600;
const COMPROBANTE_IMAGE_QUALITY = 0.78;

function esImagen(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function nombreJpeg(name: string): string {
  const original = name.split(/[\\/]/).pop() || 'comprobante';
  const base = original.replace(/\.[^.]+$/, '') || 'comprobante';
  return `${base}.jpg`;
}

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('El navegador no pudo comprimir la imagen'))),
      'image/jpeg',
      COMPROBANTE_IMAGE_QUALITY,
    );
  });
}

/** Comprime imágenes en el navegador; los PDFs y formatos no decodificables
 * quedan disponibles para que la API intente normalizarlos. */
export async function optimizarComprobante(file: File): Promise<File> {
  if (!esImagen(file)) return file;

  try {
    const image = await cargarImagen(file);
    if (!image.naturalWidth || !image.naturalHeight) return file;
    const escala = Math.min(1, MAX_COMPROBANTE_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * escala));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas);
    return new File([blob], nombreJpeg(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    // HEIC no está decodificado por todos los navegadores. La API es la
    // segunda barrera y todavía puede normalizar el buffer original.
    return file;
  }
}
