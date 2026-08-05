import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { Request } from 'express';

type MulterFile = Express.Multer.File;
type MulterCallback = (error: Error | null, acceptFile: boolean) => void;

/**
 * Server-side MIME-type allowlist — file extension alone is client-supplied
 * and trivially spoofed, so this checks the sniffed `mimetype` multer reports
 * from the actual upload stream, not the filename.
 */
export function createMimeTypeFilter(allowedMimeTypes: readonly string[]) {
  return (_req: Request, file: MulterFile, cb: MulterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new UnsupportedMediaTypeException(
        `Unsupported file type "${file.mimetype}". Allowed: ${allowedMimeTypes.join(', ')}.`,
      ),
      false,
    );
  };
}

export const VERIFICATION_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
