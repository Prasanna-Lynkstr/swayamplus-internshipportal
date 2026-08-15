import { Module } from '@nestjs/common';
import { TaxonomiesModule } from '../taxonomies/taxonomies.module.js';
import { InternshipsService } from './internships.service.js';
import { InternshipsController } from './internships.controller.js';

@Module({
  imports: [TaxonomiesModule],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}
