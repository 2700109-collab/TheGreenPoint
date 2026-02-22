import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth.service';

/**
 * TenantGuard ensures that the authenticated user has a valid tenantId.
 * System-wide roles (regulator, inspector, super_admin, auditor) are exempt.
 * 
 * Also sets the tenant context for RLS-based database queries.
 *
 * Section 9.4 — RBAC Matrix alignment:
 * System-wide roles can access any tenant, operator roles are scoped.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly SYSTEM_WIDE_ROLES = [
    'super_admin',
    'regulator',
    'inspector',
    'auditor',
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // System-wide roles can access cross-tenant data
    if (this.SYSTEM_WIDE_ROLES.includes(user.role)) {
      return true;
    }

    // Operators must have a tenantId
    if (!user.tenantId) {
      throw new ForbiddenException(
        'User is not associated with any tenant organization',
      );
    }

    // Verify tenantId in params/query matches JWT tenant (prevent cross-tenant access)
    const params = request.params;
    const requestedTenant = params?.tenantId || request.query?.tenantId;
    if (requestedTenant && requestedTenant !== user.tenantId) {
      throw new ForbiddenException(
        'Access denied: cannot access data for another tenant',
      );
    }

    // Attach tenantId to request for downstream use
    request.tenantId = user.tenantId;

    return true;
  }
}
