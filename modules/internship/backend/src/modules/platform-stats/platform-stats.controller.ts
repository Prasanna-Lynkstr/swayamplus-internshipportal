import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { PlatformStatsService } from './platform-stats.service.js';

@Controller('platform-stats')
export class PlatformStatsController {
  constructor(private readonly platformStatsService: PlatformStatsService) {}

  @Public()
  @Get()
  getStats() {
    return this.platformStatsService.getStats();
  }
}
