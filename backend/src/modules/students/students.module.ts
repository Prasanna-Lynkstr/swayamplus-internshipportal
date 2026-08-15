import { Module } from '@nestjs/common';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { StudentsService } from './students.service.js';
import { StudentsController } from './students.controller.js';

@Module({
  imports: [TaxonomiesModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
