import { Module } from '@nestjs/common';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module.js';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmployerEoiService } from './employer-eoi.service.js';
import { EmployerEoiController } from './employer-eoi.controller.js';

@Module({
  imports: [PlatformSettingsModule, TaxonomiesModule, NotificationsModule],
  controllers: [EmployerEoiController],
  providers: [EmployerEoiService],
  exports: [EmployerEoiService],
})
export class EmployerEoiModule {}
