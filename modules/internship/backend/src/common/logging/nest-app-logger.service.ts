import { Injectable, Logger } from '@nestjs/common';
import type { AppLogger } from './app-logger.types.js';

// The one place a concrete logging library is allowed to appear directly —
// everything else in the app depends on the AppLogger interface instead.
@Injectable()
export class NestAppLogger implements AppLogger {
  private readonly logger = new Logger();

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }
}
