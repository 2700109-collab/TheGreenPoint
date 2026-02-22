import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface SendNotificationInput {
  tenantId?: string;
  userId?: string;
  role?: string;
  type: string;
  title: string;
  body: string;
  channel?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

/**
 * Section 5.3 — Notification Service
 *
 * Channels:
 *   in_app  → Database (always)
 *   email   → AWS SES (prod) / Mailpit (dev) — placeholder
 *   sms     → AWS SNS (prod) / console.log (dev) — placeholder
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly isDev: boolean;
  private readonly emailTransporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.isDev = this.config.get('NODE_ENV', 'development') !== 'production';

    // Configure nodemailer transporter
    // Dev: Mailpit on localhost:1025 (no auth)
    // Prod: Configured SMTP (can point to AWS SES SMTP endpoint)
    if (this.isDev) {
      this.emailTransporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
        tls: { rejectUnauthorized: false },
      });
    } else {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.get('SMTP_HOST', 'localhost'),
        port: parseInt(this.config.get('SMTP_PORT', '587'), 10),
        secure: this.config.get('SMTP_SECURE', 'false') === 'true',
        ...(this.config.get('SMTP_USER')
          ? {
              auth: {
                user: this.config.get('SMTP_USER'),
                pass: this.config.get('SMTP_PASS'),
              },
            }
          : {}),
      });
    }
  }

  /**
   * Send a notification — resolves target users by userId, role, or role + tenant.
   */
  async send(notification: SendNotificationInput): Promise<void> {
    // Resolve target users
    let userIds: string[] = [];

    if (notification.userId) {
      userIds = [notification.userId];
    } else if (notification.role && notification.tenantId) {
      const users = await this.prisma.user.findMany({
        where: { tenantId: notification.tenantId, role: notification.role },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    } else if (notification.role) {
      const users = await this.prisma.user.findMany({
        where: { role: notification.role },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    }

    if (userIds.length === 0) {
      this.logger.debug(`No target users for notification: ${notification.title}`);
      return;
    }

    // Create in-app notifications
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: notification.type,
        channel: notification.channel || 'in_app',
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType || null,
        entityId: notification.entityId || null,
        actionUrl: notification.actionUrl || null,
      })),
    });

    // Send external notifications based on channel
    if (notification.channel === 'email') {
      await this.sendEmail(userIds, notification);
    }
    if (notification.channel === 'sms' || notification.type === 'critical') {
      await this.sendSms(userIds, notification);
    }

    // Invalidate unread count cache for all target users
    await Promise.all(userIds.map(uid => this.invalidateUnreadCache(uid)));
  }

  /**
   * Send notification to all users with a specific role (not scoped to tenant).
   */
  async sendToRole(
    role: string,
    notification: Omit<SendNotificationInput, 'role' | 'userId'>,
  ): Promise<void> {
    await this.send({ ...notification, role });
  }

  /**
   * Get unread notifications for a user (up to 50, newest first).
   */
  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get all notifications for a user (paginated).
   */
  async getAll(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Mark a single notification as read.
   */
  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    await this.invalidateUnreadCache(userId);
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    await this.invalidateUnreadCache(userId);
  }

  /**
   * Count unread notifications for header badge.
   * Cached in Redis for 30s to reduce DB pressure from badge polling.
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const cacheKey = `notif:unread:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return { count: parseInt(cached, 10) };
    }

    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    await this.redis.set(cacheKey, String(count), 30);
    return { count };
  }

  /**
   * Invalidate the cached unread count for a user.
   */
  private async invalidateUnreadCache(userId: string): Promise<void> {
    await this.redis.del(`notif:unread:${userId}`);
  }

  // ─── External channels (placeholders) ────────────────────────────

  private async sendEmail(
    userIds: string[],
    notification: SendNotificationInput,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true, firstName: true },
    });

    const fromAddress = this.config.get(
      'EMAIL_FROM',
      'ncts-notifications@greenpoint.co.za',
    );

    for (const user of users) {
      if (!user.email) {
        this.logger.warn(`User missing email address, skipping email notification`);
        continue;
      }

      try {
        await this.emailTransporter.sendMail({
          from: fromAddress,
          to: user.email,
          subject: notification.title,
          text: notification.body,
          html: `<h2>${notification.title}</h2><p>${notification.body}</p>${notification.actionUrl ? `<p><a href="${notification.actionUrl}">View Details</a></p>` : ''}`,
        });

        this.logger.debug(
          `${this.isDev ? '[DEV] ' : ''}Email sent to ${user.email}: ${notification.title}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async sendSms(
    userIds: string[],
    notification: SendNotificationInput,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.debug(
        `[DEV SMS] To ${userIds.length} users: ${notification.title} — ${notification.body}`,
      );
      return;
    }

    // Production: Send SMS via AWS SNS
    // Note: User model currently has no phone field.
    // When a phone column is added, replace this with per-user SMS delivery.
    const snsTopicArn = this.config.get<string>('AWS_SNS_TOPIC_ARN');
    if (!snsTopicArn) {
      this.logger.warn(
        'AWS_SNS_TOPIC_ARN not configured — cannot send SMS notifications. ' +
        'Set AWS_SNS_TOPIC_ARN env variable to enable SMS.',
      );
      return;
    }

    const region = this.config.get('AWS_REGION', 'af-south-1');
    const snsClient = new SNSClient({ region });
    const message = `${notification.title}: ${notification.body}`;

    try {
      await snsClient.send(
        new PublishCommand({
          TopicArn: snsTopicArn,
          Message: message,
          Subject: notification.title,
        }),
      );
      this.logger.log(
        `SMS notification published to SNS topic for ${userIds.length} users: ${notification.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SMS via SNS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
