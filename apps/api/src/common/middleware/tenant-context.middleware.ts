import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context stored in AsyncLocalStorage for automatic RLS enforcement.
 * Accessible from any service via `tenantStore.getStore()`.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Global AsyncLocalStorage instance for tenant context.
 * Set by TenantContextMiddleware, read by PrismaService.withAutoTenantContext().
 */
export const tenantStore = new AsyncLocalStorage<TenantContext>();

/**
 * Middleware that sets tenant context in AsyncLocalStorage for Row-Level Security (RLS).
 * Must run AFTER authentication so req.user is populated.
 *
 * The tenant context is automatically picked up by PrismaService.withAutoTenantContext()
 * to set PostgreSQL session variables (SET LOCAL app.current_tenant / app.current_role)
 * for RLS policy enforcement.
 *
 * Defense in depth:
 *   1. Application-level: services still use `where: { tenantId }` as first line of defense
 *   2. Database-level: RLS policies enforce tenant isolation even if app-level filter is missing
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as unknown as Record<string, unknown>).user as { tenantId?: string; id?: string; sub?: string; role: string } | undefined;

    if (user?.tenantId) {
      const context: TenantContext = {
        tenantId: user.tenantId,
        userId: user.id || user.sub || '',
        role: user.role,
      };

      // Store on request for easy access by controllers/services
      (req as unknown as Record<string, unknown>).tenantContext = context;

      // Run the rest of the request within the AsyncLocalStorage context
      // This makes the tenant context available to PrismaService automatically
      tenantStore.run(context, () => next());
    } else {
      next();
    }
  }
}
