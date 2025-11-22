import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { RequireScope } from '../../security/developer/services/scopes';

@ApiTags('Data Management | Analytics')
@Controller('analytics')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get geographic analytics for a user's profile views
   */
  @Get('users/:userId/geographic')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get geographic analytics for user profile',
    description: 'Returns geographic analytics including top countries for profile views.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Geographic analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getGeographicAnalytics(
    @Param('userId') userId: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getGeographicAnalytics(userId);
  }

  /**
   * Get aggregate analytics for a user across all resources
   */
  @Get('users/:userId/aggregate')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get aggregate analytics for user',
    description: 'Returns aggregate analytics across all resources (profiles, posts, videos).',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregate analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getAggregateAnalytics(
    @Param('userId') userId: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getAggregateAnalytics(userId);
  }

  /**
   * Get user analytics (cached/calculated)
   */
  @Get('users/:userId')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get user analytics',
    description: 'Returns cached user analytics. Automatically recalculates if stale.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiQuery({
    name: 'forceRecalculate',
    description: 'Force recalculation of analytics',
    type: 'boolean',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query('forceRecalculate') forceRecalculate?: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getUserAnalytics(
      userId,
      forceRecalculate === 'true',
    );
  }

  /**
   * Get post analytics for a user
   */
  @Get('users/:userId/posts')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get post analytics for user',
    description: 'Returns analytics for all posts by the user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Post analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getUserPostAnalytics(
    @Param('userId') userId: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getUserPostAnalytics(userId);
  }

  /**
   * Get video analytics for a user
   */
  @Get('users/:userId/videos')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get video analytics for user',
    description: 'Returns analytics for all videos by the user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Video analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getUserVideoAnalytics(
    @Param('userId') userId: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getUserVideoAnalytics(userId);
  }

  /**
   * Get analytics for a specific resource
   */
  @Get('resources/:resourceType/:resourceId')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get resource analytics',
    description: 'Returns analytics for a specific resource (post, video, etc.).',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (post, video, etc.)',
    type: 'string',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource analytics retrieved successfully',
  })
  async getResourceAnalytics(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.analyticsService.getResourceAnalytics(resourceType, resourceId);
  }

  /**
   * Get analytics for a specific post
   */
  @Get('posts/:postId')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get post analytics',
    description: 'Returns analytics for a specific post. Automatically recalculates if stale.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID to get analytics for',
    type: 'string',
  })
  @ApiQuery({
    name: 'forceRecalculate',
    description: 'Force recalculation of analytics',
    type: 'boolean',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Post analytics retrieved successfully',
  })
  async getPostAnalyticsById(
    @Param('postId') postId: string,
    @Query('forceRecalculate') forceRecalculate?: string,
  ) {
    return this.analyticsService.getPostAnalytics(
      postId,
      forceRecalculate === 'true',
    );
  }

  /**
   * Get analytics for a specific video
   */
  @Get('videos/:videoId')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get video analytics',
    description: 'Returns analytics for a specific video. Automatically recalculates if stale.',
  })
  @ApiParam({
    name: 'videoId',
    description: 'Video ID to get analytics for',
    type: 'string',
  })
  @ApiQuery({
    name: 'forceRecalculate',
    description: 'Force recalculation of analytics',
    type: 'boolean',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Video analytics retrieved successfully',
  })
  async getVideoAnalyticsById(
    @Param('videoId') videoId: string,
    @Query('forceRecalculate') forceRecalculate?: string,
  ) {
    return this.analyticsService.getVideoAnalytics(
      videoId,
      forceRecalculate === 'true',
    );
  }
}
