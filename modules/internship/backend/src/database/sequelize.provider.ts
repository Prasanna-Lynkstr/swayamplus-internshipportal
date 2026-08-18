import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { SEQUELIZE } from './database.constants.js';
import { MODELS } from './models/index.js';
import { APP_LOGGER } from '../common/logging/app-logger.constants.js';
import type { AppLogger } from '../common/logging/app-logger.types.js';

export const sequelizeProvider: Provider = {
  provide: SEQUELIZE,
  inject: [ConfigService, APP_LOGGER],
  useFactory: async (config: ConfigService, logger: AppLogger) => {
    const sequelize = new Sequelize({
      dialect: PostgresDialect,
      database: config.get<string>('DB_NAME', 'swayamplus_internship'),
      user: config.get<string>('DB_USER', 'postgres'),
      password: config.get<string>('DB_PASSWORD', 'postgres'),
      host: config.get<string>('DB_HOST', 'localhost'),
      port: config.get<number>('DB_PORT', 5432),
      pool: {
        max: config.get<number>('DB_POOL_MAX', 10),
        min: config.get<number>('DB_POOL_MIN', 0),
        idle: config.get<number>('DB_POOL_IDLE_MS', 10000),
        acquire: config.get<number>('DB_POOL_ACQUIRE_MS', 30000),
      },
    });

    sequelize.addModels([...MODELS]);

    await sequelize.authenticate();
    // No migrations for this MVP — sync brings the schema up to date directly.
    await sequelize.sync({ alter: config.get<string>('NODE_ENV') !== 'production' });

    logger.log('Connected to Postgres and synced models', 'Database');
    return sequelize;
  },
};
