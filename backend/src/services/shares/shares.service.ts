import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, In, Not } from 'typeorm';
import { Share } from './assets/entities/share.entity';
import { ShareResourceType } from './assets/enum/resource-type.enum';
import { CreateShareDto } from './assets/dto/create-share.dto';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from '../../rest/api/users/services/photos/assets/entities/photo.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { sanitizeText } from 'src/utils/sanitization.util';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(Share)
    private readonly shareRepository: Repository<Share>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    private readonly dataSource: DataSource,
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
      case ShareResourceType.POST:
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

      case ShareResourceType.VIDEO:
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

      case ShareResourceType.PHOTO:
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

      default:
        return { exists: false };
    }
  }

  /**
   * Share a resource
   */
  async shareResource(
    userId: string,
    resourceType: string,
    resourceId: string,
    createShareDto?: CreateShareDto,
  ): Promise<Share> {
    try {
      // Validate resource exists
      const resource = await this.validateResource(resourceType, resourceId);
      if (!resource.exists) {
        throw new NotFoundException(
          `${resourceType} with ID ${resourceId} not found`,
        );
      }

      // Prevent users from sharing their own resources
      if (resource.ownerId === userId) {
        throw new BadRequestException(
          'You cannot share your own content',
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

      // Sanitize share comment if provided
      const sanitizedComment = createShareDto?.comment
        ? sanitizeText(createShareDto.comment)
        : null;

      // Use transaction to ensure atomicity
      const savedShare = await this.dataSource.transaction(
        async (transactionalEntityManager) => {
          // Check if user has already shared this resource
          const existingShare = await transactionalEntityManager.findOne(
            Share,
            {
              where: { userId, resourceType, resourceId },
            },
          );

          if (existingShare) {
            throw new BadRequestException(
              `${resourceType} already shared`,
            );
          }

          // Create Share entity
          const share = transactionalEntityManager.create(Share, {
            comment: sanitizedComment,
            resourceType,
            resourceId,
            userId,
            user,
          });

          const savedShare = await transactionalEntityManager.save(Share, share);

          return savedShare;
        },
      );

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'share',
        `share:${savedShare.id}`,
        `${resourceType}:${resourceId}`,
        `${resourceType}:${resourceId}:shares`,
        `user:${userId}:shares`,
      );

      this.loggingService.log('Resource shared', 'SharesService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          shareId: savedShare.id,
          resourceType,
          resourceId,
        },
      });

      // Emit event for share (only if not self-share)
      if (resource.ownerId && resource.ownerId !== userId) {
        this.eventEmitter.emit(`${resourceType}.shared`, {
          sharerId: userId,
          resourceId,
          shareId: savedShare.id,
          resourceOwnerId: resource.ownerId,
        });
      }

      // Recalculate analytics (in background)
      if (resourceType === ShareResourceType.POST) {
        this.analyticsService
          .calculatePostAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating post analytics after share',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      } else if (resourceType === ShareResourceType.VIDEO) {
        this.analyticsService
          .calculateVideoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating video analytics after share',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      } else if (resourceType === ShareResourceType.PHOTO) {
        this.analyticsService
          .calculatePhotoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating photo analytics after share',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      }

      // Recalculate user analytics for resource owner (in background)
      if (resource.ownerId) {
        this.analyticsService
          .calculateUserAnalytics(resource.ownerId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating user analytics after share',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      }

      return savedShare;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error sharing resource',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to share resource');
    }
  }

  /**
   * Unshare a resource
   */
  async unshareResource(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    try {
      // Validate resource exists
      const resource = await this.validateResource(resourceType, resourceId);
      if (!resource.exists) {
        throw new NotFoundException(
          `${resourceType} with ID ${resourceId} not found`,
        );
      }

      // Use transaction to ensure atomicity
      await this.dataSource.transaction(
        async (transactionalEntityManager) => {
          // Find the share
          const existingShare = await transactionalEntityManager.findOne(
            Share,
            {
              where: { userId, resourceType, resourceId },
            },
          );

          if (!existingShare) {
            throw new BadRequestException(
              `${resourceType} not shared by user`,
            );
          }

          // Delete the share
          await transactionalEntityManager.remove(Share, existingShare);
        },
      );

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        'share',
        `${resourceType}:${resourceId}`,
        `${resourceType}:${resourceId}:shares`,
        `user:${userId}:shares`,
      );

      this.loggingService.log('Resource unshared', 'SharesService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          resourceType,
          resourceId,
        },
      });

      // Recalculate analytics (in background)
      if (resourceType === ShareResourceType.POST) {
        this.analyticsService
          .calculatePostAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating post analytics after unshare',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      } else if (resourceType === ShareResourceType.VIDEO) {
        this.analyticsService
          .calculateVideoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating video analytics after unshare',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      } else if (resourceType === ShareResourceType.PHOTO) {
        this.analyticsService
          .calculatePhotoAnalytics(resourceId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating photo analytics after unshare',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      }

      // Recalculate user analytics for resource owner (in background)
      if (resource.ownerId) {
        this.analyticsService
          .calculateUserAnalytics(resource.ownerId)
          .catch((error: unknown) => {
            this.loggingService.error(
              'Error recalculating user analytics after unshare',
              error instanceof Error ? error.stack : undefined,
              'SharesService',
            );
          });
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error unsharing resource',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to unshare resource');
    }
  }

  /**
   * Check if a user has shared a resource
   */
  async hasShared(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      const share = await this.shareRepository.findOne({
        where: {
          userId,
          resourceType,
          resourceId,
        },
      });

      return !!share;
    } catch (error) {
      this.loggingService.error(
        'Error checking share status',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
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
   * Get shares count for a resource
   */
  async getSharesCount(
    resourceType: string,
    resourceId: string,
  ): Promise<number> {
    try {
      const count = await this.shareRepository.count({
        where: {
          resourceType,
          resourceId,
        },
      });

      return count;
    } catch (error) {
      this.loggingService.error(
        'Error getting shares count',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return 0;
    }
  }

  /**
   * Get users who shared a resource (for a list of resource IDs)
   */
  async getSharesForResources(
    userId: string,
    resourceType: string,
    resourceIds: string[],
  ): Promise<Set<string>> {
    try {
      if (resourceIds.length === 0) {
        return new Set();
      }

      const shares = await this.shareRepository.find({
        where: {
          userId,
          resourceType,
          resourceId: In(resourceIds),
        },
        select: ['resourceId'],
      });

      return new Set(shares.map((share) => share.resourceId));
    } catch (error) {
      this.loggingService.error(
        'Error getting shares for resources',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return new Set();
    }
  }

  /**
   * Get posts shared by a user
   */
  async getSharedPosts(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<any> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;

      // Get shares for posts
      const queryBuilder = this.shareRepository
        .createQueryBuilder('share')
        .where('share.userId = :userId', { userId })
        .andWhere('share.resourceType = :resourceType', { resourceType: 'post' })
        .orderBy('share.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [shares, total] = await queryBuilder.getManyAndCount();

      // Extract post IDs from shares
      const postIds = shares.map((s) => s.resourceId).filter((id): id is string => id !== null);

      // Fetch posts separately - only posts from other users (not the user's own)
      const posts = postIds.length > 0
        ? await this.postRepository.find({
            where: { 
              id: In(postIds), 
              dateDeleted: IsNull(),
              userId: Not(userId), // Exclude user's own posts
            },
            relations: ['user', 'user.profile'],
          })
        : [];

      return {
        data: posts,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting shared posts',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get shared posts');
    }
  }

  /**
   * Get photos shared by a user
   */
  async getSharedPhotos(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<any> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      // Get shares for photos
      const queryBuilder = this.shareRepository
        .createQueryBuilder('share')
        .where('share.userId = :userId', { userId })
        .andWhere('share.resourceType = :resourceType', { resourceType: 'photo' })
        .orderBy('share.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [shares, total] = await queryBuilder.getManyAndCount();

      // Extract photo IDs from shares
      const photoIds = shares.map((s) => s.resourceId).filter((id): id is string => id !== null);

      // Fetch photos separately - only photos from other users (not the user's own)
      const photos = photoIds.length > 0
        ? await this.photoRepository.find({
            where: { 
              id: In(photoIds), 
              dateDeleted: IsNull(),
              userId: Not(userId), // Exclude user's own photos
            },
            relations: ['user', 'user.profile'],
          })
        : [];

      return {
        data: photos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting shared photos',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get shared photos');
    }
  }

  /**
   * Get videos shared by a user
   */
  async getSharedVideos(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<any> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      // Get shares for videos
      const queryBuilder = this.shareRepository
        .createQueryBuilder('share')
        .where('share.userId = :userId', { userId })
        .andWhere('share.resourceType = :resourceType', { resourceType: 'video' })
        .orderBy('share.dateCreated', 'DESC')
        .skip(skip)
        .take(limit);

      const [shares, total] = await queryBuilder.getManyAndCount();

      // Extract video IDs from shares
      const videoIds = shares.map((s) => s.resourceId).filter((id): id is string => id !== null);

      // Fetch videos separately - only videos from other users (not the user's own)
      const videos = videoIds.length > 0
        ? await this.videoRepository.find({
            where: { 
              id: In(videoIds), 
              dateDeleted: IsNull(),
              userId: Not(userId), // Exclude user's own videos
            },
            relations: ['user', 'user.profile'],
          })
        : [];

      return {
        data: videos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting shared videos',
        error instanceof Error ? error.stack : undefined,
        'SharesService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get shared videos');
    }
  }
}
