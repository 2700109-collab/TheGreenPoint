import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict endpoint access to specific user roles.
 * Must be used with JwtAuthGuard and RolesGuard.
 * 
 * Usage:
 *   @Roles('operator_admin', 'operator_staff')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('facilities')
 *   list() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
