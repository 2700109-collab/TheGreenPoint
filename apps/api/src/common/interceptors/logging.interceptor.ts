import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest } from 'fastify';

/**
 * Section 9.5 — Enhanced Request Logging Interceptor
 *
 * Logs structured JSON for every request including:
 * - correlationId, method, url, statusCode, duration
 * - userId, tenantId (from JWT token)
 * - IP address, user-agent
 * - Slow-request warnings (> 2s)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private static readonly SLOW_REQUEST_MS = 2000;
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '-';
    const correlationId =
      (request.headers['x-correlation-id'] as string) || request.id;
    const startTime = Date.now();

    // Extract user context (available after JWT auth)
    const user = (request as unknown as Record<string, unknown>).user as { id?: string; tenantId?: string } | undefined;
    const userId = user?.id || 'anonymous';
    const tenantId = user?.tenantId || 'none';

    // Attach requestId to request for use in exception filter
    (request as unknown as Record<string, unknown>).requestId = correlationId;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          this.logger.log(
            JSON.stringify({
              correlationId,
              method,
              url,
              statusCode,
              duration: `${duration}ms`,
              userId,
              tenantId,
              ip,
              userAgent: userAgent.substring(0, 100),
            }),
          );

          // Slow request warning
          if (duration > LoggingInterceptor.SLOW_REQUEST_MS) {
            this.logger.warn(
              `Slow request: ${method} ${url} took ${duration}ms (userId=${userId}, tenantId=${tenantId})`,
            );
          }
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.warn(
            JSON.stringify({
              correlationId,
              method,
              url,
              // RC-913: Mask error details in production to avoid leaking sensitive info in log aggregators
              error: this.isProduction
                ? error.constructor.name
                : error.message,
              duration: `${duration}ms`,
              userId,
              tenantId,
              ip,
              userAgent: userAgent.substring(0, 100),
            }),
          );
        },
      }),
    );
  }
}
