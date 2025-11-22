import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationDto } from './assets/dto/update-notification.dto';
import { MarkAllReadDto } from './assets/dto/mark-all-read.dto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { RequireScope } from 'src/security/developer/services/scopes/decorators/require-scope.decorator';
import { NotificationType } from './assets/enum/notification-type.enum';
import { NotificationFiltersDto } from './assets/dto/notification-filters.dto';

@ApiTags('Account Management | Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // #########################################################
  // FIND OPTIONS
  // #########################################################

  @Get()
  @RequireScope('read:notifications')
  @ApiOperation({
    summary: 'Get all notifications for current user',
    description:
      'Returns paginated list of notifications for the authenticated user. Supports filtering by type and read status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getNotifications(
    @Req() request: AuthenticatedRequest,
    @Query() filtersDto: NotificationFiltersDto,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    const filters: { type?: NotificationType; isRead?: boolean } = {};
    if (filtersDto.type) {
      filters.type = filtersDto.type;
    }
    if (filtersDto.isRead !== undefined) {
      filters.isRead = filtersDto.isRead;
    }

    // Extract pagination from filtersDto (which extends PaginationDto)
    const paginationDto = {
      page: filtersDto.page,
      limit: filtersDto.limit,
      sortBy: filtersDto.sortBy,
      sortOrder: filtersDto.sortOrder,
    };

    return this.notificationsService.getNotifications(userId, paginationDto, filters);
  }

  @Get('unread/count')
  @RequireScope('read:notifications')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the count of unread notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUnreadCount(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.getUnreadCount(userId).then((count) => ({
      count,
    }));
  }

  @Get(':id')
  @RequireScope('read:notifications')
  @ApiOperation({
    summary: 'Get a single notification by ID',
    description: 'Returns a specific notification for the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  getNotificationById(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.getNotificationById(userId, id);
  }

  // #########################################################
  // UPDATE OPTIONS
  // #########################################################

  // IMPORTANT: Specific routes must be defined BEFORE parameterized routes
  // Otherwise, routes like 'mark-all-read' will be matched by ':id'

  @Patch('mark-all-read')
  @RequireScope('write:notifications')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Marks all unread notifications (or all of a specific type) as read for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  markAllAsRead(
    @Req() request: AuthenticatedRequest,
    @Body() markAllReadDto?: MarkAllReadDto,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.markAllAsRead(userId, markAllReadDto);
  }

  @Patch(':id')
  @RequireScope('write:notifications')
  @ApiOperation({
    summary: 'Update a notification',
    description: 'Updates a notification (e.g., mark as read).',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  updateNotification(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationDto,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.updateNotification(userId, id, updateDto);
  }

  // #########################################################
  // DELETE OPTIONS
  // #########################################################

  // IMPORTANT: Specific routes must be defined BEFORE parameterized routes
  // Otherwise, routes like 'read/all' will be matched by ':id'

  @Delete('read/all')
  @RequireScope('write:notifications')
  @ApiOperation({
    summary: 'Delete all read notifications',
    description: 'Deletes all read notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Read notifications deleted',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 25 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteAllRead(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.deleteAllRead(userId);
  }

  @Delete(':id')
  @RequireScope('write:notifications')
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Deletes a specific notification for the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  deleteNotification(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = request.user?.id || request.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in session');
    }

    return this.notificationsService.deleteNotification(userId, id);
  }
}

