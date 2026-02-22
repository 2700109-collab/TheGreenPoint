import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { NotificationQueryDto, NotificationParamDto } from './dto';

/**
 * Section 5.3 — Notification Controller
 *
 * All endpoints require authentication. Users can only access their own notifications.
 */
@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications — Unread notifications for the current user (newest first, max 50).
   */
  @Get()
  @ApiOperation({ summary: 'Get unread notifications for the current user' })
  @ApiResponse({ status: 200, description: 'List of unread notifications (max 50)' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  async getUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnread(user.id);
  }

  /**
   * GET /notifications/all — All notifications for the current user (paginated).
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all notifications (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated notification list with total count' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  async getAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getAll(user.id, query.page, query.limit);
  }

  /**
   * GET /notifications/count — Unread count for header badge UI.
   */
  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Object with unread count' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user.id);
  }

  /**
   * PATCH /notifications/:id/read — Mark a single notification as read.
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  @ApiResponse({ status: 404, description: 'Notification not found or not owned by user' })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NotificationParamDto,
  ) {
    await this.notificationService.markRead(user.id, params.id);
    return { success: true };
  }

  /**
   * PATCH /notifications/read-all — Mark all notifications as read.
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized — JWT required' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationService.markAllRead(user.id);
    return { success: true };
  }
}
