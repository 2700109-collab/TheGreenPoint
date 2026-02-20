import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the tenant ID from the request.
 * Set by TenantGuard after validating the authenticated user.
 * 
 * Usage:
 *   @UseGuards(JwtAuthGuard, TenantGuard)
 *   @Get('facilities')
 *   list(@TenantId() tenantId: string) { ... }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    // tenantId is set by TenantGuard, or from the authenticated user
    return request.tenantId || request.user?.tenantId;
  },
);
