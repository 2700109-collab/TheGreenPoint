import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@ncts/database';
import { Prisma } from '@prisma/client';
import { tenantStore } from '../common/middleware/tenant-context.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }

  /**
   * Execute a callback within a tenant-scoped transaction.
   * Sets PostgreSQL session variables for RLS enforcement.
   * 
   * Uses set_config() instead of SET LOCAL because PostgreSQL's SET command
   * does not support parameterized queries via the extended query protocol.
   * set_config(name, value, is_local=true) is equivalent to SET LOCAL.
   */
  async withTenantContext<T>(
    tenantId: string,
    role: string,
    callback: (tx: PrismaClient) => Promise<T>,
    userId?: string,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Section 9.1: Use Prisma.sql tagged templates — safe parameterized queries
      // set_config(name, value, is_local=true) is equivalent to SET LOCAL
      const rawTx = tx as unknown as { $executeRaw: PrismaClient['$executeRaw'] };
      await rawTx.$executeRaw(
        Prisma.sql`SELECT set_config('app.current_tenant', ${tenantId}::text, true)`,
      );
      await rawTx.$executeRaw(
        Prisma.sql`SELECT set_config('app.current_role', ${role}::text, true)`,
      );
      // Set user ID for user-scoped RLS policies (consents, notifications)
      if (userId) {
        await rawTx.$executeRaw(
          Prisma.sql`SELECT set_config('app.current_user', ${userId}::text, true)`,
        );
      }
      return callback(tx as unknown as PrismaClient);
    });
  }

  /**
   * Execute a callback within an auto-detected tenant context.
   * Uses AsyncLocalStorage to automatically pick up the tenant context
   * set by the TenantContextMiddleware from the current request.
   * 
   * This is the preferred method for service-level transactions.
   * Falls back to no-RLS if no tenant context is available (e.g., cron jobs).
   */
  async withAutoTenantContext<T>(
    callback: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const context = tenantStore.getStore();

    if (context?.tenantId) {
      return this.withTenantContext(
        context.tenantId,
        context.role,
        callback,
        context.userId,
      );
    }

    // No tenant context (system-level operation, cron job, etc.)
    // FIX (H7): Set admin role so FORCE ROW LEVEL SECURITY doesn't block
    return this.$transaction(async (tx) => {
      const rawTx = tx as unknown as { $executeRaw: PrismaClient['$executeRaw'] };
      await rawTx.$executeRaw(
        Prisma.sql`SELECT set_config('app.current_role', 'admin', true)`,
      );
      return callback(tx as unknown as PrismaClient);
    });
  }
}
