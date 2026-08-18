import { Module } from '@nestjs/common';
import { SavedSearchesService } from './saved-searches.service.js';
import { SavedSearchesController } from './saved-searches.controller.js';

@Module({
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
})
export class SavedSearchesModule {}
