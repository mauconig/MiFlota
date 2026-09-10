import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const storageRoot = await mkdtemp(join(tmpdir(), 'miflota-comprobantes-'));
const storageDir = join(storageRoot, 'comprobantes');
await mkdir(storageDir, { recursive: true });
process.env.MIFLOTA_DB = join(storageRoot, 'miflota.db');
process.env.MIFLOTA_COMPROBANTES = storageDir;
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

const { ComprobanteInvalidoError, guardarComprobante, normalizarComprobante } = await import('../dist/comprobantes.js');

async function imagenGrande() {
  const width = 2400;
  const height = 1800;
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 3) {
    const pixel = i / 3;
    pixels[i] = (pixel * 17) % 256;
    pixels[i + 1] = (pixel * 31) % 256;
    pixels[i + 2] = (pixel * 47) % 256;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 100 }).toBuffer();
}

test('normaliza imágenes a JPEG sin superar 1600 px', async () => {
  const original = await imagenGrande();
  const resultado = await normalizarComprobante({
    data: original,
    nombre: 'recibo.png',
    tipo: 'image/png',
    extension: 'png',
  });
  const metadata = await sharp(resultado.data).metadata();

  assert.equal(resultado.tipo, 'image/jpeg');
  assert.equal(resultado.extension, 'jpg');
  assert.equal(resultado.nombre, 'recibo.jpg');
  assert.ok(Math.max(metadata.width ?? 0, metadata.height ?? 0) <= 1600);
  assert.ok(resultado.data.length < original.length);
});

test('mantiene los PDFs sin modificar', async () => {
  const pdf = Buffer.from('%PDF-1.7\ncomprobante de prueba\n%%EOF');
  const resultado = await normalizarComprobante({
    data: pdf,
    nombre: 'factura.pdf',
    tipo: 'application/pdf',
    extension: 'pdf',
  });

  assert.strictEqual(resultado.data, pdf);
  assert.deepEqual(resultado, {
    data: pdf,
    nombre: 'factura.pdf',
    tipo: 'application/pdf',
    extension: 'pdf',
  });
});

test('guardarComprobante persiste la versión optimizada', async () => {
  const original = await imagenGrande();
  const record = await guardarComprobante({
    data: original,
    nombre: 'foto-original.webp',
    tipo: 'image/webp',
    extension: 'webp',
  });
  const guardado = await readFile(join(storageDir, record.id));
  const metadata = await sharp(guardado).metadata();

  assert.equal(record.nombre, 'foto-original.jpg');
  assert.equal(record.tipo, 'image/jpeg');
  assert.equal(record.id.endsWith('.jpg'), true);
  assert.ok(Math.max(metadata.width ?? 0, metadata.height ?? 0) <= 1600);
  assert.ok(guardado.length < original.length);
});

test('rechaza imágenes inválidas', async () => {
  await assert.rejects(
    () => normalizarComprobante({ data: Buffer.from('no es una imagen'), nombre: 'recibo.jpg', tipo: 'image/jpeg', extension: 'jpg' }),
    (error) => error instanceof ComprobanteInvalidoError,
  );
});

after(async () => rm(storageRoot, { recursive: true, force: true }));
