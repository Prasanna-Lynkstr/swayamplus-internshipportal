import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SEQUELIZE } from './database.constants.js';
import { MODELS } from './models/index.js';

const logger = new Logger('Database');

export const sequelizeProvider: Provider = {
  provide: SEQUELIZE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const sequelize = new Sequelize({
      dialect: PostgresDialect,
      database: config.get<string>('DB_NAME', 'swayamplus_internship'),
      user: config.get<string>('DB_USER', 'postgres'),
      password: config.get<string>('DB_PASSWORD', 'postgres'),
      host: config.get<string>('DB_HOST', 'localhost'),
      port: config.get<number>('DB_PORT', 5432),
    });

    sequelize.addModels([...MODELS]);

    await sequelize.authenticate();
    // No migrations for this MVP — sync brings the schema up to date directly.
    await sequelize.sync({ alter: config.get<string>('NODE_ENV') !== 'production' });

    logger.log('Connected to Postgres and synced models');
    return sequelize;
  },
};
