import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as path from 'node:path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { APP_LOGGER } from './common/logging/app-logger.constants.js';
import type { AppLogger } from './common/logging/app-logger.types.js';

const API_PREFIX = 'api/v1';
// Stable, unversioned paths a load balancer / doc reader expects regardless
// of API version bumps.
const PREFIX_EXCLUDE = ['health', 'docs', 'docs-json'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  // gzip every JSON response — the browse/dashboard/applications payloads
  // are plain arrays of listing objects, which compress well (70-80%+).
  app.use(compression());

  app.setGlobalPrefix(API_PREFIX, { exclude: PREFIX_EXCLUDE });
  app.useGlobalFilters(new AllExceptionsFilter(app.get<AppLogger>(APP_LOGGER)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Reject requests with unexpected fields outright instead of silently
      // dropping (whitelist:true) or persisting them.
      forbidNonWhitelisted: true,
      // One message per *field*, not one per failing decorator on that
      // field — without this, a single missing array field (e.g.
      // @IsArray + @ArrayNotEmpty + @IsString({each:true}) all failing on
      // an absent value) surfaces as 2-3 near-duplicate messages, which is
      // exactly the clutter a client trying to show a clean error list runs
      // into. The frontend still lists every *field's* message (see
      // FormError.tsx) — this only dedupes within one field.
      stopAtFirstError: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
    'http://localhost:3000',
  ];
  app.enableCors({ origin: corsOrigin, credentials: true });

  const uploadsRoot = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('SWAYAM Plus Internship API')
      .setDescription('Endpoint inventory for VAPT review and frontend/backend contract clarity.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Drain in-flight requests and close DB/Redis connections on SIGTERM/SIGINT
  // rather than dying mid-request when an orchestrator recycles the process.
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SWAYAM Plus Internship API listening on http://localhost:${port}/${API_PREFIX}`);
  // eslint-disable-next-line no-console
  console.log(`API docs at http://localhost:${port}/docs`);
}

bootstrap();
