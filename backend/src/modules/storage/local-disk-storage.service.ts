import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StorageService, UploadableFile } from './storage.types.js';

const uploadsRoot = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');

@Injectable()
export class LocalDiskStorageService implements StorageService {
  async save(file: UploadableFile, folder: string): Promise<string> {
    const dir = path.join(uploadsRoot, folder);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalName)}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    return `/uploads/${folder}/${filename}`;
  }
}
