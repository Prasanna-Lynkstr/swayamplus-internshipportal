import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Sequelize, QueryTypes } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Backfills internships.uuid (see database/models/internship.model.ts) and
// locks it down to NOT NULL + UNIQUE. Needed as a standalone script rather
// than relying on the app's own sequelize.sync({ alter }) because that only
// runs outside production (see sequelize.provider.ts) — this is the only
// path that lands the column in a real deployment. Every step below is
// idempotent, so re-running this after a partial/interrupted run is safe.
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

  console.log('Ensuring internships.uuid column exists (nullable for now)...');
  await sequelize.query('ALTER TABLE internships ADD COLUMN IF NOT EXISTS uuid UUID;');

  const rows = await sequelize.query<{ id: number }>(
    'SELECT id FROM internships WHERE uuid IS NULL;',
    { type: QueryTypes.SELECT },
  );
  console.log(`Backfilling ${rows.length} row(s) with a generated uuid...`);
  for (const row of rows) {
    await sequelize.query('UPDATE internships SET uuid = :uuid WHERE id = :id;', {
      replacements: { uuid: randomUUID(), id: row.id },
    });
  }

  console.log('Enforcing NOT NULL on internships.uuid...');
  await sequelize.query('ALTER TABLE internships ALTER COLUMN uuid SET NOT NULL;');

  const [{ exists }] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'internships_uuid_unique'
     ) AS exists;`,
    { type: QueryTypes.SELECT },
  );
  if (!exists) {
    console.log('Adding unique constraint on internships.uuid...');
    await sequelize.query(
      'ALTER TABLE internships ADD CONSTRAINT internships_uuid_unique UNIQUE (uuid);',
    );
  } else {
    console.log('Unique constraint already present, skipping.');
  }

  console.log('Done — internships.uuid is backfilled, NOT NULL, and unique.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
