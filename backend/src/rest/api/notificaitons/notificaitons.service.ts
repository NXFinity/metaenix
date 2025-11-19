import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './assets/entities/notification.entity';
import { User } from '../users/assets/entities/user.entity';
import { CreateNotificationDto } from './assets/dto/create-notification.dto';
import { UpdateNotificationDto } from './assets/dto/update-notification.dto';
import { MarkAllReadDto } from './assets/dto/mark-all-read.dto';
import { NotificationType } from './assets/enum/notification-type.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
  ) {}

  onModuleInit() {
    // Ensure service is initialized and event listeners are registered
    this.logger.log('NotificationsService initialized - event listeners registered');
  }

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    createDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create notification
      const notification = this.notificationRepository.create({
        userId,
        type: createDto.type,
        title: createDto.title,
        message: createDto.message || null,
        metadata: createDto.metadata || null,
        relatedUserId: createDto.relatedUserId || null,
        relatedPostId: createDto.relatedPostId || null,
        relatedCommentId: createDto.relatedCommentId || null,
        actionUrl: createDto.actionUrl || null,
        isRead: false,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:notifications`);

      this.loggingService.log('Notification created and persisted', 'NotificationsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          notificationId: savedNotification.id,
          type: savedNotification.type,
        },
      });

      return savedNotification;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error creating notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { createDto },
        },
      );

      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async getNotifications(
    userId: string,
    paginationDto: PaginationDto,
    filters?: {
      type?: NotificationType;
      isRead?: boolean;
    },
  ): Promise<PaginationResponse<Notification>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';

      // Build query
      const queryBuilder = this.notificationRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .andWhere('notification.dateDeleted IS NULL') // Exclude soft-deleted notifications
        .orderBy(`notification.${sortBy}`, sortOrder)
        .skip(skip)
        .take(limit);

      // Apply filters
      if (filters?.type) {
        queryBuilder.andWhere('notification.type = :type', { type: filters.type });
      }

      if (filters?.isRead !== undefined) {
        queryBuilder.andWhere('notification.isRead = :isRead', {
          isRead: filters.isRead,
        });
      }

      const [notifications, total] = await queryBuilder.getManyAndCount();

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      };

      return {
        data: notifications,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting notifications',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get notifications');
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const cacheKey = `notifications:unread:${userId}`;

      // Try cache first
      const cached = await this.cachingService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const count = await this.notificationRepository.count({
        where: {
          userId,
          isRead: false,
          dateDeleted: IsNull(),
        },
      });

      // Cache for 1 minute
      await this.cachingService.set(cacheKey, count, { ttl: 60 });

      return count;
    } catch (error) {
      this.loggingService.error(
        'Error getting unread count',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      return 0; // Return 0 on error to prevent UI issues
    }
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: {
          id: notificationId,
          userId,
          dateDeleted: IsNull(),
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { notificationId },
        },
      );

      throw new InternalServerErrorException('Failed to get notification');
    }
  }

  /**
   * Update a notification (e.g., mark as read)
   */
  async updateNotification(
    userId: string,
    notificationId: string,
    updateDto: UpdateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = await this.getNotificationById(userId, notificationId);

      // Update fields
      if (updateDto.isRead !== undefined) {
        notification.isRead = updateDto.isRead;
        if (updateDto.isRead && !notification.readAt) {
          notification.readAt = new Date();
        } else if (!updateDto.isRead) {
          notification.readAt = null;
        }
      }

      const updatedNotification = await this.notificationRepository.save(notification);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:notifications`);

      this.loggingService.log('Notification updated', 'NotificationsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          notificationId: updatedNotification.id,
          isRead: updatedNotification.isRead,
        },
      });

      return updatedNotification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error updating notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { notificationId, updateDto },
        },
      );

      throw new InternalServerErrorException('Failed to update notification');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
    markAllReadDto?: MarkAllReadDto,
  ): Promise<{ count: number }> {
    try {
      const updateData: any = {
        isRead: true,
        readAt: new Date(),
      };

      const where: any = {
        userId,
        isRead: false,
        dateDeleted: IsNull(),
      };

      // If type is specified, only mark that type as read
      if (markAllReadDto?.type) {
        where.type = markAllReadDto.type;
      }

      const result = await this.notificationRepository.update(where, updateData);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:notifications`);

      this.loggingService.log('All notifications marked as read', 'NotificationsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          count: result.affected || 0,
          type: markAllReadDto?.type,
        },
      });

      return {
        count: result.affected || 0,
      };
    } catch (error) {
      this.loggingService.error(
        'Error marking all as read',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to mark all as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    try {
      const notification = await this.getNotificationById(userId, notificationId);

      // Use softRemove for soft delete (sets dateDeleted)
      await this.notificationRepository.softRemove(notification);

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:notifications`);

      this.loggingService.log('Notification deleted', 'NotificationsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: { notificationId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error deleting notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { notificationId },
        },
      );

      throw new InternalServerErrorException('Failed to delete notification');
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<{ count: number }> {
    try {
      // Use softDelete for soft delete (sets dateDeleted) - only delete non-soft-deleted read notifications
      const result = await this.notificationRepository
        .createQueryBuilder()
        .softDelete()
        .where('userId = :userId', { userId })
        .andWhere('isRead = :isRead', { isRead: true })
        .andWhere('dateDeleted IS NULL') // Only delete notifications that aren't already soft-deleted
        .execute();

      // Invalidate cache
      await this.cachingService.invalidateByTags(`user:${userId}:notifications`);

      this.loggingService.log('All read notifications deleted', 'NotificationsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId,
        metadata: {
          count: result.affected || 0,
        },
      });

      return {
        count: result.affected || 0,
      };
    } catch (error) {
      this.loggingService.error(
        'Error deleting all read notifications',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to delete all read notifications');
    }
  }

  /**
   * Handle user.followed event from FollowsService
   * Persists notification to database when a user follows another user
   * Note: Real-time WebSocket alerts are sent by FollowsGateway, this only persists data
   */
  @OnEvent('user.followed')
  async handleUserFollowed(payload: {
    followerId: string;
    followingId: string;
  }): Promise<void> {
    this.logger.log(
      `Received user.followed event - followerId: ${payload.followerId}, followingId: ${payload.followingId}`,
    );
    
    try {
      // Check user's notification preference
      const user = await this.userRepository.findOne({
        where: { id: payload.followingId },
        relations: ['privacy'],
        select: ['id'],
      });

      if (user?.privacy && user.privacy.notifyOnFollow === false) {
        // User has disabled follow notifications - don't persist
        return;
      }

      // Get follower's information
      const follower = await this.userRepository.findOne({
        where: { id: payload.followerId },
        select: ['id', 'username', 'displayName'],
      });

      if (!follower) {
        this.loggingService.log(
          'Follower not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.followingId,
            metadata: { followerId: payload.followerId },
          },
        );
        return;
      }

      // Persist notification to database
      await this.createNotification(payload.followingId, {
        type: NotificationType.FOLLOW,
        title: 'New Follower',
        message: `${follower.displayName || follower.username} started following you`,
        relatedUserId: payload.followerId,
        actionUrl: `/${follower.username}`,
        metadata: {
          followerUsername: follower.username,
          followerDisplayName: follower.displayName,
        },
      });

      this.loggingService.log(
        'Follow notification persisted',
        'NotificationsService',
        {
          category: LogCategory.USER_MANAGEMENT,
          userId: payload.followingId,
          metadata: {
            followerId: payload.followerId,
            followerUsername: follower.username,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error persisting follow notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId: payload.followingId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            followerId: payload.followerId,
            followingId: payload.followingId,
          },
        },
      );
    }
  }

  /**
   * Handle post.liked event from PostsService
   * Persists notification to database when a post is liked
   * Note: Real-time WebSocket alerts are sent by PostsGateway, this only persists data
   */
  @OnEvent('post.liked')
  async handlePostLiked(payload: {
    likerId: string;
    postId: string;
    postOwnerId: string;
  }): Promise<void> {
    this.logger.log(
      `Received post.liked event - likerId: ${payload.likerId}, postId: ${payload.postId}, postOwnerId: ${payload.postOwnerId}`,
    );

    try {
      // Check user's notification preference (if available in future)
      // For now, we'll persist all post like notifications

      // Get liker's and post owner's information
      const [liker, postOwner] = await Promise.all([
        this.userRepository.findOne({
          where: { id: payload.likerId },
          select: ['id', 'username', 'displayName'],
        }),
        this.userRepository.findOne({
          where: { id: payload.postOwnerId },
          select: ['id', 'username', 'displayName'],
        }),
      ]);

      if (!liker) {
        this.loggingService.log(
          'Liker not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: { likerId: payload.likerId, postId: payload.postId },
          },
        );
        return;
      }

      if (!postOwner) {
        this.loggingService.log(
          'Post owner not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: { postId: payload.postId },
          },
        );
        return;
      }

      // Persist notification to database
      await this.createNotification(payload.postOwnerId, {
        type: NotificationType.POST_LIKE,
        title: 'New Like',
        message: `${liker.displayName || liker.username} liked your post`,
        relatedUserId: payload.likerId,
        relatedPostId: payload.postId,
        actionUrl: `/${postOwner.username}/posts/${payload.postId}`,
        metadata: {
          likerUsername: liker.username,
          likerDisplayName: liker.displayName,
        },
      });

      this.loggingService.log(
        'Post like notification persisted',
        'NotificationsService',
        {
          category: LogCategory.USER_MANAGEMENT,
          userId: payload.postOwnerId,
          metadata: {
            likerId: payload.likerId,
            likerUsername: liker.username,
            postId: payload.postId,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error persisting post like notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId: payload.postOwnerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            likerId: payload.likerId,
            postId: payload.postId,
            postOwnerId: payload.postOwnerId,
          },
        },
      );
    }
  }

  /**
   * Handle post.commented event from PostsService
   * Persists notification to database when a post is commented on
   * Note: Real-time WebSocket alerts are sent by PostsGateway, this only persists data
   */
  @OnEvent('post.commented')
  async handlePostCommented(payload: {
    commenterId: string;
    postId: string;
    commentId: string;
    postOwnerId: string;
    parentCommentId: string | null;
  }): Promise<void> {
    this.logger.log(
      `Received post.commented event - commenterId: ${payload.commenterId}, postId: ${payload.postId}, commentId: ${payload.commentId}, postOwnerId: ${payload.postOwnerId}`,
    );

    try {
      // Check user's notification preference (if available in future)
      // For now, we'll persist all post comment notifications

      // Get commenter's and post owner's information
      const [commenter, postOwner] = await Promise.all([
        this.userRepository.findOne({
          where: { id: payload.commenterId },
          select: ['id', 'username', 'displayName'],
        }),
        this.userRepository.findOne({
          where: { id: payload.postOwnerId },
          select: ['id', 'username', 'displayName'],
        }),
      ]);

      if (!commenter) {
        this.loggingService.log(
          'Commenter not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: {
              commenterId: payload.commenterId,
              postId: payload.postId,
              commentId: payload.commentId,
            },
          },
        );
        return;
      }

      if (!postOwner) {
        this.loggingService.log(
          'Post owner not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: { postId: payload.postId },
          },
        );
        return;
      }

      // Determine notification type based on whether it's a reply to a comment
      const notificationType = payload.parentCommentId
        ? NotificationType.COMMENT_REPLY
        : NotificationType.POST_COMMENT;

      const title = payload.parentCommentId
        ? 'New Reply'
        : 'New Comment';

      const message = payload.parentCommentId
        ? `${commenter.displayName || commenter.username} replied to your comment`
        : `${commenter.displayName || commenter.username} commented on your post`;

      // Persist notification to database
      await this.createNotification(payload.postOwnerId, {
        type: notificationType,
        title,
        message,
        relatedUserId: payload.commenterId,
        relatedPostId: payload.postId,
        relatedCommentId: payload.commentId,
        actionUrl: `/${postOwner.username}/posts/comment/${payload.commentId}`,
        metadata: {
          commenterUsername: commenter.username,
          commenterDisplayName: commenter.displayName,
          parentCommentId: payload.parentCommentId,
        },
      });

      this.loggingService.log(
        'Post comment notification persisted',
        'NotificationsService',
        {
          category: LogCategory.USER_MANAGEMENT,
          userId: payload.postOwnerId,
          metadata: {
            commenterId: payload.commenterId,
            commenterUsername: commenter.username,
            postId: payload.postId,
            commentId: payload.commentId,
            parentCommentId: payload.parentCommentId,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error persisting post comment notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId: payload.postOwnerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            commenterId: payload.commenterId,
            postId: payload.postId,
            commentId: payload.commentId,
            postOwnerId: payload.postOwnerId,
          },
        },
      );
    }
  }

  /**
   * Handle post.shared event from PostsService
   * Persists notification to database when a post is shared
   * Note: Real-time WebSocket alerts are sent by PostsGateway, this only persists data
   */
  @OnEvent('post.shared')
  async handlePostShared(payload: {
    sharerId: string;
    postId: string;
    postOwnerId: string;
    shareId: string;
  }): Promise<void> {
    this.logger.log(
      `Received post.shared event - sharerId: ${payload.sharerId}, postId: ${payload.postId}, postOwnerId: ${payload.postOwnerId}, shareId: ${payload.shareId}`,
    );

    try {
      // Check user's notification preference (if available in future)
      // For now, we'll persist all post share notifications

      // Get sharer's and post owner's information
      const [sharer, postOwner] = await Promise.all([
        this.userRepository.findOne({
          where: { id: payload.sharerId },
          select: ['id', 'username', 'displayName'],
        }),
        this.userRepository.findOne({
          where: { id: payload.postOwnerId },
          select: ['id', 'username', 'displayName'],
        }),
      ]);

      if (!sharer) {
        this.loggingService.log(
          'Sharer not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: {
              sharerId: payload.sharerId,
              postId: payload.postId,
              shareId: payload.shareId,
            },
          },
        );
        return;
      }

      if (!postOwner) {
        this.loggingService.log(
          'Post owner not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.postOwnerId,
            metadata: { postId: payload.postId },
          },
        );
        return;
      }

      // Persist notification to database
      await this.createNotification(payload.postOwnerId, {
        type: NotificationType.POST_SHARE,
        title: 'New Share',
        message: `${sharer.displayName || sharer.username} shared your post`,
        relatedUserId: payload.sharerId,
        relatedPostId: payload.postId,
        actionUrl: `/${postOwner.username}/posts/${payload.postId}`,
        metadata: {
          sharerUsername: sharer.username,
          sharerDisplayName: sharer.displayName,
          shareId: payload.shareId,
        },
      });

      this.loggingService.log(
        'Post share notification persisted',
        'NotificationsService',
        {
          category: LogCategory.USER_MANAGEMENT,
          userId: payload.postOwnerId,
          metadata: {
            sharerId: payload.sharerId,
            sharerUsername: sharer.username,
            postId: payload.postId,
            shareId: payload.shareId,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error persisting post share notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId: payload.postOwnerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            sharerId: payload.sharerId,
            postId: payload.postId,
            shareId: payload.shareId,
            postOwnerId: payload.postOwnerId,
          },
        },
      );
    }
  }

  /**
   * Handle comment.liked event from PostsService
   * Persists notification to database when a comment is liked
   * Note: Real-time WebSocket alerts are sent by PostsGateway, this only persists data
   */
  @OnEvent('comment.liked')
  async handleCommentLiked(payload: {
    likerId: string;
    commentId: string;
    commentOwnerId: string;
    postId: string;
    postOwnerId: string | null;
  }): Promise<void> {
    this.logger.log(
      `Received comment.liked event - likerId: ${payload.likerId}, commentId: ${payload.commentId}, commentOwnerId: ${payload.commentOwnerId}`,
    );

    try {
      // Get liker's and post owner's information
      const [liker, postOwner] = await Promise.all([
        this.userRepository.findOne({
          where: { id: payload.likerId },
          select: ['id', 'username', 'displayName'],
        }),
        payload.postOwnerId
          ? this.userRepository.findOne({
              where: { id: payload.postOwnerId },
              select: ['id', 'username', 'displayName'],
            })
          : null,
      ]);

      if (!liker) {
        this.loggingService.log(
          'Liker not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.commentOwnerId,
            metadata: {
              likerId: payload.likerId,
              commentId: payload.commentId,
            },
          },
        );
        return;
      }

      if (!postOwner) {
        this.loggingService.log(
          'Post owner not found for notification',
          'NotificationsService',
          {
            category: LogCategory.USER_MANAGEMENT,
            userId: payload.commentOwnerId,
            metadata: { postId: payload.postId },
          },
        );
        return;
      }

      // Persist notification to database
      await this.createNotification(payload.commentOwnerId, {
        type: NotificationType.COMMENT_LIKE,
        title: 'New Like',
        message: `${liker.displayName || liker.username} liked your comment`,
        relatedUserId: payload.likerId,
        relatedPostId: payload.postId,
        relatedCommentId: payload.commentId,
        actionUrl: `/${postOwner.username}/posts/comment/${payload.commentId}`,
        metadata: {
          likerUsername: liker.username,
          likerDisplayName: liker.displayName,
        },
      });

      this.loggingService.log(
        'Comment like notification persisted',
        'NotificationsService',
        {
          category: LogCategory.USER_MANAGEMENT,
          userId: payload.commentOwnerId,
          metadata: {
            likerId: payload.likerId,
            likerUsername: liker.username,
            commentId: payload.commentId,
            postId: payload.postId,
          },
        },
      );
    } catch (error) {
      this.loggingService.error(
        'Error persisting comment like notification',
        error instanceof Error ? error.stack : undefined,
        'NotificationsService',
        {
          category: LogCategory.DATABASE,
          userId: payload.commentOwnerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            likerId: payload.likerId,
            commentId: payload.commentId,
            commentOwnerId: payload.commentOwnerId,
            postId: payload.postId,
          },
        },
      );
    }
  }
}
