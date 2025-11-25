import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, IsNull } from 'typeorm';
// Note: ViewTrack available for future use
// import { ViewTrack } from 'src/services/tracking/assets/entities/view-track.entity';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { Post } from 'src/rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from 'src/rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from 'src/rest/api/users/services/photos/assets/entities/photo.entity';
// Note: AuditLogService and LogCategory available for future use
// import { AuditLogService } from '@logging/logging';
// import { LogCategory } from '@logging/logging';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';

/**
 * Admin Tracking Service
 * 
 * Handles activity tracking and audit logs for admin.
 * Uses repositories directly - no dependency on REST API services.
 */
@Injectable()
export class TrackingService {
  constructor(
    // Note: viewTrackRepository available for future use
    // @InjectRepository(ViewTrack)
    // private readonly viewTrackRepository: Repository<ViewTrack>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    // Note: auditLogService available for future use
    // private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get recent platform activity
   */
  async getActivity(
    paginationDto: PaginationDto = {},
    days: number = 7,
  ): Promise<PaginationResponse<{
    type: string;
    action: string;
    userId?: string;
    username?: string;
    resourceId?: string;
    resourceType?: string;
    timestamp: Date;
  }>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;
      const skip = (page - 1) * limit;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get recent user registrations
      const recentUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.dateCreated >= :cutoffDate', { cutoffDate })
        .select(['user.id', 'user.username', 'user.dateCreated'])
        .orderBy('user.dateCreated', 'DESC')
        .limit(limit)
        .getMany();

      // Get recent content creation
      const recentPosts = await this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.user', 'user')
        .where('post.dateCreated >= :cutoffDate', { cutoffDate })
        .select(['post.id', 'post.dateCreated', 'user.id', 'user.username'])
        .orderBy('post.dateCreated', 'DESC')
        .limit(limit)
        .getMany();

      const recentVideos = await this.videoRepository
        .createQueryBuilder('video')
        .leftJoin('video.user', 'user')
        .where('video.dateCreated >= :cutoffDate', { cutoffDate })
        .select(['video.id', 'video.dateCreated', 'user.id', 'user.username'])
        .orderBy('video.dateCreated', 'DESC')
        .limit(limit)
        .getMany();

      const recentPhotos = await this.photoRepository
        .createQueryBuilder('photo')
        .leftJoin('photo.user', 'user')
        .where('photo.dateCreated >= :cutoffDate', { cutoffDate })
        .select(['photo.id', 'photo.dateCreated', 'user.id', 'user.username'])
        .orderBy('photo.dateCreated', 'DESC')
        .limit(limit)
        .getMany();

      // Combine and format activities
      const activities: Array<{
        type: string;
        action: string;
        userId?: string;
        username?: string;
        resourceId?: string;
        resourceType?: string;
        timestamp: Date;
      }> = [];

      recentUsers.forEach((user) => {
        activities.push({
          type: 'user',
          action: 'registered',
          userId: user.id,
          username: user.username,
          timestamp: user.dateCreated,
        });
      });

      recentPosts.forEach((post) => {
        activities.push({
          type: 'content',
          action: 'post_created',
          userId: post.user?.id,
          username: post.user?.username,
          resourceId: post.id,
          resourceType: 'post',
          timestamp: post.dateCreated,
        });
      });

      recentVideos.forEach((video) => {
        activities.push({
          type: 'content',
          action: 'video_created',
          userId: video.user?.id,
          username: video.user?.username,
          resourceId: video.id,
          resourceType: 'video',
          timestamp: video.dateCreated,
        });
      });

      recentPhotos.forEach((photo) => {
        activities.push({
          type: 'content',
          action: 'photo_created',
          userId: photo.user?.id,
          username: photo.user?.username,
          resourceId: photo.id,
          resourceType: 'photo',
          timestamp: photo.dateCreated,
        });
      });

      // Sort by timestamp (newest first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Paginate
      const paginatedActivities = activities.slice(skip, skip + limit);
      const total = activities.length;
      const totalPages = Math.ceil(total / limit);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: paginatedActivities, meta };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get activity');
    }
  }

  /**
   * Get platform statistics for dashboard
   */
  async getStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalVideos: number;
    totalPhotos: number;
    newUsersToday: number;
    newPostsToday: number;
    newVideosToday: number;
    newPhotosToday: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        totalPosts,
        totalVideos,
        totalPhotos,
        newUsersToday,
        newPostsToday,
        newVideosToday,
        newPhotosToday,
      ] = await Promise.all([
        this.userRepository.count({ where: { dateDeleted: IsNull() } }),
        this.postRepository.count({ where: { dateDeleted: IsNull() } }),
        this.videoRepository.count({ where: { dateDeleted: IsNull() } }),
        this.photoRepository.count({ where: { dateDeleted: IsNull() } }),
        this.userRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(today),
            dateDeleted: IsNull(),
          },
        }),
        this.postRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(today),
            dateDeleted: IsNull(),
          },
        }),
        this.videoRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(today),
            dateDeleted: IsNull(),
          },
        }),
        this.photoRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(today),
            dateDeleted: IsNull(),
          },
        }),
      ]);

      return {
        totalUsers,
        totalPosts,
        totalVideos,
        totalPhotos,
        newUsersToday,
        newPostsToday,
        newVideosToday,
        newPhotosToday,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get stats');
    }
  }

  /**
   * Get system logs
   */
  async getSystemLogs(
    paginationDto: PaginationDto = {},
    _level?: string,
  ): Promise<PaginationResponse<any>> {
    try {
      // This would query system logs from LoggingService
      // For now, return empty array as log querying needs to be implemented
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;

      const meta: PaginationMeta = {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      return { data: [], meta };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get system logs');
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<any>> {
    try {
      // This would query error logs from LoggingService
      // For now, return empty array as log querying needs to be implemented
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;

      const meta: PaginationMeta = {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      return { data: [], meta };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get error logs');
    }
  }

  /**
   * Export logs
   */
  async exportLogs(
    format: 'csv' | 'json' = 'json',
    type?: 'system' | 'error' | 'audit',
  ): Promise<{ data: string; format: string; filename: string }> {
    try {
      // This would export logs from LoggingService
      // For now, return empty data
      const data = type === 'error' 
        ? await this.getErrorLogs({ page: 1, limit: 1000 })
        : type === 'audit'
        ? { data: [] } // Would get from audit service
        : await this.getSystemLogs({ page: 1, limit: 1000 });

      if (format === 'csv') {
        return {
          data: JSON.stringify(data, null, 2),
          format: 'csv',
          filename: `logs-${type || 'all'}-${new Date().toISOString().split('T')[0]}.csv`,
        };
      }

      return {
        data: JSON.stringify(data, null, 2),
        format: 'json',
        filename: `logs-${type || 'all'}-${new Date().toISOString().split('T')[0]}.json`,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to export logs');
    }
  }
}
