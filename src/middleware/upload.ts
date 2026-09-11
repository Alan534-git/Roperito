import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config';

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) callback(null, true);
    else { const error = new Error('Solo se permiten imágenes JPG, PNG o WEBP.') as Error & { statusCode: number }; error.statusCode = 400; callback(error); }
  }
}).single('imagen');

export function isSupportedImage(buffer: Buffer): boolean {
  const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return png || jpeg || webp;
}

export async function saveUploadedImage(file: Express.Multer.File): Promise<string> {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.promises.writeFile(path.join(config.uploadDir, filename), file.buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}
