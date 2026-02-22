import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Section 9.5 — Global Exception Filter
 *
 * Catches all unhandled exceptions and returns structured error responses.
 * - Includes requestId for request tracing
 * - Masks internal error details in production (500s)
 * - Logs full stack trace for 500+ errors
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  /**
   * RC-912: Evaluated once at construction time. Acceptable since NODE_ENV
   * doesn't change at runtime. Using ConfigService would require DI registration
   * (APP_FILTER provider) instead of manual instantiation in main.ts.
   */
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || exception.message;
        error = (resp.error as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      // Don't leak internal error details in production
      message = this.isProduction
        ? 'An unexpected error occurred'
        : exception.message;
      error = 'InternalServerError';
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'UnknownError';
      this.logger.error('Unknown exception thrown', String(exception));
    }

    const requestId =
      ((request as unknown as Record<string, unknown>).requestId as string | undefined) ||
      (request.headers['x-correlation-id'] as string | undefined) ||
      request.id;

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log 500+ errors with full context
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} [requestId=${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).send(errorResponse);
  }
}
