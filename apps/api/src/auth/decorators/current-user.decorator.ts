import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth.service';

/**
 * Extract the authenticated user from the request.
 * 
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 * 
 *   // Or extract a specific property:
 *   @Get('my-tenant')
 *   getTenant(@CurrentUser('tenantId') tenantId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
