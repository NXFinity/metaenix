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
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { RequireScope } from '../../security/developer/services/scopes';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../security/auth/decorators/public.decorator';

@ApiTags('Data Management | Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

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
   * Get user's liked posts
   * NOTE: This route must come BEFORE 'users/:userId' to avoid route conflicts
   */
  @Get('users/:userId/likes')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get user\'s liked posts',
    description: 'Returns a paginated list of posts that the user has liked.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get liked posts for',
    type: 'string',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liked posts retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own liked posts',
  })
  async getUserLikedPosts(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own liked posts');
    }
    return this.analyticsService.getUserLikedPosts(userId, paginationDto);
  }

  /**
   * Get user analytics (cached/calculated)
   * Public endpoint - anyone can view any user's analytics
   */
  @Get('users/:userId')
  @Public()
  @ApiOperation({
    summary: 'Get user analytics',
    description: 'Returns cached user analytics. Automatically recalculates if stale. Public endpoint - anyone can view any user\'s analytics.',
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
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query('forceRecalculate') forceRecalculate?: string,
  ) {
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
   * Get photo analytics for a user
   */
  @Get('users/:userId/photos')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get photo analytics for user',
    description: 'Returns analytics for all photos by the user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get analytics for',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Photo analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User can only view their own analytics',
  })
  async getUserPhotoAnalytics(
    @Param('userId') userId: string,
    @CurrentUser() user?: User,
  ) {
    if (!user || user.id !== userId) {
      throw new UnauthorizedException('You can only view your own analytics');
    }
    return this.analyticsService.getUserPhotoAnalytics(userId);
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

  /**
   * Get analytics for a specific photo
   */
  @Get('photos/:photoId')
  @RequireScope('read:analytics')
  @ApiOperation({
    summary: 'Get photo analytics',
    description: 'Returns analytics for a specific photo. Automatically recalculates if stale.',
  })
  @ApiParam({
    name: 'photoId',
    description: 'Photo ID to get analytics for',
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
    description: 'Photo analytics retrieved successfully',
  })
  async getPhotoAnalyticsById(
    @Param('photoId') photoId: string,
    @Query('forceRecalculate') forceRecalculate?: string,
  ) {
    return this.analyticsService.getPhotoAnalytics(
      photoId,
      forceRecalculate === 'true',
    );
  }
}
