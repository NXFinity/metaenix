import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Like } from './assets/entities/like.entity';
import { LikeResourceType } from './assets/enum/resource-type.enum';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { Comment } from '../../services/comments/assets/entities/comment.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Validate that a resource exists
   */
  private async validateResource(
    resourceType: string,
    resourceId: string,
  ): Promise<{ exists: boolean; ownerId?: string }> {
    switch (resourceType) {
      case LikeResourceType.POST:
        const post = await this.postRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId'],
        });
        if (!post) {
          return { exists: false };
        }
        return {
          exists: true,
          ownerId: post.userId,
        };

      case LikeResourceType.VIDEO:
        const video = await this.videoRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId'],
        });
        if (!video) {
          return { exists: false };
        }
        return {
          exists: true,
          ownerId: video.userId,
        };

      case LikeResourceType.PHOTO:
        const photo = await this.photoRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId'],
        });
        if (!photo) {
          return { exists: false };
        }
        return {
          exists: true,
          ownerId: photo.userId,
        };

      case LikeResourceType.COMMENT:
        const comment = await this.commentRepository.findOne({
          where: { id: resourceId, dateDeleted: IsNull() },
          select: ['id', 'userId', 'resourceType', 'resourceId'],
        });
        if (!comment) {
          return { exists: false };
        }
        return {
          exists: true,
          ownerId: comment.userId,
        };

      default:
        return { exists: false };
    }
  }

  /**
   * Like a resource
   */
  async likeResource(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<Like> {
    try {
      // Validate resource exists
      const resource = await this.validateResource(resourceType, resourceId);
      if (!resource.exists) {
        throw new NotFoundException(
          `${resourceType} with ID ${resourceId} not found`,
        );
      }

      // Get user
      const user = await this.cachingService.getOrSetUser(
        'id',
        userId,
        async () => {
          const userData = await this.userRepository.findOne({
            where: { id: userId },
          });
          if (!userData) {
            throw new NotFoundException('User not found');
          }
          return userData;
        },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if like already exists
      const existingLike = await this.likeRepository.findOne({
        where: {
          userId,
          resourceType,
          resourceId,
        },
      });

      if (existingLike) {
        // Already liked - return success instead of error to handle race conditions gracefully
        return existingLike;
      }

      // Create like
      const like = this.likeRepository.create({
        userId,
        user,
        resourceType,
        resourceId,
      });

      const savedLike = await this.likeRepository.save(like);

      // Update Post/Video counts directly
      if (resourceType === LikeResourceType.POST) {
        await this.postRepository.increment({ id: resourceId }, 'likesCount', 1);
      } else if (resourceType === LikeResourceType.VIDEO) {
        await this.videoRepository.increment({ id: resourceId }, 'likesCount', 1);
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'like',
        `like:${savedLike.id}`,
        `${resourceType}:${resourceId}`,
        `${resourceType}:${resourceId}:likes`,
        `user:${userId}:likes`,
      );

      this.loggingService.log('Resource liked', 'LikesService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          likeId: savedLike.id,
          resourceType,
          resourceId,
        },
      });

      // Emit event for like (only if not self-like)
      if (resource.ownerId && resource.ownerId !== userId) {
        this.eventEmitter.emit(`${resourceType}.liked`, {
          likerId: userId,
          resourceId,
          likeId: savedLike.id,
          resourceOwnerId: resource.ownerId,
        });
      }

      // Recalculate analytics (in background)
      if (resourceType === LikeResourceType.POST) {
        this.analyticsService
          .calculatePostAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating post analytics after like',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      } else if (resourceType === LikeResourceType.VIDEO) {
        this.analyticsService
          .calculateVideoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating video analytics after like',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      }

      // Recalculate user analytics for resource owner (in background)
      if (resource.ownerId) {
        this.analyticsService
          .calculateUserAnalytics(resource.ownerId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating user analytics after like',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      }

      return savedLike;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error liking resource',
        error instanceof Error ? error.stack : undefined,
        'LikesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to like resource');
    }
  }

  /**
   * Unlike a resource
   */
  async unlikeResource(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    try {
      const like = await this.likeRepository.findOne({
        where: {
          userId,
          resourceType,
          resourceId,
        },
      });

      if (!like) {
        // Already unliked - return success instead of error to handle race conditions gracefully
        return;
      }

      // Get resource owner before deleting like
      const resource = await this.validateResource(resourceType, resourceId);

      await this.likeRepository.remove(like);

      // Update Post/Video counts directly
      if (resourceType === LikeResourceType.POST) {
        await this.postRepository.decrement({ id: resourceId }, 'likesCount', 1);
      } else if (resourceType === LikeResourceType.VIDEO) {
        await this.videoRepository.decrement({ id: resourceId }, 'likesCount', 1);
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'like',
        `like:${like.id}`,
        `${resourceType}:${resourceId}`,
        `${resourceType}:${resourceId}:likes`,
        `user:${userId}:likes`,
      );

      this.loggingService.log('Resource unliked', 'LikesService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          likeId: like.id,
          resourceType,
          resourceId,
        },
      });

      // Recalculate analytics (in background)
      if (resourceType === LikeResourceType.POST) {
        this.analyticsService
          .calculatePostAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating post analytics after unlike',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      } else if (resourceType === LikeResourceType.VIDEO) {
        this.analyticsService
          .calculateVideoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating video analytics after unlike',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      }

      // Recalculate user analytics for resource owner (in background)
      if (resource.exists && resource.ownerId) {
        this.analyticsService
          .calculateUserAnalytics(resource.ownerId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating user analytics after unlike',
              error instanceof Error ? error.stack : undefined,
              'LikesService',
            );
          });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error unliking resource',
        error instanceof Error ? error.stack : undefined,
        'LikesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to unlike resource');
    }
  }

  /**
   * Check if a user has liked a resource
   */
  async hasLiked(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      const like = await this.likeRepository.findOne({
        where: {
          userId,
          resourceType,
          resourceId,
        },
      });

      return !!like;
    } catch (error) {
      this.loggingService.error(
        'Error checking like status',
        error instanceof Error ? error.stack : undefined,
        'LikesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return false;
    }
  }

  /**
   * Get likes for a resource
   */
  async getLikesCount(
    resourceType: string,
    resourceId: string,
  ): Promise<number> {
    try {
      const count = await this.likeRepository.count({
        where: {
          resourceType,
          resourceId,
        },
      });

      return count;
    } catch (error) {
      this.loggingService.error(
        'Error getting likes count',
        error instanceof Error ? error.stack : undefined,
        'LikesService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return 0;
    }
  }

  /**
   * Get users who liked a resource (for a list of resource IDs)
   */
  async getLikesForResources(
    userId: string,
    resourceType: string,
    resourceIds: string[],
  ): Promise<Set<string>> {
    try {
      if (resourceIds.length === 0) {
        return new Set();
      }

      const likes = await this.likeRepository.find({
        where: {
          userId,
          resourceType,
          resourceId: In(resourceIds),
        },
        select: ['resourceId'],
      });

      return new Set(likes.map((like) => like.resourceId));
    } catch (error) {
      this.loggingService.error(
        'Error getting likes for resources',
        error instanceof Error ? error.stack : undefined,
        'LikesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return new Set();
    }
  }
}
