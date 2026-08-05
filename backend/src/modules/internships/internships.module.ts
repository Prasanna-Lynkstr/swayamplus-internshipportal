import { Module } from '@nestjs/common';
import { InternshipsService } from './internships.service.js';
import { InternshipsController } from './internships.controller.js';

@Module({
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}
