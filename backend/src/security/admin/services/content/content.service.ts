import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from 'src/rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from 'src/rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from 'src/rest/api/users/services/photos/assets/entities/photo.entity';
import { Report } from 'src/services/reporting/assets/entities/report.entity';
import { ReportStatus } from 'src/services/reporting/assets/enum/report-status.enum';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';

/**
 * Report with reviewer information for admin views
 */
export interface ReportWithReviewer extends Report {
  reviewerInfo?: {
    username: string;
    displayName: string;
  } | null;
}

/**
 * Admin Content Service
 * 
 * Handles content moderation operations for admin.
 * Uses repositories directly - no dependency on REST API services.
 */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Get all reports with pagination
   */
  async getReports(
    paginationDto: PaginationDto = {},
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  ): Promise<PaginationResponse<ReportWithReviewer>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const queryBuilder = this.reportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .leftJoinAndSelect('reporter.profile', 'reporterProfile')
        .orderBy('report.dateCreated', 'DESC');

      if (status) {
        queryBuilder.where('report.status = :status', { status });
      }

      const [reports, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Fetch reviewer usernames for reports that have been reviewed
      const reportsWithReviewers: ReportWithReviewer[] = await Promise.all(
        reports.map(async (report) => {
          if (report.reviewedBy) {
            const reviewer = await this.userRepository.findOne({
              where: { id: report.reviewedBy },
              select: ['id', 'username', 'displayName'],
            });
            return {
              ...report,
              reviewerInfo: reviewer ? { username: reviewer.username, displayName: reviewer.displayName } : null,
            } as ReportWithReviewer;
          }
          return report as ReportWithReviewer;
        })
      );

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: reportsWithReviewers, meta };
    } catch (error) {
      this.loggingService.error(
        'Error getting reports',
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get reports');
    }
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<ReportWithReviewer> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id },
        relations: ['reporter', 'reporter.profile'],
      });

      if (!report) {
        throw new NotFoundException(`Report with id ${id} not found`);
      }

      // Fetch reviewer username if report has been reviewed
      if (report.reviewedBy) {
        const reviewer = await this.userRepository.findOne({
          where: { id: report.reviewedBy },
          select: ['id', 'username', 'displayName'],
        });
        return {
          ...report,
          reviewerInfo: reviewer ? { username: reviewer.username, displayName: reviewer.displayName } : null,
        } as ReportWithReviewer;
      }

      return report;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting report: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get report');
    }
  }

  /**
   * Review a report (approve, dismiss, resolve)
   */
  async reviewReport(
    id: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    reviewedBy: string,
  ): Promise<ReportWithReviewer> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id },
      });

      if (!report) {
        throw new NotFoundException(`Report with id ${id} not found`);
      }

      report.status = status as ReportStatus;
      report.reviewedBy = reviewedBy;
      report.reviewedAt = new Date();

      const updatedReport = await this.reportRepository.save(report);

      // Fetch reviewer username
      const reviewer = await this.userRepository.findOne({
        where: { id: reviewedBy },
        select: ['id', 'username', 'displayName'],
      });

      this.loggingService.log('Report reviewed by admin', 'AdminContentService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: reviewedBy,
        metadata: { reportId: id, status },
      });

      return {
        ...updatedReport,
        reviewerInfo: reviewer ? { username: reviewer.username, displayName: reviewer.displayName } : null,
      } as ReportWithReviewer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error reviewing report: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to review report');
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<void> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id },
      });

      if (!report) {
        throw new NotFoundException(`Report with id ${id} not found`);
      }

      await this.reportRepository.remove(report);

      this.loggingService.log('Report deleted by admin', 'AdminContentService', {
        category: LogCategory.USER_MANAGEMENT,
        metadata: { reportId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting report: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to delete report');
    }
  }

  /**
   * Get all posts (admin view)
   */
  async getPosts(paginationDto: PaginationDto = {}): Promise<PaginationResponse<Post>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const [posts, total] = await this.postRepository.findAndCount({
        relations: ['user', 'user.profile'],
        order: { dateCreated: 'DESC' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: posts, meta };
    } catch (error) {
      this.loggingService.error(
        'Error getting posts',
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get posts');
    }
  }

  /**
   * Get post by ID (admin view)
   */
  async getPost(id: string): Promise<Post> {
    try {
      const post = await this.postRepository.findOne({
        where: { id },
        relations: ['user', 'user.profile'],
      });

      if (!post) {
        throw new NotFoundException(`Post with id ${id} not found`);
      }

      return post;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting post: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get post');
    }
  }

  /**
   * Delete post (admin override)
   */
  async deletePost(id: string, deletedBy: string): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException(`Post with id ${id} not found`);
      }

      await this.postRepository.remove(post);

      // Invalidate cache
      await this.cachingService.invalidateByTags('post', `post:${id}`);

      this.loggingService.log('Post deleted by admin', 'AdminContentService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: deletedBy,
        metadata: { postId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting post: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to delete post');
    }
  }

  /**
   * Get all videos (admin view)
   */
  async getVideos(paginationDto: PaginationDto = {}): Promise<PaginationResponse<Video>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const [videos, total] = await this.videoRepository.findAndCount({
        relations: ['user', 'user.profile'],
        order: { dateCreated: 'DESC' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: videos, meta };
    } catch (error) {
      this.loggingService.error(
        'Error getting videos',
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get videos');
    }
  }

  /**
   * Get video by ID (admin view)
   */
  async getVideo(id: string): Promise<Video> {
    try {
      const video = await this.videoRepository.findOne({
        where: { id },
        relations: ['user', 'user.profile'],
      });

      if (!video) {
        throw new NotFoundException(`Video with id ${id} not found`);
      }

      return video;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting video: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get video');
    }
  }

  /**
   * Delete video (admin override)
   */
  async deleteVideo(id: string, deletedBy: string): Promise<void> {
    try {
      const video = await this.videoRepository.findOne({
        where: { id },
      });

      if (!video) {
        throw new NotFoundException(`Video with id ${id} not found`);
      }

      await this.videoRepository.remove(video);

      // Invalidate cache
      await this.cachingService.invalidateByTags('video', `video:${id}`);

      this.loggingService.log('Video deleted by admin', 'AdminContentService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: deletedBy,
        metadata: { videoId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting video: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to delete video');
    }
  }

  /**
   * Get all photos (admin view)
   */
  async getPhotos(paginationDto: PaginationDto = {}): Promise<PaginationResponse<Photo>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const [photos, total] = await this.photoRepository.findAndCount({
        relations: ['user', 'user.profile'],
        order: { dateCreated: 'DESC' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return { data: photos, meta };
    } catch (error) {
      this.loggingService.error(
        'Error getting photos',
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get photos');
    }
  }

  /**
   * Get photo by ID (admin view)
   */
  async getPhoto(id: string): Promise<Photo> {
    try {
      const photo = await this.photoRepository.findOne({
        where: { id },
        relations: ['user', 'user.profile'],
      });

      if (!photo) {
        throw new NotFoundException(`Photo with id ${id} not found`);
      }

      return photo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting photo: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get photo');
    }
  }

  /**
   * Delete photo (admin override)
   */
  async deletePhoto(id: string, deletedBy: string): Promise<void> {
    try {
      const photo = await this.photoRepository.findOne({
        where: { id },
      });

      if (!photo) {
        throw new NotFoundException(`Photo with id ${id} not found`);
      }

      await this.photoRepository.remove(photo);

      // Invalidate cache
      await this.cachingService.invalidateByTags('photo', `photo:${id}`);

      this.loggingService.log('Photo deleted by admin', 'AdminContentService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: deletedBy,
        metadata: { photoId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting photo: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminContentService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to delete photo');
    }
  }
}
