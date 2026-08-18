import { Module } from '@nestjs/common';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module.js';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { EmployersService } from './employers.service.js';
import { EmployersController } from './employers.controller.js';

@Module({
  imports: [PlatformSettingsModule, TaxonomiesModule],
  controllers: [EmployersController],
  providers: [EmployersService],
  exports: [EmployersService],
})
export class EmployersModule {}
