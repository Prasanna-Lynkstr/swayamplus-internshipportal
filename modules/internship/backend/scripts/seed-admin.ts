import 'reflect-metadata';
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';
import { User } from '../src/database/models/user.model.js';

// Admins are provisioned out-of-band, never self-registered — run this once per
// environment (e.g. `bun run seed:admin`) after setting ADMIN_EMAIL/ADMIN_PASSWORD.
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
    process.exit(1);
  }

  const sequelize = new Sequelize({
    dialect: PostgresDialect,
    database: process.env.DB_NAME || 'swayamplus_internship',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  });

  sequelize.addModels([User]);
  await sequelize.authenticate();
  await sequelize.sync();

  const passwordHash = await Bun.password.hash(password);

  const [admin, created] = await User.findOrCreate({
    where: { identifier: email, role: 'admin' },
    defaults: { identifier: email, role: 'admin', passwordHash, isActive: true },
  });

  if (!created) {
    admin.passwordHash = passwordHash;
    admin.isActive = true;
    await admin.save();
    console.log(`Updated existing admin account: ${email}`);
  } else {
    console.log(`Created admin account: ${email}`);
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
