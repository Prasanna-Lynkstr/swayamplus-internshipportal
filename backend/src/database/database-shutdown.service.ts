import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import type { Sequelize } from '@sequelize/core';
import { SEQUELIZE } from './database.constants.js';

// Closes the DB connection pool on SIGTERM/SIGINT (via main.ts's
// enableShutdownHooks()) instead of leaving it to die mid-request when an
// orchestrator recycles the process.
@Injectable()
export class DatabaseShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseShutdownService.name);

  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal ?? 'shutdown'} — closing DB connections.`);
    await this.sequelize.close();
  }
}
