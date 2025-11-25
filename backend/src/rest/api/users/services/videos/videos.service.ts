import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Video } from './assets/entities/video.entity';
import { User } from '../../assets/entities/user.entity';
import { CreateVideoDto } from './assets/dto/create-video.dto';
import { UpdateVideoDto } from './assets/dto/update-video.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { StorageService } from 'src/rest/storage/storage.service';
import { StorageType } from 'src/rest/storage/assets/enum/storage-type.enum';
import { TrackingService } from 'src/services/tracking/tracking.service';
import { AnalyticsService } from 'src/services/analytics/analytics.service';


@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly storageService: StorageService,
    private readonly trackingService: TrackingService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Generate a URL-friendly slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug for a video
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(title).substring(0, 200); // Limit length
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.videoRepository.findOne({
        where: { slug },
        select: ['id'],
      });

      // If no existing video with this slug, or it's the same video we're updating
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // Append counter to make it unique
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a video record (after file upload)
   */
  async createVideo(
    userId: string,
    createDto: CreateVideoDto,
    videoFile: Express.Multer.File,
  ): Promise<Video> {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Upload video file
      const uploadResult = await this.storageService.uploadFile(
        userId,
        videoFile,
        StorageType.MEDIA,
        'video',
      );

      // Generate unique slug
      const slug = await this.generateUniqueSlug(createDto.title);

      // Create video entity
      // If video is successfully uploaded and has a URL, mark as ready
      // Processing status is only needed if there's additional processing (thumbnails, transcoding, etc.)
      const video = this.videoRepository.create({
        userId,
        title: createDto.title,
        slug,
        description: createDto.description || null,
        videoUrl: uploadResult.url,
        storageKey: uploadResult.key,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.size,
        isPublic: createDto.isPublic !== undefined ? createDto.isPublic : true,
        status: 'ready', // Video is ready to watch immediately after upload
        tags: createDto.tags || [],
        viewsCount: 0,
        watchTime: 0,
        width: 0, // Will be updated when video metadata is extracted
        height: 0, // Will be updated when video metadata is extracted
        duration: null, // Will be updated when video metadata is extracted
      });

      const savedVideo = await this.videoRepository.save(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:videos`);

      this.loggingService.log('Video created', 'VideosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          videoId: savedVideo.id,
          title: savedVideo.title,
        },
      });

      return savedVideo;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating video',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { createDto },
        },
      );

      throw new InternalServerErrorException('Failed to upload video');
    }
  }

  /**
   * Get all videos for a user (paginated)
   */
  async getUserVideos(
    userId: string,
    paginationDto: PaginationDto,
    requestingUserId?: string,
  ): Promise<PaginationResponse<Video>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';

      // Build query
      const queryBuilder = this.videoRepository
        .createQueryBuilder('video')
        .leftJoinAndSelect('video.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('video.userId = :userId', { userId })
        .andWhere('video.dateDeleted IS NULL')
        .orderBy(`video.${sortBy}`, sortOrder)
        .skip(skip)
        .take(limit);

      // If requesting user is not the owner, only show public videos
      if (requestingUserId !== userId) {
        queryBuilder.andWhere('video.isPublic = :isPublic', { isPublic: true });
      }

      const [videos, total] = await queryBuilder.getManyAndCount();

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      };

      return {
        data: videos,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting user videos',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get user videos');
    }
  }

  /**
   * Get a single video by ID (UUID only - slugs are frontend-only)
   */
  async getVideoById(
    videoId: string,
    requestingUserId?: string,
  ): Promise<Video> {
    try {
      // Backend only accepts UUIDs - slugs are frontend-only for URL aesthetics
      let video = await this.videoRepository.findOne({
        where: { id: videoId, dateDeleted: IsNull() },
        relations: ['user', 'user.profile'],
      });

      if (!video) {
        throw new NotFoundException('Video not found');
      }

      // If video doesn't have a slug, generate one (for existing videos)
      if (!video.slug) {
        video.slug = await this.generateUniqueSlug(video.title, video.id);
        await this.videoRepository.save(video);
      }

      // Check if user has access (public or owner)
      if (requestingUserId !== video.userId && !video.isPublic) {
        throw new ForbiddenException('You do not have access to this video');
      }

      return video;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error getting video',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId },
        },
      );

      throw new InternalServerErrorException('Failed to get video');
    }
  }

  /**
   * Update a video
   */
  async updateVideo(
    userId: string,
    videoId: string,
    updateDto: UpdateVideoDto,
  ): Promise<Video> {
    try {
      const video = await this.getVideoById(videoId, userId);

      // Check ownership
      if (video.userId !== userId) {
        throw new ForbiddenException('You can only update your own videos');
      }

      // Update fields
      if (updateDto.title !== undefined) {
        video.title = updateDto.title;
        // Regenerate slug if title changed (or if slug is missing)
        if (!video.slug || video.title !== updateDto.title) {
          video.slug = await this.generateUniqueSlug(updateDto.title, videoId);
        }
      } else if (!video.slug) {
        // If title didn't change but slug is missing, generate it
        video.slug = await this.generateUniqueSlug(video.title, videoId);
      }
      if (updateDto.description !== undefined) {
        video.description = updateDto.description;
      }
      if (updateDto.isPublic !== undefined) {
        video.isPublic = updateDto.isPublic;
      }
      if (updateDto.tags !== undefined) {
        video.tags = updateDto.tags;
      }

      const updatedVideo = await this.videoRepository.save(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        `user:${userId}:videos`,
        `video:${videoId}`,
      );

      this.loggingService.log('Video updated', 'VideosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          videoId: updatedVideo.id,
        },
      });

      return updatedVideo;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error updating video',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId, updateDto },
        },
      );

      throw new InternalServerErrorException('Failed to update video');
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(userId: string, videoId: string): Promise<void> {
    try {
      const video = await this.getVideoById(videoId, userId);

      // Check ownership
      if (video.userId !== userId) {
        throw new ForbiddenException('You can only delete your own videos');
      }

      // Delete from storage if storage key exists
      if (video.storageKey) {
        try {
          await this.storageService.deleteFile(video.storageKey, userId);
        } catch (storageError) {
          this.loggingService.error(
            'Error deleting video from storage',
            storageError instanceof Error ? storageError.stack : undefined,
            'VideosService',
            {
              category: LogCategory.STORAGE,
              userId,
              error:
                storageError instanceof Error
                  ? storageError
                  : new Error(String(storageError)),
              metadata: { videoId, storageKey: video.storageKey },
            },
          );
          // Continue with soft delete even if storage deletion fails
        }
      }

      // Soft delete video
      await this.videoRepository.softRemove(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        `user:${userId}:videos`,
        `video:${videoId}`,
      );

      // Recalculate user analytics immediately (await to ensure it completes)
      try {
        await this.analyticsService.calculateUserAnalytics(userId);
      } catch (error: unknown) {
        this.loggingService.error(
          'Error recalculating user analytics after video deletion',
          error instanceof Error ? error.stack : undefined,
          'VideosService',
        );
        // Don't fail deletion if analytics recalculation fails
      }

      this.loggingService.log('Video deleted', 'VideosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { videoId },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error deleting video',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId },
        },
      );

      throw new InternalServerErrorException('Failed to delete video');
    }
  }

  /**
   * Track video view (increment viewsCount and track geographic data)
   */
  async trackVideoView(videoId: string, req: any, userId?: string): Promise<void> {
    try {
      const video = await this.videoRepository.findOne({
        where: { id: videoId, dateDeleted: IsNull() },
        relations: ['user'],
      });

      if (!video) {
        return; // Silently fail if video doesn't exist
      }

      // Track view using centralized tracking service
      const trackingResult = await this.trackingService.trackVideoView(videoId, video.userId, req, userId);

      // Only recalculate analytics if view was actually tracked (not a duplicate)
      if (trackingResult.tracked) {
        this.analyticsService.calculateVideoAnalytics(videoId).catch((error: unknown) => {
          this.loggingService.error(
            'Error recalculating video analytics after view',
            error instanceof Error ? error.stack : undefined,
            'VideosService',
          );
        });
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags(`video:${videoId}`);
    } catch (error) {
      // Silently fail for view tracking
      this.loggingService.error(
        'Error tracking video view',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId, userId },
        },
      );
    }
  }

  /**
   * Create a video from an already uploaded file (used when video is uploaded via post)
   * This creates a video record in the user's library without re-uploading the file
   * Returns null if creation fails (non-critical operation)
   */
  async createVideoFromUploadedFile(
    userId: string,
    videoUrl: string,
    storageKey: string,
    mimeType: string,
    fileSize: number,
    title?: string,
  ): Promise<Video | null> {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate default title if not provided
      const videoTitle = title || `Video from post - ${new Date().toLocaleDateString()}`;

      // Create video entity
      // Video is ready to watch immediately since it's already uploaded
      const video = this.videoRepository.create({
        userId,
        title: videoTitle,
        description: null,
        videoUrl,
        storageKey,
        mimeType,
        fileSize,
        isPublic: true,
        status: 'ready', // Video is ready to watch immediately
        tags: [],
        viewsCount: 0,
        watchTime: 0,
        width: 0, // Will be updated when video metadata is extracted
        height: 0, // Will be updated when video metadata is extracted
        duration: null, // Will be updated when video metadata is extracted
      });

      const savedVideo = await this.videoRepository.save(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:videos`);

      this.loggingService.log('Video created from uploaded file', 'VideosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          videoId: savedVideo.id,
          title: savedVideo.title,
        },
      });

      return savedVideo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error creating video from uploaded file',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      // Don't throw error - allow post creation to continue even if video library creation fails
      // This is a non-critical operation
      return null;
    }
  }

  /**
   * Upload thumbnail for a video
   */
  async uploadThumbnail(
    userId: string,
    videoId: string,
    thumbnailFile: Express.Multer.File,
  ): Promise<Video> {
    try {
      const video = await this.getVideoById(videoId, userId);

      // Check ownership
      if (video.userId !== userId) {
        throw new ForbiddenException('You can only update thumbnails for your own videos');
      }

      // Delete old thumbnail if it exists
      if (video.thumbnailUrl && video.storageKey) {
        // Extract thumbnail storage key from URL or use a pattern
        // For now, we'll upload the new one and let the old one be replaced
        // In production, you might want to track thumbnail storage keys separately
      }

      // Upload thumbnail file
      const uploadResult = await this.storageService.uploadFile(
        userId,
        thumbnailFile,
        StorageType.MEDIA,
        'photo', // Use 'photo' subtype for thumbnails
      );

      // Update video with thumbnail URL
      video.thumbnailUrl = uploadResult.url;
      const updatedVideo = await this.videoRepository.save(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        `user:${userId}:videos`,
        `video:${videoId}`,
      );

      this.loggingService.log('Video thumbnail uploaded', 'VideosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          videoId: updatedVideo.id,
        },
      });

      return updatedVideo;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error uploading video thumbnail',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.STORAGE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId },
        },
      );

      throw new InternalServerErrorException('Failed to upload video thumbnail');
    }
  }

  /**
   * Update video metadata (after processing)
   */
  async updateVideoMetadata(
    videoId: string,
    metadata: {
      duration?: number;
      width?: number;
      height?: number;
      thumbnailUrl?: string;
      status?: string;
    },
  ): Promise<Video> {
    try {
      const video = await this.videoRepository.findOne({
        where: { id: videoId, dateDeleted: IsNull() },
      });

      if (!video) {
        throw new NotFoundException('Video not found');
      }

      if (metadata.duration !== undefined) {
        video.duration = metadata.duration;
      }
      if (metadata.width !== undefined) {
        video.width = metadata.width;
      }
      if (metadata.height !== undefined) {
        video.height = metadata.height;
      }
      if (metadata.thumbnailUrl !== undefined) {
        video.thumbnailUrl = metadata.thumbnailUrl;
      }
      if (metadata.status !== undefined) {
        video.status = metadata.status;
      }

      const updatedVideo = await this.videoRepository.save(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`video:${videoId}`);

      return updatedVideo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error updating video metadata',
        error instanceof Error ? error.stack : undefined,
        'VideosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId, metadata },
        },
      );

      throw new InternalServerErrorException('Failed to update video metadata');
    }
  }
}
