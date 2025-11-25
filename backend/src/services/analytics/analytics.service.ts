import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ViewTrack } from '../tracking/assets/entities/view-track.entity';
import { UserAnalytics } from './assets/entities/user-analytics.entity';
import { PostAnalytics } from './assets/entities/post-analytics.entity';
import { VideoAnalytics } from './assets/entities/video-analytics.entity';
import { PhotoAnalytics } from './assets/entities/photo-analytics.entity';
import { ResourceType } from '../tracking/assets/enum/resource-type.enum';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationResponse, PaginationMeta } from '../../common/interfaces/pagination-response.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ViewTrack)
    private readonly viewTrackRepository: Repository<ViewTrack>,
    @InjectRepository(UserAnalytics)
    private readonly userAnalyticsRepository: Repository<UserAnalytics>,
    @InjectRepository(PostAnalytics)
    private readonly postAnalyticsRepository: Repository<PostAnalytics>,
    @InjectRepository(VideoAnalytics)
    private readonly videoAnalyticsRepository: Repository<VideoAnalytics>,
    @InjectRepository(PhotoAnalytics)
    private readonly photoAnalyticsRepository: Repository<PhotoAnalytics>,
    private readonly dataSource: DataSource,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Get geographic analytics for a user's profile views
   */
  async getGeographicAnalytics(userId: string): Promise<{
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    totalViews: number;
  }> {
    return this.getGeographicAnalyticsByResourceType(userId, ResourceType.PROFILE);
  }

  /**
   * Get geographic analytics for a specific resource type for a user
   */
  async getGeographicAnalyticsByResourceType(
    userId: string,
    resourceType: ResourceType | string,
  ): Promise<{
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    totalViews: number;
  }> {
    try {
      const views = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select('view.countryCode', 'countryCode')
        .addSelect('view.countryName', 'countryName')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.resourceType = :resourceType', { resourceType })
        .andWhere('view.countryCode IS NOT NULL')
        .groupBy('view.countryCode')
        .addGroupBy('view.countryName')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      const totalViews = await this.viewTrackRepository.count({
        where: {
          userId,
          resourceType,
        },
      });

      const topCountries = views.map((view) => ({
        countryCode: view.countryCode,
        countryName: view.countryName || view.countryCode,
        count: parseInt(view.count, 10),
      }));

      return {
        topCountries,
        totalViews,
      };
    } catch (error) {
      this.loggingService.error(
        `Error getting geographic analytics for ${resourceType}`,
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId, resourceType },
        },
      );
      return {
        topCountries: [],
        totalViews: 0,
      };
    }
  }

  /**
   * Get aggregate analytics for a user across ALL their resources
   */
  async getAggregateAnalytics(userId: string): Promise<{
    totalViews: number;
    viewsByResourceType: {
      profile: number;
      post: number;
      video: number;
      photo: number;
    };
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    viewsOverTime: Array<{ date: string; count: number }>;
  }> {
    try {
      // Get total views across all resources
      const totalViews = await this.viewTrackRepository.count({
        where: { userId },
      });

      // Get views by resource type
      const viewsByType = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select('view.resourceType', 'resourceType')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .groupBy('view.resourceType')
        .getRawMany();

      const viewsByResourceType = {
        profile: 0,
        post: 0,
        video: 0,
        photo: 0,
      };

      viewsByType.forEach((item) => {
        const count = parseInt(item.count, 10);
        if (item.resourceType === ResourceType.PROFILE) {
          viewsByResourceType.profile = count;
        } else if (item.resourceType === ResourceType.POST) {
          viewsByResourceType.post = count;
        } else if (item.resourceType === ResourceType.VIDEO) {
          viewsByResourceType.video = count;
        } else if (item.resourceType === ResourceType.PHOTO) {
          viewsByResourceType.photo = count;
        }
      });

      // Get top countries across all resources
      const topCountries = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select('view.countryCode', 'countryCode')
        .addSelect('view.countryName', 'countryName')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.countryCode IS NOT NULL')
        .groupBy('view.countryCode')
        .addGroupBy('view.countryName')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      // Get views over time (last 30 days) across all resources
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsOverTime = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select("DATE_TRUNC('day', view.dateCreated)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.dateCreated >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy("DATE_TRUNC('day', view.dateCreated)")
        .orderBy('date', 'ASC')
        .getRawMany();

      return {
        totalViews,
        viewsByResourceType,
        topCountries: topCountries.map((view) => ({
          countryCode: view.countryCode,
          countryName: view.countryName || view.countryCode,
          count: parseInt(view.count, 10),
        })),
        viewsOverTime: viewsOverTime.map((view) => ({
          date: view.date.toISOString().split('T')[0],
          count: parseInt(view.count, 10),
        })),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting aggregate analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return {
        totalViews: 0,
        viewsByResourceType: {
          profile: 0,
          post: 0,
          video: 0,
          photo: 0,
        },
        topCountries: [],
        viewsOverTime: [],
      };
    }
  }


  /**
   * Get analytics for a user's posts (aggregated)
   */
  async getUserPostAnalytics(userId: string): Promise<{
    totalViews: number;
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    viewsOverTime: Array<{ date: string; count: number }>;
  }> {
    try {
      const geoData = await this.getGeographicAnalyticsByResourceType(userId, ResourceType.POST);

      // Get views over time for posts
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsOverTime = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select("DATE_TRUNC('day', view.dateCreated)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.resourceType = :resourceType', { resourceType: ResourceType.POST })
        .andWhere('view.dateCreated >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy("DATE_TRUNC('day', view.dateCreated)")
        .orderBy('date', 'ASC')
        .getRawMany();

      return {
        ...geoData,
        viewsOverTime: viewsOverTime.map((view) => ({
          date: view.date.toISOString().split('T')[0],
          count: parseInt(view.count, 10),
        })),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting post analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return {
        totalViews: 0,
        topCountries: [],
        viewsOverTime: [],
      };
    }
  }

  /**
   * Get analytics for a user's videos (aggregated)
   */
  async getUserVideoAnalytics(userId: string): Promise<{
    totalViews: number;
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    viewsOverTime: Array<{ date: string; count: number }>;
  }> {
    try {
      const geoData = await this.getGeographicAnalyticsByResourceType(userId, ResourceType.VIDEO);

      // Get views over time for videos
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsOverTime = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select("DATE_TRUNC('day', view.dateCreated)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.resourceType = :resourceType', { resourceType: ResourceType.VIDEO })
        .andWhere('view.dateCreated >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy("DATE_TRUNC('day', view.dateCreated)")
        .orderBy('date', 'ASC')
        .getRawMany();

      return {
        ...geoData,
        viewsOverTime: viewsOverTime.map((view) => ({
          date: view.date.toISOString().split('T')[0],
          count: parseInt(view.count, 10),
        })),
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting video analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return {
        totalViews: 0,
        topCountries: [],
        viewsOverTime: [],
      };
    }
  }

  /**
   * Get analytics for a user's photos (aggregated)
   */
  async getUserPhotoAnalytics(userId: string): Promise<{
    totalViews: number;
    topCountries: Array<{ countryCode: string; countryName: string; count: number }>;
    viewsOverTime: Array<{ date: string; count: number }>;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
  }> {
    try {
      const geoData = await this.getGeographicAnalyticsByResourceType(userId, ResourceType.PHOTO);

      // Get views over time for photos
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsOverTime = await this.viewTrackRepository
        .createQueryBuilder('view')
        .select("DATE_TRUNC('day', view.dateCreated)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('view.userId = :userId', { userId })
        .andWhere('view.resourceType = :resourceType', { resourceType: ResourceType.PHOTO })
        .andWhere('view.dateCreated >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy("DATE_TRUNC('day', view.dateCreated)")
        .orderBy('date', 'ASC')
        .getRawMany();

      // Get total likes, comments, shares for photos using JOIN queries
      const [likesCount, commentsCount, sharesCount] = await Promise.all([
        this.dataSource
          .query(
            `SELECT COUNT(*) as count
             FROM social."socialLike" "like"
             INNER JOIN account."userPhoto" "photo" ON "photo".id = "like"."resourceId"
             WHERE "photo"."userId" = $1 AND "like"."resourceType" = 'photo' AND "like"."resourceId" IS NOT NULL`,
            [userId],
          )
          .then((result) => parseInt(result[0]?.count || '0', 10)),
        this.dataSource
          .query(
            `SELECT COUNT(*) as count
             FROM social."socialComment" "comment"
             INNER JOIN account."userPhoto" "photo" ON "photo".id = "comment"."resourceId"
             WHERE "photo"."userId" = $1 AND "comment"."resourceType" = 'photo' AND "comment"."resourceId" IS NOT NULL AND "comment"."dateDeleted" IS NULL`,
            [userId],
          )
          .then((result) => parseInt(result[0]?.count || '0', 10)),
        this.dataSource
          .query(
            `SELECT COUNT(*) as count
             FROM social."socialShare" "share"
             INNER JOIN account."userPhoto" "photo" ON "photo".id = "share"."resourceId"
             WHERE "photo"."userId" = $1 AND "share"."resourceType" = 'photo' AND "share"."resourceId" IS NOT NULL`,
            [userId],
          )
          .then((result) => parseInt(result[0]?.count || '0', 10)),
      ]);

      return {
        ...geoData,
        viewsOverTime: viewsOverTime.map((view) => ({
          date: view.date.toISOString().split('T')[0],
          count: parseInt(view.count, 10),
        })),
        likesCount,
        commentsCount,
        sharesCount,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting photo analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return {
        totalViews: 0,
        topCountries: [],
        viewsOverTime: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
      };
    }
  }

  // #########################################################
  // ANALYTICS CALCULATION METHODS
  // #########################################################

  /**
   * Calculate and update user analytics from tracking/interaction data
   */
  async calculateUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      // Get or upload user analytics
      let userAnalytics = await this.userAnalyticsRepository.findOne({
        where: { userId },
      });

      if (!userAnalytics) {
        userAnalytics = this.userAnalyticsRepository.create({ userId });
      }

      // Calculate views from ViewTrack
      const viewsCount = await this.viewTrackRepository.count({
        where: {
          userId,
          resourceType: ResourceType.PROFILE,
        },
      });

      // Calculate followers and following from Follow entity
      const followersCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('account.userFollow', 'follow')
        .where('follow.followingId = :userId', { userId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      const followingCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('account.userFollow', 'follow')
        .where('follow.followerId = :userId', { userId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate posts count
      const postsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.post', 'post')
        .where('post.userId = :userId', { userId })
        .andWhere('post.dateDeleted IS NULL')
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate videos count
      const videosCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('account.userVideo', 'video')
        .where('video.userId = :userId', { userId })
        .andWhere('video.dateDeleted IS NULL')
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate comments count
      const commentsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialComment', 'comment')
        .where('comment.userId = :userId', { userId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate likes received (likes on user's posts)
      const likesReceivedCount = await this.dataSource
        .query(
          `SELECT COUNT(*) as count
           FROM social."socialLike" "like"
           INNER JOIN social.post "post" ON "post".id = "like"."resourceId"
           WHERE "post"."userId" = $1 AND "like"."resourceType" = 'post' AND "like"."resourceId" IS NOT NULL`,
          [userId],
        )
        .then((result) => parseInt(result[0]?.count || '0', 10));

      // Calculate shares received (shares of user's posts)
      const sharesReceivedCount = await this.dataSource
        .query(
          `SELECT COUNT(*) as count
           FROM social."socialShare" "share"
           INNER JOIN social.post "post" ON "post".id = "share"."resourceId"
           WHERE "post"."userId" = $1 AND "share"."resourceType" = 'post'`,
          [userId],
        )
        .then((result) => parseInt(result[0]?.count || '0', 10));

      // Update analytics
      userAnalytics.viewsCount = viewsCount;
      userAnalytics.followersCount = followersCount;
      userAnalytics.followingCount = followingCount;
      userAnalytics.postsCount = postsCount;
      userAnalytics.videosCount = videosCount;
      userAnalytics.commentsCount = commentsCount;
      userAnalytics.likesReceivedCount = likesReceivedCount;
      userAnalytics.sharesReceivedCount = sharesReceivedCount;
      userAnalytics.lastCalculatedAt = new Date();

      return await this.userAnalyticsRepository.save(userAnalytics);
    } catch (error) {
      this.loggingService.error(
        'Error calculating user analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      throw error;
    }
  }

  /**
   * Calculate and update post analytics from tracking/interaction data
   */
  async calculatePostAnalytics(postId: string): Promise<PostAnalytics> {
    try {
      // Get or upload post analytics
      let postAnalytics = await this.postAnalyticsRepository.findOne({
        where: { postId },
      });

      if (!postAnalytics) {
        postAnalytics = this.postAnalyticsRepository.create({ postId });
      }

      // Calculate views from ViewTrack
      const viewsCount = await this.viewTrackRepository.count({
        where: {
          resourceType: ResourceType.POST,
          resourceId: postId,
        },
      });

      // Calculate likes count
      const likesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialLike', 'like')
        .where('like.resourceType = :resourceType', { resourceType: 'post' })
        .andWhere('like.resourceId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate comments count
      const commentsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialComment', 'comment')
        .where('comment.resourceType = :resourceType', { resourceType: 'post' })
        .andWhere('comment.resourceId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate shares count
      const sharesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialShare', 'share')
        .where('share.resourceType = :resourceType', { resourceType: 'post' })
        .andWhere('share.resourceId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate bookmarks count
      const bookmarksCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.postBookmark', 'bookmark')
        .where('bookmark.postId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate reports count
      const reportsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.postReport', 'report')
        .where('report.postId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate reactions count
      const reactionsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.postReaction', 'reaction')
        .where('reaction.postId = :postId', { postId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate total engagements and engagement rate
      const totalEngagements = likesCount + commentsCount + sharesCount + reactionsCount;
      const engagementRate =
        viewsCount > 0 ? (totalEngagements / viewsCount) * 100 : 0;

      // Update analytics
      postAnalytics.viewsCount = viewsCount;
      postAnalytics.likesCount = likesCount;
      postAnalytics.commentsCount = commentsCount;
      postAnalytics.sharesCount = sharesCount;
      postAnalytics.bookmarksCount = bookmarksCount;
      postAnalytics.reportsCount = reportsCount;
      postAnalytics.reactionsCount = reactionsCount;
      postAnalytics.totalEngagements = totalEngagements;
      postAnalytics.engagementRate = Math.round(engagementRate * 100) / 100;
      postAnalytics.lastCalculatedAt = new Date();

      return await this.postAnalyticsRepository.save(postAnalytics);
    } catch (error) {
      this.loggingService.error(
        'Error calculating post analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { postId },
        },
      );
      throw error;
    }
  }

  /**
   * Calculate and update video analytics from tracking/interaction data
   */
  async calculateVideoAnalytics(videoId: string): Promise<VideoAnalytics> {
    try {
      // Get or upload video analytics
      let videoAnalytics = await this.videoAnalyticsRepository.findOne({
        where: { videoId },
      });

      if (!videoAnalytics) {
        videoAnalytics = this.videoAnalyticsRepository.create({ videoId });
      }

      // Calculate views from ViewTrack
      const viewsCount = await this.viewTrackRepository.count({
        where: {
          resourceType: ResourceType.VIDEO,
          resourceId: videoId,
        },
      });

      // Calculate likes count
      const likesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialLike', 'like')
        .where('like.resourceType = :resourceType', {
          resourceType: 'video',
        })
        .andWhere('like.resourceId = :videoId', { videoId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate comments count
      const commentsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialComment', 'comment')
        .where('comment.resourceType = :resourceType', {
          resourceType: 'video',
        })
        .andWhere('comment.resourceId = :videoId', { videoId })
        .andWhere('comment.dateDeleted IS NULL')
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate shares count
      const sharesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialShare', 'share')
        .where('share.resourceType = :resourceType', {
          resourceType: 'video',
        })
        .andWhere('share.resourceId = :videoId', { videoId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // TODO: Calculate watch time from VideoWatch entity when implemented
      const totalWatchTime = 0;
      const averageWatchTime = viewsCount > 0 ? totalWatchTime / viewsCount : 0;
      const completionRate = 0; // TODO: Calculate from VideoWatch entity

      // Update analytics
      videoAnalytics.viewsCount = viewsCount;
      videoAnalytics.likesCount = likesCount;
      videoAnalytics.commentsCount = commentsCount;
      videoAnalytics.sharesCount = sharesCount;
      videoAnalytics.totalWatchTime = totalWatchTime;
      videoAnalytics.averageWatchTime = Math.round(averageWatchTime * 100) / 100;
      videoAnalytics.completionRate = completionRate;
      videoAnalytics.lastCalculatedAt = new Date();

      return await this.videoAnalyticsRepository.save(videoAnalytics);
    } catch (error) {
      this.loggingService.error(
        'Error calculating video analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { videoId },
        },
      );
      throw error;
    }
  }

  /**
   * Get user analytics (calculate if not exists or stale)
   */
  async getUserAnalytics(userId: string, forceRecalculate = false): Promise<UserAnalytics> {
    const existing = await this.userAnalyticsRepository.findOne({
      where: { userId },
    });

    // Recalculate if forced or if analytics don't exist or are older than 1 hour
    if (forceRecalculate || !existing) {
      return this.calculateUserAnalytics(userId);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existing.lastCalculatedAt < oneHourAgo) {
      // Recalculate in background, return existing for now
      this.calculateUserAnalytics(userId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating user analytics in background',
          error instanceof Error ? error.stack : undefined,
          'AnalyticsService',
        );
      });
    }

    return existing;
  }

  /**
   * Get post analytics (calculate if not exists or stale)
   */
  async getPostAnalytics(postId: string, forceRecalculate = false): Promise<PostAnalytics> {
    const existing = await this.postAnalyticsRepository.findOne({
      where: { postId },
    });

    // Recalculate if forced or if analytics don't exist or are older than 1 hour
    if (forceRecalculate || !existing) {
      return this.calculatePostAnalytics(postId);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existing.lastCalculatedAt < oneHourAgo) {
      // Recalculate in background, return existing for now
      this.calculatePostAnalytics(postId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating post analytics in background',
          error instanceof Error ? error.stack : undefined,
          'AnalyticsService',
        );
      });
    }

    return existing;
  }

  /**
   * Get video analytics (calculate if not exists or stale)
   */
  async getVideoAnalytics(videoId: string, forceRecalculate = false): Promise<VideoAnalytics> {
    const existing = await this.videoAnalyticsRepository.findOne({
      where: { videoId },
    });

    // Recalculate if forced or if analytics don't exist or are older than 1 hour
    if (forceRecalculate || !existing) {
      return this.calculateVideoAnalytics(videoId);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existing.lastCalculatedAt < oneHourAgo) {
      // Recalculate in background, return existing for now
      this.calculateVideoAnalytics(videoId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating video analytics in background',
          error instanceof Error ? error.stack : undefined,
          'AnalyticsService',
        );
      });
    }

    return existing;
  }

  /**
   * Calculate and update photo analytics from tracking/interaction data
   */
  async calculatePhotoAnalytics(photoId: string): Promise<PhotoAnalytics> {
    try {
      // Get or create photo analytics
      let photoAnalytics = await this.photoAnalyticsRepository.findOne({
        where: { photoId },
      });

      if (!photoAnalytics) {
        photoAnalytics = this.photoAnalyticsRepository.create({ photoId });
      }

      // Calculate views from ViewTrack
      const viewsCount = await this.viewTrackRepository.count({
        where: {
          resourceType: ResourceType.PHOTO,
          resourceId: photoId,
        },
      });

      // Calculate likes count
      const likesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialLike', 'like')
        .where('like.resourceType = :resourceType', {
          resourceType: 'photo',
        })
        .andWhere('like.resourceId = :photoId', { photoId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate comments count
      const commentsCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialComment', 'comment')
        .where('comment.resourceType = :resourceType', {
          resourceType: 'photo',
        })
        .andWhere('comment.resourceId = :photoId', { photoId })
        .andWhere('comment.dateDeleted IS NULL')
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Calculate shares count
      const sharesCount = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('social.socialShare', 'share')
        .where('share.resourceType = :resourceType', {
          resourceType: 'photo',
        })
        .andWhere('share.resourceId = :photoId', { photoId })
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10));

      // Update analytics
      photoAnalytics.viewsCount = viewsCount;
      photoAnalytics.likesCount = likesCount;
      photoAnalytics.commentsCount = commentsCount;
      photoAnalytics.sharesCount = sharesCount;
      photoAnalytics.lastCalculatedAt = new Date();

      return await this.photoAnalyticsRepository.save(photoAnalytics);
    } catch (error) {
      this.loggingService.error(
        'Error calculating photo analytics',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { photoId },
        },
      );
      throw error;
    }
  }

  /**
   * Get photo analytics (calculate if not exists or stale)
   */
  async getPhotoAnalytics(photoId: string, forceRecalculate = false): Promise<PhotoAnalytics> {
    const existing = await this.photoAnalyticsRepository.findOne({
      where: { photoId },
    });

    // Recalculate if forced or if analytics don't exist or are older than 1 hour
    if (forceRecalculate || !existing) {
      return this.calculatePhotoAnalytics(photoId);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existing.lastCalculatedAt < oneHourAgo) {
      // Recalculate in background, return existing for now
      this.calculatePhotoAnalytics(photoId).catch((error: unknown) => {
        this.loggingService.error(
          'Error recalculating photo analytics in background',
          error instanceof Error ? error.stack : undefined,
          'AnalyticsService',
        );
      });
    }

    return existing;
  }

  /**
   * Get user's liked posts
   * Uses DataSource to query Like entity directly (no repository injection needed)
   */
  async getUserLikedPosts(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<any>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const skip = (page - 1) * limit;

      // Query likes using DataSource
      const likesQuery = `
        SELECT 
          l."resourceId" as "postId",
          l."dateCreated" as "likedAt"
        FROM social."socialLike" l
        WHERE l."userId" = $1 
          AND l."resourceType" = 'post'
          AND l."resourceId" IS NOT NULL
        ORDER BY l."dateCreated" DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as count
        FROM social."socialLike" l
        WHERE l."userId" = $1 
          AND l."resourceType" = 'post'
          AND l."resourceId" IS NOT NULL
      `;

      const [likes, countResult] = await Promise.all([
        this.dataSource.query(likesQuery, [userId, limit, skip]),
        this.dataSource.query(countQuery, [userId]),
      ]);

      const total = parseInt(countResult[0]?.count || '0', 10);
      const postIds = likes.map((l: any) => l.postId).filter((id: string) => id !== null);

      // Query posts using DataSource
      let posts: any[] = [];
      if (postIds.length > 0) {
        const postsQuery = `
          SELECT 
            p.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'displayName', u."displayName",
              'email', u.email,
              'role', u.role,
              'isPublic', u."isPublic",
              'websocketId', u."websocketId",
              'profile', json_build_object(
                'id', pr.id,
                'firstName', pr."firstName",
                'lastName', pr."lastName",
                'bio', pr.bio,
                'location', pr.location,
                'website', pr.website,
                'dateOfBirth', pr."dateOfBirth",
                'avatar', pr.avatar,
                'cover', pr.cover,
                'banner', pr.banner,
                'offline', pr.offline,
                'chat', pr.chat
              )
            )::json as user
          FROM social.post p
          INNER JOIN account."user" u ON u.id = p."userId"
          LEFT JOIN account."userProfile" pr ON pr."profileId" = u.id
          WHERE p.id = ANY($1::uuid[])
            AND p."dateDeleted" IS NULL
        `;
        const rawPosts = await this.dataSource.query(postsQuery, [postIds]);
        
        // Parse JSON user field and format posts
        posts = rawPosts.map((row: any) => {
          const post = { ...row };
          // Parse the user JSON if it's a string
          if (typeof post.user === 'string') {
            post.user = JSON.parse(post.user);
          }
          return post;
        });
      }

      // Query bookmarks using DataSource
      let userBookmarks: Set<string> = new Set();
      if (posts.length > 0) {
        const bookmarkIds = posts.map((p: any) => p.id);
        const bookmarksQuery = `
          SELECT "postId"
          FROM social."postBookmark"
          WHERE "userId" = $1 
            AND "postId" = ANY($2::uuid[])
        `;
        const bookmarks = await this.dataSource.query(bookmarksQuery, [userId, bookmarkIds]);
        userBookmarks = new Set(bookmarks.map((b: any) => b.postId));
      }

      // Format posts with like and bookmark status
      const postsWithLikes = posts.map((post: any) => ({
        ...post,
        isLiked: true,
        isBookmarked: userBookmarks.has(post.id),
      }));

      const totalPages = Math.ceil(total / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: postsWithLikes,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting user liked posts',
        error instanceof Error ? error.stack : undefined,
        'AnalyticsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get user liked posts');
    }
  }
}
