import { Module } from '@nestjs/common';
import { TaxonomiesService } from './taxonomies.service.js';
import { TaxonomiesController } from './taxonomies.controller.js';

@Module({
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
