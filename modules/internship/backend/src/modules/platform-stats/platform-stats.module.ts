import { Module } from '@nestjs/common';
import { PlatformStatsController } from './platform-stats.controller.js';
import { PlatformStatsService } from './platform-stats.service.js';

@Module({
  controllers: [PlatformStatsController],
  providers: [PlatformStatsService],
})
export class PlatformStatsModule {}
