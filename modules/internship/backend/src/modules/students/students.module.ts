import { Module } from '@nestjs/common';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { ResumeParserService } from './resume-parser.service.js';

@Module({
  imports: [TaxonomiesModule, PlatformSettingsModule],
  controllers: [StudentsController],
  providers: [StudentsService, ResumeParserService],
  exports: [StudentsService],
})
export class StudentsModule {}
