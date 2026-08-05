import { Global, Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.constants.js';
import { LocalDiskStorageService } from './local-disk-storage.service.js';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service.js';

const storageProvider: Provider = {
  provide: STORAGE_SERVICE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const driver = config.get<string>('STORAGE_DRIVER', 'local');
    if (driver === 'r2') {
      return new CloudflareR2StorageService(config);
    }
    return new LocalDiskStorageService();
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [storageProvider],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
