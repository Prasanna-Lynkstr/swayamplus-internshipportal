import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Adds students."discoverableToEmployers" for prod deployments — sequelize.
// sync({ alter }) only runs outside production (see sequelize.provider.ts),
// so this is the only path that lands the new column in a real deployment.
// Safely re-runnable. Column name must be the quoted camelCase Sequelize
// actually uses (confirmed against a sync({ alter })'d dev DB) — an
// unquoted/snake_case ADD COLUMN here would create a second, wrong column
// that the model never reads or writes, same convention already followed
// by migrate-add-saved-searches.ts and migrate-add-indexes.ts.
async function main() {
  const sequelize = new Sequelize({
    dialect: PostgresDialect,
    database: process.env.DB_NAME || 'swayamplus_internship',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  });

  await sequelize.authenticate();

  console.log('Adding students."discoverableToEmployers"...');
  await sequelize.query(`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS "discoverableToEmployers" boolean NOT NULL DEFAULT true;
  `);

  console.log('Done.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
