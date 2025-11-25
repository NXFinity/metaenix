import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Photo } from './assets/entities/photo.entity';
import { User } from '../../assets/entities/user.entity';
import { Post } from '../posts/assets/entities/post.entity';
import { CreatePhotoDto } from './assets/dto/create-photo.dto';
import { UpdatePhotoDto } from './assets/dto/update-photo.dto';
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
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
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
   * Generate a unique slug for a photo
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(title).substring(0, 200); // Limit length
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.photoRepository.findOne({
        where: { slug },
        select: ['id'],
      });

      // If no existing photo with this slug, or it's the same photo we're updating
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // Append counter to make it unique
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a photo record (after file upload)
   */
  async createPhoto(
    userId: string,
    createDto: CreatePhotoDto,
    photoFile: Express.Multer.File,
  ): Promise<Photo> {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Upload photo file
      const uploadResult = await this.storageService.uploadFile(
        userId,
        photoFile,
        StorageType.MEDIA,
        'photo',
      );

      // Generate unique slug
      const slug = await this.generateUniqueSlug(createDto.title);

      // Create photo entity
      const photo = this.photoRepository.create({
        userId,
        title: createDto.title,
        slug,
        description: createDto.description || null,
        imageUrl: uploadResult.url,
        storageKey: uploadResult.key,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.size,
        isPublic: createDto.isPublic !== undefined ? createDto.isPublic : true,
        status: 'ready', // Photo is ready immediately after upload
        tags: createDto.tags || [],
        viewsCount: 0,
        width: 0, // Will be updated when image metadata is extracted
        height: 0, // Will be updated when image metadata is extracted
      });

      const savedPhoto = await this.photoRepository.save(photo);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:photos`);

      this.loggingService.log('Photo created', 'PhotosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          photoId: savedPhoto.id,
          title: savedPhoto.title,
        },
      });

      return savedPhoto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating photo',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { createDto },
        },
      );

      throw new InternalServerErrorException('Failed to upload photo');
    }
  }

  /**
   * Get all photos for a user (paginated)
   */
  async getUserPhotos(
    userId: string,
    paginationDto: PaginationDto,
    requestingUserId?: string,
  ): Promise<PaginationResponse<Photo>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';

      // Build query
      const queryBuilder = this.photoRepository
        .createQueryBuilder('photo')
        .leftJoinAndSelect('photo.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('photo.userId = :userId', { userId })
        .andWhere('photo.dateDeleted IS NULL')
        .orderBy(`photo.${sortBy}`, sortOrder)
        .skip(skip)
        .take(limit);

      // If requesting user is not the owner, only show public photos
      if (requestingUserId !== userId) {
        queryBuilder.andWhere('photo.isPublic = :isPublic', { isPublic: true });
      }

      const [photos, total] = await queryBuilder.getManyAndCount();

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      };

      return {
        data: photos,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting user photos',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get user photos');
    }
  }

  /**
   * Get a single photo by ID (UUID only - slugs are frontend-only)
   */
  async getPhotoById(
    photoId: string,
    requestingUserId?: string,
  ): Promise<Photo> {
    try {
      // Backend only accepts UUIDs - slugs are frontend-only for URL aesthetics
      let photo = await this.photoRepository.findOne({
        where: { id: photoId, dateDeleted: IsNull() },
        relations: ['user', 'user.profile'],
      });

      if (!photo) {
        throw new NotFoundException('Photo not found');
      }

      // If photo doesn't have a slug, generate one (for existing photos)
      if (!photo.slug) {
        photo.slug = await this.generateUniqueSlug(photo.title, photo.id);
        await this.photoRepository.save(photo);
      }

      // Check if user has access (public or owner)
      if (requestingUserId !== photo.userId && !photo.isPublic) {
        throw new ForbiddenException('You do not have access to this photo');
      }

      return photo;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error getting photo',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId },
        },
      );

      throw new InternalServerErrorException('Failed to get photo');
    }
  }

  /**
   * Update a photo
   */
  async updatePhoto(
    userId: string,
    photoId: string,
    updateDto: UpdatePhotoDto,
  ): Promise<Photo> {
    try {
      const photo = await this.getPhotoById(photoId, userId);

      // Check ownership
      if (photo.userId !== userId) {
        throw new ForbiddenException('You can only update your own photos');
      }

      // Update fields
      if (updateDto.title !== undefined) {
        photo.title = updateDto.title;
        // Regenerate slug if title changed (or if slug is missing)
        if (!photo.slug || photo.title !== updateDto.title) {
          photo.slug = await this.generateUniqueSlug(updateDto.title, photoId);
        }
      } else if (!photo.slug) {
        // If title didn't change but slug is missing, generate it
        photo.slug = await this.generateUniqueSlug(photo.title, photoId);
      }
      if (updateDto.description !== undefined) {
        photo.description = updateDto.description;
      }
      if (updateDto.isPublic !== undefined) {
        photo.isPublic = updateDto.isPublic;
      }
      if (updateDto.tags !== undefined) {
        photo.tags = updateDto.tags;
      }

      const updatedPhoto = await this.photoRepository.save(photo);

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        `user:${userId}:photos`,
        `photo:${photoId}`,
      );

      this.loggingService.log('Photo updated', 'PhotosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          photoId: updatedPhoto.id,
        },
      });

      return updatedPhoto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error updating photo',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId, updateDto },
        },
      );

      throw new InternalServerErrorException('Failed to update photo');
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(userId: string, photoId: string): Promise<void> {
    try {
      const photo = await this.getPhotoById(photoId, userId);

      // Check ownership
      if (photo.userId !== userId) {
        throw new ForbiddenException('You can only delete your own photos');
      }

      // Delete from storage if storage key exists
      if (photo.storageKey) {
        try {
          await this.storageService.deleteFile(photo.storageKey, userId);
        } catch (storageError) {
          this.loggingService.error(
            'Error deleting photo from storage',
            storageError instanceof Error ? storageError.stack : undefined,
            'PhotosService',
            {
              category: LogCategory.STORAGE,
              userId,
              error:
                storageError instanceof Error
                  ? storageError
                  : new Error(String(storageError)),
              metadata: { photoId, storageKey: photo.storageKey },
            },
          );
          // Continue with soft delete even if storage deletion fails
        }
      }

      // Soft delete photo
      await this.photoRepository.softRemove(photo);

      // Remove photo from any posts that reference it
      try {
        // Find posts where mediaUrl matches
        const postsWithMediaUrl = await this.postRepository.find({
          where: { mediaUrl: photo.imageUrl, dateDeleted: IsNull() },
        });

        // Find posts that might have the URL in mediaUrls array
        // Since TypeORM doesn't support array contains directly, we'll use a query builder
        const queryBuilder = this.postRepository
          .createQueryBuilder('post')
          .where('post.dateDeleted IS NULL')
          .andWhere('post.mediaUrls IS NOT NULL');

        const allPostsWithMediaUrls = await queryBuilder.getMany();

        // Filter posts that contain this photo URL in mediaUrls
        const postsWithMediaUrls = allPostsWithMediaUrls.filter((post) => {
          return post.mediaUrls && post.mediaUrls.includes(photo.imageUrl);
        });

        // Combine and deduplicate
        const allPostsWithPhoto = [...postsWithMediaUrl, ...postsWithMediaUrls];
        const postsWithPhoto = Array.from(
          new Map(allPostsWithPhoto.map((post) => [post.id, post])).values()
        );

        if (postsWithPhoto.length > 0) {
          for (const post of postsWithPhoto) {
            // Remove from mediaUrl if it matches
            if (post.mediaUrl === photo.imageUrl) {
              post.mediaUrl = null;
            }

            // Remove from mediaUrls array
            if (post.mediaUrls && post.mediaUrls.length > 0) {
              post.mediaUrls = post.mediaUrls.filter((url) => url !== photo.imageUrl);
            }

            // Update postType if no media remains
            if (!post.mediaUrl && (!post.mediaUrls || post.mediaUrls.length === 0)) {
              post.postType = post.content ? 'text' : null;
            } else {
              // Re-determine post type based on remaining media
              const hasVideo = post.mediaUrls?.some((url) => 
                url.includes('.mp4') || url.includes('.webm') || url.includes('video')
              ) || (post.mediaUrl && (
                post.mediaUrl.includes('.mp4') || 
                post.mediaUrl.includes('.webm') || 
                post.mediaUrl.includes('video')
              ));
              const hasImage = post.mediaUrls?.some((url) => 
                url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ) || (post.mediaUrl && post.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
              
              if (hasVideo && hasImage) {
                post.postType = 'mixed';
              } else if (hasVideo) {
                post.postType = 'video';
              } else if (hasImage) {
                post.postType = 'image';
              } else {
                post.postType = 'text';
              }
            }

            await this.postRepository.save(post);
          }

          this.loggingService.log('Removed photo from posts', 'PhotosService', {
            category: LogCategory.DATABASE,
            userId,
            metadata: { photoId, postsUpdated: postsWithPhoto.length },
          });
        }
      } catch (postUpdateError) {
        // Log but don't fail photo deletion if post update fails
        this.loggingService.error(
          'Error removing photo from posts',
          postUpdateError instanceof Error ? postUpdateError.stack : undefined,
          'PhotosService',
          {
            category: LogCategory.DATABASE,
            userId,
            error:
              postUpdateError instanceof Error
                ? postUpdateError
                : new Error(String(postUpdateError)),
            metadata: { photoId },
          },
        );
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags(
        `user:${userId}:photos`,
        `photo:${photoId}`,
      );

      // Recalculate user analytics immediately (await to ensure it completes)
      try {
        await this.analyticsService.calculateUserAnalytics(userId);
      } catch (error: unknown) {
        this.loggingService.error(
          'Error recalculating user analytics after photo deletion',
          error instanceof Error ? error.stack : undefined,
          'PhotosService',
        );
        // Don't fail deletion if analytics recalculation fails
      }

      this.loggingService.log('Photo deleted', 'PhotosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { photoId },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error deleting photo',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId },
        },
      );

      throw new InternalServerErrorException('Failed to delete photo');
    }
  }

  /**
   * Track photo view (uses centralized tracking service)
   */
  async trackPhotoView(photoId: string, req: any, userId?: string): Promise<void> {
    try {
      const photo = await this.photoRepository.findOne({
        where: { id: photoId, dateDeleted: IsNull() },
        relations: ['user'],
      });

      if (!photo) {
        return; // Silently fail if photo doesn't exist
      }

      // Track view using centralized tracking service
      const trackingResult = await this.trackingService.trackPhotoView(photoId, photo.userId, req, userId);

      // Only recalculate analytics if view was actually tracked (not a duplicate)
      // Note: Photo analytics calculation will be added to AnalyticsService when needed
      // For now, tracking is handled by TrackingService and counts are calculated by AnalyticsService
      if (trackingResult.tracked) {
        // Photo analytics calculation can be added to AnalyticsService later
        // this.analyticsService.calculatePhotoAnalytics(photoId).catch((error: unknown) => {
        //   this.loggingService.error(
        //     'Error recalculating photo analytics after view',
        //     error instanceof Error ? error.stack : undefined,
        //     'PhotosService',
        //   );
        // });
      }

      // Invalidate cache
      await this.cachingService.invalidateByTags(`photo:${photoId}`);
    } catch (error) {
      // Silently fail for view tracking
      this.loggingService.error(
        'Error tracking photo view',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId, userId },
        },
      );
    }
  }

  /**
   * Create a photo from an already uploaded file (used when photo is uploaded via post)
   * This creates a photo record in the user's library without re-uploading the file
   * Returns null if creation fails (non-critical operation)
   */
  async createPhotoFromUploadedFile(
    userId: string,
    imageUrl: string,
    storageKey: string,
    mimeType: string,
    fileSize: number,
    title?: string,
  ): Promise<Photo | null> {
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
      const photoTitle = title || `Photo from post - ${new Date().toLocaleDateString()}`;

      // Generate unique slug
      const slug = await this.generateUniqueSlug(photoTitle);

      // Create photo entity
      const photo = this.photoRepository.create({
        userId,
        title: photoTitle,
        slug,
        description: null,
        imageUrl,
        storageKey,
        mimeType,
        fileSize,
        isPublic: true,
        status: 'ready',
        tags: [],
        viewsCount: 0,
        width: 0, // Will be updated when image metadata is extracted
        height: 0, // Will be updated when image metadata is extracted
      });

      const savedPhoto = await this.photoRepository.save(photo);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:photos`);

      this.loggingService.log('Photo created from uploaded file', 'PhotosService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          photoId: savedPhoto.id,
          title: savedPhoto.title,
        },
      });

      return savedPhoto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error creating photo from uploaded file',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      // Don't throw error - allow post creation to continue even if photo library creation fails
      // This is a non-critical operation
      return null;
    }
  }

  /**
   * Update photo metadata (after processing)
   */
  async updatePhotoMetadata(
    photoId: string,
    metadata: {
      width?: number;
      height?: number;
      thumbnailUrl?: string;
      status?: string;
    },
  ): Promise<Photo> {
    try {
      const photo = await this.photoRepository.findOne({
        where: { id: photoId, dateDeleted: IsNull() },
      });

      if (!photo) {
        throw new NotFoundException('Photo not found');
      }

      if (metadata.width !== undefined) {
        photo.width = metadata.width;
      }
      if (metadata.height !== undefined) {
        photo.height = metadata.height;
      }
      if (metadata.thumbnailUrl !== undefined) {
        photo.thumbnailUrl = metadata.thumbnailUrl;
      }
      if (metadata.status !== undefined) {
        photo.status = metadata.status;
      }

      const updatedPhoto = await this.photoRepository.save(photo);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`photo:${photoId}`);

      return updatedPhoto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error updating photo metadata',
        error instanceof Error ? error.stack : undefined,
        'PhotosService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId, metadata },
        },
      );

      throw new InternalServerErrorException('Failed to update photo metadata');
    }
  }
}
