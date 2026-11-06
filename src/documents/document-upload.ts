import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { join } from 'node:path';

export const DOCUMENT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents');
export const MAX_DOCUMENT_SIZE = 8 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export interface UploadedDocumentFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export const documentUploadOptions: MulterOptions = {
  dest: DOCUMENT_UPLOAD_DIR,
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_DOCUMENT_MIME.has(file.mimetype)) {
      callback(
        new BadRequestException('Faqat JPG, PNG, WEBP yoki PDF fayl yuklash mumkin'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
