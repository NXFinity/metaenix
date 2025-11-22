import {
  Controller,
  Post as PostDecorator,
  Param,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { CurrentUser } from '../../security/auth/decorators/currentUser.decorator';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { Public } from '../../security/auth/decorators/public.decorator';
import { ResourceType } from './assets/enum/resource-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { LoggingService } from '@logging/logging';

@ApiTags('Data Management | Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly analyticsService: AnalyticsService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Track a profile view
   */
  @PostDecorator('profiles/:userId/view')
  @Public()
  @ApiOperation({
    summary: 'Track profile view',
    description: 'Tracks a view of a user profile with geographic data. Public endpoint.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID of the profile being viewed',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile view tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async trackProfileView(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const viewerUserId = user?.id;
    const result = await this.trackingService.trackProfileView(userId, req, viewerUserId);
    
    // Only recalculate analytics if view was actually tracked (not a duplicate)
    if (result.tracked) {
      this.analyticsService.calculateUserAnalytics(userId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating user analytics after view',
          error instanceof Error ? error.stack : undefined,
          'TrackingController',
        );
      });
    }
    
    return { success: result.tracked, tracked: result.tracked, reason: result.reason };
  }

  /**
   * Track a post view
   */
  @PostDecorator('posts/:postId/view')
  @Public()
  @ApiOperation({
    summary: 'Track post view',
    description: 'Tracks a view of a post with geographic data. Public endpoint.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID being viewed',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Post view tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async trackPostView(
    @Param('postId') postId: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const viewerUserId = user?.id;
    const post = await this.postRepository.findOne({
      where: { id: postId },
      select: ['id', 'userId'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const result = await this.trackingService.trackPostView(
      postId,
      post.userId,
      req,
      viewerUserId,
    );

    // Only recalculate analytics if view was actually tracked (not a duplicate)
    if (result.tracked) {
      this.analyticsService.calculatePostAnalytics(postId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating post analytics after view',
          error instanceof Error ? error.stack : undefined,
          'TrackingController',
        );
      });
    }

    return { success: result.tracked, tracked: result.tracked, reason: result.reason };
  }

  /**
   * Track a video view
   */
  @PostDecorator('videos/:videoId/view')
  @Public()
  @ApiOperation({
    summary: 'Track video view',
    description: 'Tracks a view of a video with geographic data. Public endpoint.',
  })
  @ApiParam({
    name: 'videoId',
    description: 'Video ID being viewed',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Video view tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
  })
  async trackVideoView(
    @Param('videoId') videoId: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const viewerUserId = user?.id;
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      select: ['id', 'userId'],
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const result = await this.trackingService.trackVideoView(
      videoId,
      video.userId,
      req,
      viewerUserId,
    );

    // Only recalculate analytics if view was actually tracked (not a duplicate)
    if (result.tracked) {
      this.analyticsService.calculateVideoAnalytics(videoId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating video analytics after view',
          error instanceof Error ? error.stack : undefined,
          'TrackingController',
        );
      });
    }

    return { success: result.tracked, tracked: result.tracked, reason: result.reason };
  }

  /**
   * Track a view for any resource type
   */
  @PostDecorator('resources/:resourceType/:resourceId/view')
  @Public()
  @ApiOperation({
    summary: 'Track resource view',
    description: 'Tracks a view of any resource type with geographic data. Public endpoint.',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Resource type (profile, post, video, etc.)',
    type: 'string',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'Resource ID being viewed',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource view tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found',
  })
  async trackResourceView(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Req() req: AuthenticatedRequest,
    @CurrentUser() user?: User,
  ) {
    const viewerUserId = user?.id;
    let ownerUserId: string;

    if (resourceType === ResourceType.PROFILE) {
      ownerUserId = resourceId;
    } else if (resourceType === ResourceType.POST) {
      const post = await this.postRepository.findOne({
        where: { id: resourceId },
        select: ['id', 'userId'],
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      ownerUserId = post.userId;
    } else if (resourceType === ResourceType.VIDEO) {
      const video = await this.videoRepository.findOne({
        where: { id: resourceId },
        select: ['id', 'userId'],
      });
      if (!video) {
        throw new NotFoundException('Video not found');
      }
      ownerUserId = video.userId;
    } else {
      throw new NotFoundException('Unknown resource type');
    }

    const result = await this.trackingService.trackView(
      resourceType,
      resourceId,
      ownerUserId,
      req,
      viewerUserId,
    );
    return { success: result.tracked, tracked: result.tracked, reason: result.reason };
  }
}
