import { Global, Module } from '@nestjs/common';
import { APP_LOGGER } from './app-logger.constants.js';
import { NestAppLogger } from './nest-app-logger.service.js';

@Global()
@Module({
  providers: [{ provide: APP_LOGGER, useClass: NestAppLogger }],
  exports: [APP_LOGGER],
})
export class AppLoggerModule {}
