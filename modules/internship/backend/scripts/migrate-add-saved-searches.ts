import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Creates the saved_searches table for prod deployments — sequelize.sync({
// alter }) only runs outside production (see sequelize.provider.ts), so
// this is the only path that lands a brand-new table in a real deployment.
// Everything here is written to be safely re-runnable.
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

  console.log('Creating saved_searches table...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id SERIAL PRIMARY KEY,
      "studentId" INTEGER NOT NULL REFERENCES students(id) ON UPDATE CASCADE ON DELETE CASCADE,
      filters JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  console.log('Indexing saved_searches.studentId...');
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS saved_searches_student_id ON saved_searches ("studentId");',
  );

  console.log('Done — saved_searches table is in place.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
