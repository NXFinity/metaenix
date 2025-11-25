import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, IsNull } from 'typeorm';
// Note: UserAnalytics available for future use
// import { UserAnalytics } from 'src/services/analytics/assets/entities/user-analytics.entity';
import { PostAnalytics } from 'src/services/analytics/assets/entities/post-analytics.entity';
import { VideoAnalytics } from 'src/services/analytics/assets/entities/video-analytics.entity';
import { PhotoAnalytics } from 'src/services/analytics/assets/entities/photo-analytics.entity';
import { ViewTrack } from 'src/services/tracking/assets/entities/view-track.entity';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { Post } from 'src/rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from 'src/rest/api/users/services/videos/assets/entities/video.entity';
import { Photo } from 'src/rest/api/users/services/photos/assets/entities/photo.entity';
import { Report } from 'src/rest/api/users/services/posts/assets/entities/report.entity';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';

/**
 * Admin Analytics Service
 * 
 * Provides platform-wide analytics aggregation for admin dashboard.
 * Uses repositories directly - no dependency on REST API services.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    // Note: userAnalyticsRepository available for future use
    // @InjectRepository(UserAnalytics)
    // private readonly userAnalyticsRepository: Repository<UserAnalytics>,
    @InjectRepository(PostAnalytics)
    private readonly postAnalyticsRepository: Repository<PostAnalytics>,
    @InjectRepository(VideoAnalytics)
    private readonly videoAnalyticsRepository: Repository<VideoAnalytics>,
    @InjectRepository(PhotoAnalytics)
    private readonly photoAnalyticsRepository: Repository<PhotoAnalytics>,
    @InjectRepository(ViewTrack)
    private readonly viewTrackRepository: Repository<ViewTrack>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly dataSource: DataSource,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Get platform-wide analytics overview
   */
  async getOverview(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPosts: number;
    totalVideos: number;
    totalPhotos: number;
    totalViews: number;
    totalEngagements: number;
    engagementRate: number;
  }> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalPosts,
        totalVideos,
        totalPhotos,
        totalViews,
        totalEngagements,
      ] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { dateDeleted: IsNull() } }),
        this.postRepository.count({ where: { dateDeleted: IsNull() } }),
        this.videoRepository.count({ where: { dateDeleted: IsNull() } }),
        this.photoRepository.count({ where: { dateDeleted: IsNull() } }),
        this.viewTrackRepository.count(),
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.likesCount + pa.commentsCount + pa.sharesCount)', 'total')
          .from(PostAnalytics, 'pa')
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
      ]);

      const engagementRate =
        totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

      return {
        totalUsers,
        activeUsers,
        totalPosts,
        totalVideos,
        totalPhotos,
        totalViews,
        totalEngagements,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting analytics overview',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get analytics overview');
    }
  }

  /**
   * Get user analytics (growth, retention, activity)
   */
  async getUserAnalytics(days: number = 30): Promise<{
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    growthRate: number;
    usersOverTime: Array<{ date: string; count: number }>;
  }> {
    try {
      const totalUsers = await this.userRepository.count();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const newUsers = await this.userRepository.count({
        where: {
          dateCreated: MoreThanOrEqual(cutoffDate),
        },
      });

      const activeUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.dateDeleted IS NULL')
        .andWhere('user.dateUpdated >= :cutoffDate', { cutoffDate })
        .getCount();

      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
      const previousPeriodEnd = new Date();
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const previousPeriodUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.dateCreated >= :start', { start: previousPeriodStart })
        .andWhere('user.dateCreated < :end', { end: previousPeriodEnd })
        .getCount();

      const growthRate =
        previousPeriodUsers > 0
          ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
          : 0;

      // Get users over time (last 30 days)
      const usersOverTime = await this.userRepository
        .createQueryBuilder('user')
        .select('DATE(user.dateCreated)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('user.dateCreated >= :cutoffDate', { cutoffDate })
        .groupBy('DATE(user.dateCreated)')
        .orderBy('date', 'ASC')
        .getRawMany();

      return {
        totalUsers,
        newUsers,
        activeUsers,
        growthRate: parseFloat(growthRate.toFixed(2)),
        usersOverTime: usersOverTime.map((item) => ({
          date: item.date,
          count: parseInt(item.count, 10),
        })),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting user analytics',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get user analytics');
    }
  }

  /**
   * Get content analytics (posts, videos, photos stats)
   */
  async getContentAnalytics(): Promise<{
    totalPosts: number;
    totalVideos: number;
    totalPhotos: number;
    postsEngagement: number;
    videosEngagement: number;
    photosEngagement: number;
    topContent: Array<{
      id: string;
      type: 'post' | 'video' | 'photo';
      views: number;
      engagements: number;
    }>;
  }> {
    try {
      const [totalPosts, totalVideos, totalPhotos] = await Promise.all([
        this.postRepository.count({ where: { dateDeleted: IsNull() } }),
        this.videoRepository.count({ where: { dateDeleted: IsNull() } }),
        this.photoRepository.count({ where: { dateDeleted: IsNull() } }),
      ]);

      const postsEngagement = await this.postAnalyticsRepository
        .createQueryBuilder('pa')
        .select('SUM(pa.likesCount + pa.commentsCount + pa.sharesCount)', 'total')
        .getRawOne()
        .then((result) => parseInt(result?.total || '0', 10));

      const videosEngagement = await this.videoAnalyticsRepository
        .createQueryBuilder('va')
        .select('SUM(va.likesCount + va.commentsCount + va.sharesCount)', 'total')
        .getRawOne()
        .then((result) => parseInt(result?.total || '0', 10));

      const photosEngagement = await this.photoAnalyticsRepository
        .createQueryBuilder('pha')
        .select('SUM(pha.likesCount + pha.commentsCount + pha.sharesCount)', 'total')
        .getRawOne()
        .then((result) => parseInt(result?.total || '0', 10));

      // Get top content by views
      const topPosts = await this.postAnalyticsRepository
        .createQueryBuilder('pa')
        .select('pa.postId', 'id')
        .addSelect('pa.viewsCount', 'views')
        .addSelect('(pa.likesCount + pa.commentsCount + pa.sharesCount)', 'engagements')
        .orderBy('pa.viewsCount', 'DESC')
        .limit(10)
        .getRawMany();

      const topContent = topPosts.map((item) => ({
        id: item.id,
        type: 'post' as const,
        views: parseInt(item.views, 10),
        engagements: parseInt(item.engagements, 10),
      }));

      return {
        totalPosts,
        totalVideos,
        totalPhotos,
        postsEngagement,
        videosEngagement,
        photosEngagement,
        topContent,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting content analytics',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get content analytics');
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(_days: number = 30): Promise<{
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    engagementRate: number;
    engagementOverTime: Array<{ date: string; likes: number; comments: number; shares: number }>;
  }> {
    try {
      const [totalLikes, totalComments, totalShares, totalViews] = await Promise.all([
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.likesCount)', 'total')
          .from(PostAnalytics, 'pa')
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.commentsCount)', 'total')
          .from(PostAnalytics, 'pa')
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.sharesCount)', 'total')
          .from(PostAnalytics, 'pa')
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
        this.viewTrackRepository.count(),
      ]);

      const engagementRate =
        totalViews > 0
          ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
          : 0;

      // Engagement over time (simplified - would need date tracking in analytics)
      const engagementOverTime: Array<{
        date: string;
        likes: number;
        comments: number;
        shares: number;
      }> = [];

      return {
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        engagementOverTime,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting engagement metrics',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get engagement metrics');
    }
  }

  /**
   * Get report analytics
   */
  async getReportAnalytics(): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    dismissedReports: number;
    reportsByReason: Array<{ reason: string; count: number }>;
    resolutionRate: number;
  }> {
    try {
      const [
        totalReports,
        pendingReports,
        resolvedReports,
        dismissedReports,
      ] = await Promise.all([
        this.reportRepository.count(),
        this.reportRepository.count({ where: { status: 'pending' } }),
        this.reportRepository.count({ where: { status: 'resolved' } }),
        this.reportRepository.count({ where: { status: 'dismissed' } }),
      ]);

      const reportsByReason = await this.reportRepository
        .createQueryBuilder('report')
        .select('report.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('report.reason')
        .getRawMany();

      const resolutionRate =
        totalReports > 0
          ? ((resolvedReports + dismissedReports) / totalReports) * 100
          : 0;

      return {
        totalReports,
        pendingReports,
        resolvedReports,
        dismissedReports,
        reportsByReason: reportsByReason.map((item) => ({
          reason: item.reason,
          count: parseInt(item.count, 10),
        })),
        resolutionRate: parseFloat(resolutionRate.toFixed(2)),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting report analytics',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get report analytics');
    }
  }

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(days: number = 30): Promise<{
    userGrowth: {
      current: number;
      previous: number;
      growthRate: number;
    };
    contentGrowth: {
      posts: { current: number; previous: number; growthRate: number };
      videos: { current: number; previous: number; growthRate: number };
      photos: { current: number; previous: number; growthRate: number };
    };
    engagementGrowth: {
      current: number;
      previous: number;
      growthRate: number;
    };
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
      const previousPeriodEnd = new Date();
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const [
        currentUsers,
        previousUsers,
        currentPosts,
        previousPosts,
        currentVideos,
        previousVideos,
        currentPhotos,
        previousPhotos,
        currentEngagements,
        previousEngagements,
      ] = await Promise.all([
        this.userRepository.count({
          where: { dateCreated: MoreThanOrEqual(cutoffDate), dateDeleted: IsNull() },
        }),
        this.userRepository
          .createQueryBuilder('user')
          .where('user.dateCreated >= :start', { start: previousPeriodStart })
          .andWhere('user.dateCreated < :end', { end: previousPeriodEnd })
          .andWhere('user.dateDeleted IS NULL')
          .getCount(),
        this.postRepository.count({
          where: { dateCreated: MoreThanOrEqual(cutoffDate), dateDeleted: IsNull() },
        }),
        this.postRepository
          .createQueryBuilder('post')
          .where('post.dateCreated >= :start', { start: previousPeriodStart })
          .andWhere('post.dateCreated < :end', { end: previousPeriodEnd })
          .andWhere('post.dateDeleted IS NULL')
          .getCount(),
        this.videoRepository.count({
          where: { dateCreated: MoreThanOrEqual(cutoffDate), dateDeleted: IsNull() },
        }),
        this.videoRepository
          .createQueryBuilder('video')
          .where('video.dateCreated >= :start', { start: previousPeriodStart })
          .andWhere('video.dateCreated < :end', { end: previousPeriodEnd })
          .andWhere('video.dateDeleted IS NULL')
          .getCount(),
        this.photoRepository.count({
          where: { dateCreated: MoreThanOrEqual(cutoffDate), dateDeleted: IsNull() },
        }),
        this.photoRepository
          .createQueryBuilder('photo')
          .where('photo.dateCreated >= :start', { start: previousPeriodStart })
          .andWhere('photo.dateCreated < :end', { end: previousPeriodEnd })
          .andWhere('photo.dateDeleted IS NULL')
          .getCount(),
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.likesCount + pa.commentsCount + pa.sharesCount)', 'total')
          .from(PostAnalytics, 'pa')
          .where('pa.dateUpdated >= :cutoffDate', { cutoffDate })
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
        this.dataSource
          .createQueryBuilder()
          .select('SUM(pa.likesCount + pa.commentsCount + pa.sharesCount)', 'total')
          .from(PostAnalytics, 'pa')
          .where('pa.dateUpdated >= :start', { start: previousPeriodStart })
          .andWhere('pa.dateUpdated < :end', { end: previousPeriodEnd })
          .getRawOne()
          .then((result) => parseInt(result?.total || '0', 10)),
      ]);

      const userGrowthRate =
        previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0;
      const postsGrowthRate =
        previousPosts > 0 ? ((currentPosts - previousPosts) / previousPosts) * 100 : 0;
      const videosGrowthRate =
        previousVideos > 0 ? ((currentVideos - previousVideos) / previousVideos) * 100 : 0;
      const photosGrowthRate =
        previousPhotos > 0 ? ((currentPhotos - previousPhotos) / previousPhotos) * 100 : 0;
      const engagementGrowthRate =
        previousEngagements > 0
          ? ((currentEngagements - previousEngagements) / previousEngagements) * 100
          : 0;

      return {
        userGrowth: {
          current: currentUsers,
          previous: previousUsers,
          growthRate: parseFloat(userGrowthRate.toFixed(2)),
        },
        contentGrowth: {
          posts: {
            current: currentPosts,
            previous: previousPosts,
            growthRate: parseFloat(postsGrowthRate.toFixed(2)),
          },
          videos: {
            current: currentVideos,
            previous: previousVideos,
            growthRate: parseFloat(videosGrowthRate.toFixed(2)),
          },
          photos: {
            current: currentPhotos,
            previous: previousPhotos,
            growthRate: parseFloat(photosGrowthRate.toFixed(2)),
          },
        },
        engagementGrowth: {
          current: currentEngagements,
          previous: previousEngagements,
          growthRate: parseFloat(engagementGrowthRate.toFixed(2)),
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting growth metrics',
        error instanceof Error ? error.stack : undefined,
        'AdminAnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get growth metrics');
    }
  }
}
