export interface UploadableFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

/**
 * Swap boundary for file storage: everything upload-related depends on this
 * interface, never on disk paths or an S3 client directly. Toggle drivers via
 * STORAGE_DRIVER — 'local' (default, dev/single-instance) or 'r2' (Cloudflare R2).
 */
export interface StorageService {
  /** Persists the file under `folder` and returns a URL clients can fetch it from. */
  save(file: UploadableFile, folder: string): Promise<string>;
}
