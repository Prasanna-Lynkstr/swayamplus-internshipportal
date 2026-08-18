import { Module } from '@nestjs/common';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';
import { ResumeParserService } from './resume-parser.service.js';

@Module({
  imports: [TaxonomiesModule],
  controllers: [StudentsController],
  providers: [StudentsService, ResumeParserService],
  exports: [StudentsService],
})
export class StudentsModule {}
