import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as path from 'node:path';
import type { StorageService, UploadableFile } from './storage.types.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

// Cloudflare R2 is S3-API-compatible, so the AWS SDK's S3Client works unmodified
// against R2's endpoint — no Cloudflare-specific SDK needed.
@Injectable()
export class CloudflareR2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService, private readonly logger: AppLogger) {
    const accountId = config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.bucket = config.getOrThrow<string>('R2_BUCKET');
    this.publicUrl = config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/+$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });

    this.logger.log(`Using Cloudflare R2 storage (bucket: ${this.bucket})`, CloudflareR2StorageService.name);
  }

  async save(file: UploadableFile, folder: string): Promise<string> {
    const key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalName)}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
