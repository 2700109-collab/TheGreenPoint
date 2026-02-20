import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../database/prisma.service';
import { computeEventHash, GENESIS_HASH } from '@ncts/audit-lib';
import { randomUUID } from 'crypto';

/**
 * Map HTTP methods to audit actions.
 */
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * AuditInterceptor automatically logs every state-changing API call
 * to the audit_events table with hash-chaining for tamper evidence.
 * 
 * Only intercepts POST, PUT, PATCH, DELETE requests.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method;

    // Only audit state-changing operations
    if (!METHOD_ACTION_MAP[method]) {
      return next.handle();
    }

    const action = METHOD_ACTION_MAP[method]!;
    const user = (request as any).user;
    const url = request.url;

    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          try {
            await this.createAuditEvent({
              action,
              url,
              user,
              request,
              responseBody,
            });
          } catch (error) {
            // Never let audit failures break the main request
            this.logger.error(
              `Failed to create audit event: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        },
      }),
    );
  }

  private async createAuditEvent(params: {
    action: string;
    url: string;
    user: any;
    request: FastifyRequest;
    responseBody: unknown;
  }) {
    const { action, url, user, request, responseBody } = params;

    // Extract entity type and ID from URL
    // e.g., /api/v1/facilities/abc-123 → entityType: 'facility', entityId: 'abc-123'
    const { entityType, entityId } = this.parseEntityFromUrl(url);

    // Get the previous hash for chain linking
    const previousEvent = await this.prisma.auditEvent.findFirst({
      orderBy: { sequenceNumber: 'desc' },
      select: { eventHash: true },
    });
    const previousHash = previousEvent?.eventHash || GENESIS_HASH;

    const eventId = randomUUID();
    const createdAt = new Date().toISOString();

    const payload = {
      method: request.method,
      url,
      body: request.body || {},
      responseId:
        responseBody && typeof responseBody === 'object'
          ? (responseBody as any).id
          : undefined,
    };

    const eventHash = computeEventHash({
      id: eventId,
      entityType,
      entityId,
      action,
      actorId: user?.id || 'anonymous',
      payload,
      previousHash,
      createdAt,
    });

    await this.prisma.auditEvent.create({
      data: {
        id: eventId,
        entityType,
        entityId,
        action,
        actorId: user?.id || 'anonymous',
        actorRole: user?.role || 'anonymous',
        tenantId: user?.tenantId || null,
        payload,
        previousHash,
        eventHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        gpsLatitude: request.headers['x-gps-latitude']
          ? parseFloat(request.headers['x-gps-latitude'] as string)
          : null,
        gpsLongitude: request.headers['x-gps-longitude']
          ? parseFloat(request.headers['x-gps-longitude'] as string)
          : null,
      },
    });

    this.logger.debug(
      `Audit: ${action} ${entityType} ${entityId} by ${user?.email || 'anonymous'}`,
    );
  }

  private parseEntityFromUrl(url: string): {
    entityType: string;
    entityId: string;
  } {
    // Remove query params and API prefix
    const path = url.split('?')[0]!.replace(/^\/api\/v\d+\//, '');
    const segments = path.split('/').filter(Boolean);

    // e.g., ['facilities', 'abc-123', 'zones'] → entityType: 'zone', entityId from body
    // e.g., ['facilities', 'abc-123'] → entityType: 'facility', entityId: 'abc-123'
    // e.g., ['facilities'] → entityType: 'facility', entityId: 'new'

    if (segments.length >= 2) {
      const entityType = this.singularize(segments[segments.length === 2 ? 0 : segments.length - 1]!);
      const entityId = segments.length === 2 ? segments[1]! : 'derived';
      return { entityType, entityId };
    }

    return {
      entityType: segments[0] ? this.singularize(segments[0]) : 'unknown',
      entityId: 'new',
    };
  }

  private singularize(word: string): string {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ses')) return word.slice(0, -2);
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
  }
}
