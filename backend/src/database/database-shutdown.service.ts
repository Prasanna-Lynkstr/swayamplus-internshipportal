import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { Sequelize } from '@sequelize/core';
import { SEQUELIZE } from './database.constants.js';
import { APP_LOGGER } from '../common/logging/app-logger.constants.js';
import type { AppLogger } from '../common/logging/app-logger.types.js';

// Closes the DB connection pool on SIGTERM/SIGINT (via main.ts's
// enableShutdownHooks()) instead of leaving it to die mid-request when an
// orchestrator recycles the process.
@Injectable()
export class DatabaseShutdownService implements OnApplicationShutdown {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal ?? 'shutdown'} — closing DB connections.`, DatabaseShutdownService.name);
    await this.sequelize.close();
  }
}
