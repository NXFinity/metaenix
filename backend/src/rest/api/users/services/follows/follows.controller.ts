import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Body,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { CurrentUser } from 'src/security/auth/decorators/currentUser.decorator';
import { User } from '../../assets/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Throttle } from '@throttle/throttle';
// AdminGuard import removed - admin endpoint moved to /v1/admin/users/:id/cooldown/:followingId
import { Response } from 'express';
import { RequireScope } from 'src/security/developer/services/scopes/decorators/require-scope.decorator';
import { Public } from 'src/security/auth/decorators/public.decorator';

@ApiTags('Account Management | Follows')
@Controller('follows')
@ApiBearerAuth()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // #########################################################
  // FOLLOW OPTIONS
  // #########################################################

  @Post(':userId/follow')
  @RequireScope('write:follows')
  @Throttle({ limit: 30, ttl: 60 }) // 30 follows per minute
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', description: 'User ID to follow' })
  @ApiResponse({
    status: 201,
    description: 'Successfully followed user',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (already following or self-follow)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  followUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    const followerId = user?.id;
    if (!followerId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService.followUser(followerId, userId);
  }

  @Delete(':userId/follow')
  @RequireScope('write:follows')
  @Throttle({ limit: 30, ttl: 60 }) // 30 unfollows per minute
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', description: 'User ID to unfollow' })
  @ApiResponse({
    status: 200,
    description: 'Successfully unfollowed user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not following this user' })
  unfollowUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    const followerId = user?.id;
    if (!followerId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService.unfollowUser(followerId, userId);
  }

  @Get(':userId/following')
  @Public()
  @RequireScope('read:follows') // Required for OAuth tokens accessing private data
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dateCreated', 'username', 'displayName'],
    example: 'dateCreated',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by username or displayName',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'Following list retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowing(
    @CurrentUser() user?: User,
    @Param('userId') userId?: string,
    @Query() paginationDto?: PaginationDto & { search?: string },
  ) {
    const currentUserId = user?.id;
    return this.followsService.getFollowing(userId!, currentUserId, paginationDto || {});
  }

  @Get(':userId/followers')
  @Public()
  @RequireScope('read:follows') // Required for OAuth tokens accessing private data
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dateCreated', 'username', 'displayName'],
    example: 'dateCreated',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by username or displayName',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'Followers list retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowers(
    @CurrentUser() user?: User,
    @Param('userId') userId?: string,
    @Query() paginationDto?: PaginationDto & { search?: string },
  ) {
    const currentUserId = user?.id;
    return this.followsService.getFollowers(
      userId!,
      currentUserId,
      paginationDto || {},
    );
  }

  @Post('batch-status')
  @ApiOperation({ summary: 'Batch check follow status for multiple users' })
  @ApiResponse({
    status: 200,
    description: 'Batch follow status retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'boolean' },
      example: { 'user-id-1': true, 'user-id-2': false },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  batchFollowStatus(
    @CurrentUser() user: User,
    @Body() body: { userIds: string[] },
  ) {
    const followerId = user?.id;
    if (!followerId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService.batchFollowStatus(followerId, body.userIds);
  }

  @Get(':userId/follow-status')
  @ApiOperation({ summary: 'Check if current user is following another user' })
  @ApiParam({ name: 'userId', description: 'User ID to check' })
  @ApiResponse({
    status: 200,
    description: 'Follow status retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  isFollowing(@CurrentUser() user: User, @Param('userId') userId: string) {
    const followerId = user?.id;
    if (!followerId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService
      .isFollowing(followerId, userId)
      .then((isFollowing) => ({
        isFollowing,
      }));
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get follow suggestions based on mutual connections' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Follow suggestions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFollowSuggestions(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService.getFollowSuggestions(userId, limit || 10);
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get follow statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Follow statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowStats(@CurrentUser() user: User, @Param('userId') userId: string) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.followsService.getFollowStats(userId);
  }

  @Get(':userId/analytics')
  @RequireScope('read:analytics')
  @ApiOperation({ summary: 'Get follow analytics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Follow analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowAnalytics(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    // Users can only view their own analytics
    if (currentUserId !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.followsService.getFollowAnalytics(userId);
  }

  // Admin endpoint moved to: /v1/admin/users/:id/cooldown/:followingId (DELETE)
  // See: backend/src/security/admin/services/users/users.controller.ts

  // #########################################################
  // EXPORT ENDPOINTS
  // #########################################################

  @Get(':userId/followers/export')
  @ApiOperation({ summary: 'Export followers list as CSV or JSON' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'json'],
    required: false,
    description: 'Export format',
    example: 'csv',
  })
  @ApiResponse({
    status: 200,
    description: 'Followers exported successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportFollowers(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    // Users can only export their own data
    if (currentUserId !== userId) {
      throw new UnauthorizedException('You can only export your own data');
    }

    const data = await this.followsService.exportFollowers(userId, format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="followers-${userId}.json"`,
      );
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="followers-${userId}.csv"`,
      );
    }

    res.send(data);
  }

  @Get(':userId/following/export')
  @ApiOperation({ summary: 'Export following list as CSV or JSON' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'json'],
    required: false,
    description: 'Export format',
    example: 'csv',
  })
  @ApiResponse({
    status: 200,
    description: 'Following exported successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportFollowing(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res: Response,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    // Users can only export their own data
    if (currentUserId !== userId) {
      throw new UnauthorizedException('You can only export your own data');
    }

    const data = await this.followsService.exportFollowing(userId, format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="following-${userId}.json"`,
      );
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="following-${userId}.csv"`,
      );
    }

    res.send(data);
  }

  // #########################################################
  // ENHANCED ANALYTICS ENDPOINTS
  // #########################################################

  @Get(':userId/analytics/enhanced')
  @ApiOperation({ summary: 'Get enhanced follow analytics with growth trends' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getEnhancedFollowAnalytics(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    // Users can only view their own analytics
    if (currentUserId !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.followsService.getEnhancedFollowAnalytics(userId);
  }

  @Get(':userId/history')
  @ApiOperation({ summary: 'Get follow history/audit log' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Follow history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowHistory(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const currentUserId = user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User ID not found');
    }
    // Users can only view their own history
    if (currentUserId !== userId) {
      throw new UnauthorizedException('You can only view your own history');
    }
    return this.followsService.getFollowHistory(userId, paginationDto);
  }
}
