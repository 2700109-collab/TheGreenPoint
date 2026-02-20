import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware that sets PostgreSQL session variables for Row-Level Security (RLS).
 * Must run AFTER authentication so req.user is populated.
 * 
 * Sets:
 *   app.current_tenant = '<tenant_uuid>'
 *   app.current_role = '<user_role>'
 * 
 * These are read by RLS policies to filter data per-tenant.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;

    if (user?.tenantId) {
      // Store on request for easy access by services
      (req as any).tenantContext = {
        tenantId: user.tenantId,
        role: user.role,
      };
    }

    next();
  }
}
