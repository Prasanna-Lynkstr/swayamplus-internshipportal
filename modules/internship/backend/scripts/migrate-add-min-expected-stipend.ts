import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Adds student_preferences.min_expected_stipend for prod deployments —
// sequelize.sync({ alter }) only runs outside production (see
// sequelize.provider.ts), so this is the only path that lands the new
// column in a real deployment. Safely re-runnable.
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

  console.log('Adding student_preferences."minExpectedStipend"...');
  await sequelize.query(`
    ALTER TABLE student_preferences
    ADD COLUMN IF NOT EXISTS "minExpectedStipend" integer;
  `);

  console.log('Done.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
