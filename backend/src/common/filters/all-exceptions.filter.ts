import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Consistent { statusCode, message, errorId } shape across the whole API,
 * and — the actual point of this filter — never leaks a stack trace or raw
 * internal error message to the client for anything that isn't a deliberate
 * HttpException. Full detail (including the stack) is logged server-side
 * only, tagged with the same errorId so it can be correlated from a support
 * report or log aggregator.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const errorId = randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as Record<string, unknown>).message ?? body);

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`[${errorId}] ${exception.message}`, exception.stack);
      }

      response.status(status).json({ statusCode: status, message, errorId });
      return;
    }

    this.logger.error(
      `[${errorId}] Unhandled exception`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error.',
      errorId,
    });
  }
}
