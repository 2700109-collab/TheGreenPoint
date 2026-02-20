import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth.service';

/**
 * TenantGuard ensures that the authenticated user has a valid tenantId.
 * Regulators/admins are exempt (they access cross-tenant data).
 * 
 * Also sets the tenant context for RLS-based database queries.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly EXEMPT_ROLES = ['regulator', 'inspector', 'admin'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Regulators/inspectors/admins can access cross-tenant data
    if (this.EXEMPT_ROLES.includes(user.role)) {
      return true;
    }

    // Operators must have a tenantId
    if (!user.tenantId) {
      throw new ForbiddenException(
        'User is not associated with any tenant organization',
      );
    }

    // Attach tenantId to request for downstream use
    request.tenantId = user.tenantId;

    return true;
  }
}
