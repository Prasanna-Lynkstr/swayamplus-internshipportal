import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { Sequelize } from '@sequelize/core';
import { Public } from '../../common/decorators/public.decorator.js';
import { SEQUELIZE } from '../../database/database.constants.js';

// Deliberately outside the /api/v1 prefix (see main.ts's setGlobalPrefix
// exclude list) — load balancers/orchestrators expect a stable, unversioned
// health path.
@Controller('health')
export class HealthController {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.sequelize.authenticate();
    } catch {
      throw new ServiceUnavailableException('Database unreachable.');
    }
    return { status: 'ok', db: 'connected' };
  }
}
