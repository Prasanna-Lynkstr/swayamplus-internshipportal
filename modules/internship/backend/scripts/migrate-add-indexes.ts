import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

// Adds the two indexes flagged by the scalability audit as missing on hot
// filter/FK columns (see database/models/internship-application.model.ts and
// internship-request.model.ts). Needed as a standalone script for the same
// reason migrate-internship-uuid.ts is: sequelize.sync({ alter }) only runs
// outside production (see sequelize.provider.ts), so this is the only path
// that lands these indexes in a real deployment. `CREATE INDEX IF NOT
// EXISTS` makes every step here idempotent.
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

  console.log('Indexing internship_applications.studentId...');
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS internship_applications_student_id ON internship_applications ("studentId");',
  );

  console.log('Indexing internship_requests.studentId...');
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS internship_requests_student_id ON internship_requests ("studentId");',
  );

  console.log('Done — both indexes are in place.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
