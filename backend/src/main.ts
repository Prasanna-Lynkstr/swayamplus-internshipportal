import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
    'http://localhost:3000',
  ];
  app.enableCors({ origin: corsOrigin, credentials: true });

  const uploadsRoot = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SWAYAM Plus Internship API listening on http://localhost:${port}/api`);
}

bootstrap();
