import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@ncts/database';

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
   */
  async withTenantContext<T>(
    tenantId: string,
    role: string,
    callback: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set RLS context variables for this transaction
      await (tx as any).$executeRawUnsafe(
        `SET LOCAL app.current_tenant = '${tenantId}'`,
      );
      await (tx as any).$executeRawUnsafe(
        `SET LOCAL app.current_role = '${role}'`,
      );
      return callback(tx as unknown as PrismaClient);
    });
  }
}
