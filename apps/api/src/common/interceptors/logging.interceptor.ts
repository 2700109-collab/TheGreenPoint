import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '-';
    const correlationId =
      (request.headers['x-correlation-id'] as string) || request.id;
    const startTime = Date.now();

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
              ip,
              userAgent,
            }),
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.warn(
            JSON.stringify({
              correlationId,
              method,
              url,
              error: error.message,
              duration: `${duration}ms`,
              ip,
              userAgent,
            }),
          );
        },
      }),
    );
  }
}
