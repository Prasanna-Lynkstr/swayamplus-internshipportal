import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Employer.verificationStatus's default flips from 'pending' to 'approved'
// now that the only way to create an Employer row is
// EmployerEoiService.convert(), which always sets 'approved' explicitly —
// 'pending' as a default described a self-registration flow that no longer
// exists (see employers.controller.ts, which dropped POST /employers/register).
// Standalone script for the same reason migrate-add-indexes.ts is one:
// sequelize.sync({ alter }) only runs outside production.
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

  console.log("Setting employers.verificationStatus default to 'approved'...");
  await sequelize.query(`ALTER TABLE employers ALTER COLUMN "verificationStatus" SET DEFAULT 'approved';`);

  console.log('Done.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
