import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService as MainNotificationService } from '../../notifications/notification.service';

/**
 * Lightweight notification service for compliance alerts.
 * Creates in-app notifications via the Notification model.
 * Email/SMS channels delegate to the main NotificationService for actual delivery.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mainNotificationService: MainNotificationService,
  ) {}

  /**
   * Send notification to all users with a specific role, optionally scoped to a tenant.
   */
  async sendToRole(
    role: string,
    notification: {
      tenantId?: string;
      type: string;
      title: string;
      body: string;
      channel?: string;
      entityType?: string;
      entityId?: string;
    },
  ): Promise<void> {
    const where: Prisma.UserWhereInput = { role };
    if (notification.tenantId) {
      where.tenantId = notification.tenantId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });

    for (const user of users) {
      await this.createNotification(user.id, notification);

      // Channel-specific delivery via main notification service
      if (notification.channel === 'email') {
        await this.mainNotificationService.send({
          userId: user.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          channel: 'email',
          entityType: notification.entityType,
          entityId: notification.entityId,
        });
      } else if (notification.channel === 'sms') {
        await this.mainNotificationService.send({
          userId: user.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          channel: 'sms',
          entityType: notification.entityType,
          entityId: notification.entityId,
        });
      }
    }
  }

  /**
   * Send notification to a specific user.
   */
  async send(notification: {
    userId: string;
    type: string;
    title: string;
    body: string;
    channel?: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    await this.createNotification(notification.userId, notification);
  }

  private async createNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      channel?: string;
      entityType?: string;
      entityId?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          channel: notification.channel || 'in_app',
          title: notification.title,
          body: notification.body,
          entityType: notification.entityType || null,
          entityId: notification.entityId || null,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}: ${error}`);
    }
  }
}
