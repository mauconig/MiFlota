import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import { COMPROBANTES_DIR } from './db.js';

export const MAX_COMPROBANTE_IMAGE_DIMENSION = 1600;
export const COMPROBANTE_IMAGE_QUALITY = 78;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER?.trim() || 'miflota';

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const COMPROBANTES_STORAGE = cloudinaryConfigured ? 'cloudinary' : 'local';

export interface ComprobanteInput {
  data: Buffer;
  nombre: string;
  tipo: string;
  extension: string;
}

export interface ComprobanteRecord {
  id: string;
  nombre: string;
  tipo: string;
}

export class ComprobanteInvalidoError extends Error {
  constructor(message = 'La imagen del comprobante no se pudo procesar') {
    super(message);
    this.name = 'ComprobanteInvalidoError';
  }
}

interface CloudinaryReference {
  resourceType: 'image' | 'raw' | 'video';
  publicId: string;
}

const CLOUDINARY_PREFIX = 'cloudinary:';

function cloudinaryReference(resourceType: string, publicId: string): string {
  const safeResourceType: CloudinaryReference['resourceType'] = resourceType === 'raw' || resourceType === 'video' ? resourceType : 'image';
  return `${CLOUDINARY_PREFIX}${safeResourceType}:${encodeURIComponent(publicId)}`;
}

function parseCloudinaryReference(value: string): CloudinaryReference | null {
  if (!value.startsWith(CLOUDINARY_PREFIX)) return null;
  const [, resourceType, encodedPublicId] = value.split(':', 3);
  if (!encodedPublicId || (resourceType !== 'image' && resourceType !== 'raw' && resourceType !== 'video')) return null;
  try {
    return { resourceType, publicId: decodeURIComponent(encodedPublicId) };
  } catch {
    return null;
  }
}

/**
 * Fastify decodifica una vez los parámetros de ruta. Las referencias de
 * Cloudinary guardadas en SQLite, en cambio, mantienen el public_id escapado
 * (`%2F` para la barra de la carpeta). Canonicalizar antes de consultar la
 * base permite aceptar tanto la referencia almacenada como la que llega ya
 * parcialmente decodificada desde una URL.
 */
export function canonicalizarComprobanteId(value: string): string {
  const remote = parseCloudinaryReference(value);
  return remote ? cloudinaryReference(remote.resourceType, remote.publicId) : value;
}

function localComprobantePath(id: string): string | null {
  // Los ids locales históricos son nombres planos generados por el servidor.
  // No permitir rutas aquí protege también a los registros viejos dañados.
  return basename(id) === id ? join(COMPROBANTES_DIR, id) : null;
}

function nombreJpeg(nombre: string): string {
  const original = basename(nombre || 'comprobante');
  const base = original.replace(/\.[^.]+$/, '') || 'comprobante';
  return `${base}.jpg`;
}

/**
 * Canonicaliza las imágenes antes de que lleguen al almacenamiento. Los PDFs
 * se devuelven byte por byte sin tocar: son documentos, no imágenes.
 */
export async function normalizarComprobante(input: ComprobanteInput): Promise<ComprobanteInput> {
  if (!input.tipo.startsWith('image/')) return input;

  try {
    const data = await sharp(input.data, { failOn: 'none' })
      .rotate()
      .resize({
        width: MAX_COMPROBANTE_IMAGE_DIMENSION,
        height: MAX_COMPROBANTE_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: COMPROBANTE_IMAGE_QUALITY })
      .toBuffer();

    if (!data.length) throw new Error('La imagen procesada quedó vacía');
    return {
      data,
      nombre: nombreJpeg(input.nombre),
      tipo: 'image/jpeg',
      extension: 'jpg',
    };
  } catch {
    throw new ComprobanteInvalidoError();
  }
}

function uploadToCloudinary(input: ComprobanteInput): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
        public_id: randomUUID(),
        resource_type: 'auto',
        use_filename: false,
        unique_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(new Error('Cloudinary no devolvió información del comprobante'));
      },
    );
    upload.end(input.data);
  });
}

export async function guardarComprobante(input: ComprobanteInput): Promise<ComprobanteRecord> {
  if (!input.data.length) throw new Error('No se puede guardar un comprobante vacío');

  const normalizado = await normalizarComprobante(input);

  if (!cloudinaryConfigured) {
    const id = `${randomUUID()}.${normalizado.extension}`;
    await writeFile(join(COMPROBANTES_DIR, id), normalizado.data);
    return { id, nombre: normalizado.nombre, tipo: normalizado.tipo };
  }

  const result = await uploadToCloudinary(normalizado);
  return {
    id: cloudinaryReference(result.resource_type, result.public_id),
    nombre: normalizado.nombre,
    tipo: normalizado.tipo,
  };
}

export async function borrarComprobante(id: string): Promise<void> {
  const remote = parseCloudinaryReference(id);
  if (remote) {
    if (!cloudinaryConfigured) throw new Error('Cloudinary no está configurado para borrar el comprobante');
    await cloudinary.uploader.destroy(remote.publicId, {
      resource_type: remote.resourceType,
      type: 'upload',
      invalidate: true,
    });
    return;
  }

  const path = localComprobantePath(id);
  if (path) await rm(path, { force: true });
}

export async function leerComprobante(id: string): Promise<Buffer | null> {
  const remote = parseCloudinaryReference(id);
  if (remote) {
    if (!cloudinaryConfigured) throw new Error('Cloudinary no está configurado para leer el comprobante');
    const url = cloudinary.url(remote.publicId, {
      secure: true,
      resource_type: remote.resourceType,
      type: 'upload',
    });
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }

  const path = localComprobantePath(id);
  if (!path) return null;
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}
