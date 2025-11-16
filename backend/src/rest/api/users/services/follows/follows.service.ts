import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, Between } from 'typeorm';
import { Follow } from './assets/entities/follow.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { AuditLogService } from '@logging/logging';
import { LogLevel } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { RedisService } from '@redis/redis';
import { FOLLOW_COOLDOWN_SECONDS } from 'src/common/constants/app.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from 'src/common/interfaces/pagination-response.interface';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loggingService: LoggingService,
    private readonly auditLogService: AuditLogService,
    private readonly cachingService: CachingService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // #########################################################
  // FOLLOW OPTIONS
  // #########################################################

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    try {
      // Prevent self-follow
      if (followerId === followingId) {
        throw new BadRequestException('You cannot follow yourself');
      }

      // Check if already following
      const existingFollow = await this.followRepository.findOne({
        where: { followerId, followingId },
      });

      if (existingFollow) {
        throw new BadRequestException('You are already following this user');
      }

      // Verify both users exist
      const [follower, following] = await Promise.all([
        this.userRepository.findOne({ where: { id: followerId } }),
        this.userRepository.findOne({ where: { id: followingId } }),
      ]);

      if (!follower) {
        throw new NotFoundException('Follower user not found');
      }

      if (!following) {
        throw new NotFoundException('User to follow not found');
      }

      // Check cooldown period (prevent follow/unfollow spam)
      const cooldownKey = `follow:cooldown:${followerId}:${followingId}`;
      const cooldownExists = await this.redisService.get(cooldownKey);

      if (cooldownExists) {
        const ttl = await this.redisService.ttl(cooldownKey);
        if (ttl > 0) {
          const minutesRemaining = Math.ceil(ttl / 60);
          throw new BadRequestException(
            `You must wait ${minutesRemaining} minute(s) before following this user again`,
          );
        }
      }

      // Create follow relationship
      const follow = this.followRepository.create({
        followerId,
        followingId,
      });

      const savedFollow = await this.followRepository.save(follow);

      // Update follower and following counts atomically
      await Promise.all([
        this.userRepository.increment({ id: followerId }, 'followingCount', 1),
        this.userRepository.increment({ id: followingId }, 'followersCount', 1),
      ]);

      // Invalidate cache (including follow status and suggestions)
      await this.cachingService.invalidateByTags(
        `user:${followerId}`,
        `user:${followingId}`,
        `user:${followerId}:following`,
        `user:${followingId}:followers`,
      );

      // Invalidate specific follow status cache
      await this.redisService.del(`follow:status:${followerId}:${followingId}`);

      // Invalidate suggestions cache
      await this.redisService.del(`follow:suggestions:${followerId}`);

      this.loggingService.log('User followed', 'FollowsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followerId,
        metadata: { followingId },
      });

      // Emit event for WebSocket notification
      this.eventEmitter.emit('user.followed', {
        followerId,
        followingId,
      });

      return savedFollow;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.loggingService.error(
        'Error following user',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId: followerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { followingId },
        },
      );

      throw new InternalServerErrorException('Failed to follow user');
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      const follow = await this.followRepository.findOne({
        where: { followerId, followingId },
      });

      if (!follow) {
        throw new NotFoundException('You are not following this user');
      }

      await this.followRepository.remove(follow);

      // Set cooldown period to prevent immediate re-follow
      const cooldownKey = `follow:cooldown:${followerId}:${followingId}`;
      await this.redisService.set(cooldownKey, '1', FOLLOW_COOLDOWN_SECONDS);

      // Update follower and following counts atomically
      await Promise.all([
        this.userRepository.decrement({ id: followerId }, 'followingCount', 1),
        this.userRepository.decrement({ id: followingId }, 'followersCount', 1),
      ]);

      // Invalidate cache (including follow status and suggestions)
      await this.cachingService.invalidateByTags(
        `user:${followerId}`,
        `user:${followingId}`,
        `user:${followerId}:following`,
        `user:${followingId}:followers`,
      );

      // Invalidate specific follow status cache
      await this.redisService.del(`follow:status:${followerId}:${followingId}`);

      // Track unfollow event with timestamp for analytics
      this.loggingService.log('User unfollowed', 'FollowsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followerId,
        metadata: {
          followingId,
          action: 'unfollow',
          timestamp: new Date().toISOString(),
          followCreatedAt: follow.dateCreated?.toISOString() || null,
        },
      });

      // Emit event for WebSocket notification
      this.eventEmitter.emit('user.unfollowed', {
        followerId,
        followingId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error unfollowing user',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId: followerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { followingId },
        },
      );

      throw new InternalServerErrorException('Failed to unfollow user');
    }
  }

  /**
   * Check if a user is following another user (with caching)
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const cacheKey = `follow:status:${followerId}:${followingId}`;

      // Try to get from cache first
      const cached = await this.cachingService.get<boolean>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const follow = await this.followRepository.findOne({
        where: { followerId, followingId },
      });

      const isFollowing = !!follow;

      // Cache the result (5 minutes TTL)
      await this.cachingService.set(cacheKey, isFollowing, {
        ttl: 300,
        tags: [
          `user:${followerId}`,
          `user:${followingId}`,
          `user:${followerId}:following`,
        ],
      });

      return isFollowing;
    } catch (error) {
      this.loggingService.error(
        'Error checking follow status',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId: followerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { followingId },
        },
      );

      return false;
    }
  }

  /**
   * Batch check follow status for multiple users
   */
  async batchFollowStatus(
    followerId: string,
    userIds: string[],
  ): Promise<Record<string, boolean>> {
    try {
      if (!userIds || userIds.length === 0) {
        return {};
      }

      // Limit batch size to prevent abuse
      const limitedUserIds = userIds.slice(0, 100);

      // Check cache first for each user
      const cacheKeys = limitedUserIds.map(
        (id) => `follow:status:${followerId}:${id}`,
      );
      const cachedResults: Record<string, boolean> = {};
      const uncachedIds: string[] = [];

      for (let i = 0; i < limitedUserIds.length; i++) {
        const cached = await this.cachingService.get<boolean>(cacheKeys[i]);
        if (cached !== null) {
          cachedResults[limitedUserIds[i]] = cached;
        } else {
          uncachedIds.push(limitedUserIds[i]);
        }
      }

      // Query database for uncached users
      if (uncachedIds.length > 0) {
        const follows = await this.followRepository.find({
          where: {
            followerId,
            followingId: In(uncachedIds),
          },
          select: ['followingId'],
        });

        const followingSet = new Set(follows.map((f) => f.followingId));

        // Cache results and add to response
        for (const userId of uncachedIds) {
          const isFollowing = followingSet.has(userId);
          cachedResults[userId] = isFollowing;

          // Cache the result
          await this.cachingService.set(
            `follow:status:${followerId}:${userId}`,
            isFollowing,
            {
              ttl: 300,
              tags: [
                `user:${followerId}`,
                `user:${userId}`,
                `user:${followerId}:following`,
              ],
            },
          );
        }
      }

      return cachedResults;
    } catch (error) {
      this.loggingService.error(
        'Error batch checking follow status',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId: followerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userIds },
        },
      );

      throw new InternalServerErrorException(
        'Failed to batch check follow status',
      );
    }
  }

  /**
   * Get users that a user is following (who they follow) with search/filter
   */
  async getFollowing(
    userId: string,
    currentUserId?: string,
    paginationDto: PaginationDto & { search?: string } = {},
  ): Promise<
    PaginationResponse<
      User & {
        isFollowing: boolean;
        isFollowedBack?: boolean;
        mutualFollowsCount?: number;
      } & Record<string, any>
    >
  > {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const search = paginationDto.search?.trim();
      const skip = (page - 1) * limit;

      // Validate sortBy field
      const allowedSortFields = ['dateCreated', 'username', 'displayName'];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const queryBuilder = this.followRepository
        .createQueryBuilder('follow')
        .leftJoinAndSelect('follow.following', 'following')
        .leftJoinAndSelect('following.profile', 'profile')
        .where('follow.followerId = :userId', { userId });

      // Add search filter if provided
      if (search) {
        queryBuilder.andWhere(
          '(LOWER(following.username) LIKE LOWER(:search) OR LOWER(following.displayName) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      }

      queryBuilder
        .select([
          'follow.id',
          'follow.dateCreated',
          'following.id',
          'following.username',
          'following.displayName',
          'following.isPublic',
          'following.followersCount',
          'following.followingCount',
          'following.role',
          'following.websocketId',
          'profile.id',
          'profile.avatar',
          'profile.cover',
          'profile.banner',
          'profile.bio',
          'profile.location',
          'profile.website',
        ])
        .orderBy(
          safeSortBy === 'dateCreated'
            ? 'follow.dateCreated'
            : `following.${safeSortBy}`,
          safeSortOrder,
        )
        .skip(skip)
        .take(limit);

      const [follows, total] = await queryBuilder.getManyAndCount();
      const users = follows.map((follow) => follow.following);

      // Check if current user is being followed back (mutual follow detection)
      // Only show mutual follow status if viewing own following list
      let mutualFollows: Set<string> = new Set();
      const mutualFollowsCounts: Map<string, number> = new Map();

      if (users.length > 0) {
        const userIds = users.map((u) => u.id);

        // Get mutual follows for current user (if viewing own list)
        if (currentUserId === userId) {
          const mutualFollowsData = await this.followRepository.find({
            where: {
              followerId: In(userIds),
              followingId: userId,
            },
          });
          mutualFollows = new Set(mutualFollowsData.map((f) => f.followerId));
        }

        // Calculate mutual follow counts for each user (optimized batch query)
        // Count how many of the current user's following also follow each suggested user
        if (currentUserId && users.length > 0) {
          const currentUserFollowing = await this.followRepository.find({
            where: { followerId: currentUserId },
            select: ['followingId'],
          });
          const currentUserFollowingIds = Array.from(
            new Set(currentUserFollowing.map((f) => f.followingId)),
          );

          if (currentUserFollowingIds.length > 0) {
            const targetUserIds = users.map((u) => u.id);

            // Batch query: get all follows from currentUserFollowingIds to targetUserIds
            const mutualConnectionsData = await this.followRepository
              .createQueryBuilder('follow')
              .where('follow.followerId IN (:...followingIds)', {
                followingIds: currentUserFollowingIds,
              })
              .andWhere('follow.followingId IN (:...targetUserIds)', {
                targetUserIds,
              })
              .select(['follow.followerId', 'follow.followingId'])
              .getMany();

            // Count mutual connections per target user
            const connectionCounts = new Map<string, number>();
            for (const connection of mutualConnectionsData) {
              const count = connectionCounts.get(connection.followingId) || 0;
              connectionCounts.set(connection.followingId, count + 1);
            }

            // Set mutual follow counts
            for (const targetUser of users) {
              mutualFollowsCounts.set(
                targetUser.id,
                connectionCounts.get(targetUser.id) || 0,
              );
            }
          }
        }
      }

      // Add isFollowing flag (always true), isFollowedBack flag, and mutualFollowsCount
      const usersWithFollowing = users.map((user) => ({
        ...user,
        isFollowing: true,
        ...(currentUserId === userId && {
          isFollowedBack: mutualFollows.has(user.id),
        }),
        ...(currentUserId && {
          mutualFollowsCount: mutualFollowsCounts.get(user.id) || 0,
        }),
      })) as (User & {
        isFollowing: boolean;
        isFollowedBack?: boolean;
        mutualFollowsCount?: number;
      } & Record<string, any>)[];

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
        data: usersWithFollowing,
        meta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting following list',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get following list');
    }
  }

  /**
   * Get followers of a user (who follows them) with search/filter
   */
  async getFollowers(
    userId: string,
    currentUserId?: string,
    paginationDto: PaginationDto & { search?: string } = {},
  ): Promise<
    PaginationResponse<
      User & { isFollowing: boolean; mutualFollowsCount?: number } & Record<
          string,
          any
        >
    >
  > {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const search = paginationDto.search?.trim();
      const skip = (page - 1) * limit;

      // Validate sortBy field
      const allowedSortFields = ['dateCreated', 'username', 'displayName'];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      const queryBuilder = this.followRepository
        .createQueryBuilder('follow')
        .leftJoinAndSelect('follow.follower', 'follower')
        .leftJoinAndSelect('follower.profile', 'profile')
        .where('follow.followingId = :userId', { userId });

      // Add search filter if provided
      if (search) {
        queryBuilder.andWhere(
          '(LOWER(follower.username) LIKE LOWER(:search) OR LOWER(follower.displayName) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      }

      queryBuilder
        .select([
          'follow.id',
          'follow.dateCreated',
          'follower.id',
          'follower.username',
          'follower.displayName',
          'follower.isPublic',
          'follower.followersCount',
          'follower.followingCount',
          'follower.role',
          'follower.websocketId',
          'profile.id',
          'profile.avatar',
          'profile.cover',
          'profile.banner',
          'profile.bio',
          'profile.location',
          'profile.website',
        ])
        .orderBy(
          safeSortBy === 'dateCreated'
            ? 'follow.dateCreated'
            : `follower.${safeSortBy}`,
          safeSortOrder,
        )
        .skip(skip)
        .take(limit);

      const [follows, total] = await queryBuilder.getManyAndCount();
      const followers = follows.map((follow) => follow.follower);

      // Check if current user is following each follower (for mutual follow detection)
      let currentUserFollowing: Set<string> = new Set();
      const mutualFollowsCounts: Map<string, number> = new Map();

      if (currentUserId && followers.length > 0) {
        const followerIds = followers.map((f) => f.id);
        const currentUserFollows = await this.followRepository.find({
          where: {
            followerId: currentUserId,
            followingId: In(followerIds),
          },
        });
        currentUserFollowing = new Set(
          currentUserFollows.map((f) => f.followingId),
        );

        // Calculate mutual follow counts for each follower
        // Count how many of the current user's following also follow each follower
        const currentUserFollowingList = await this.followRepository.find({
          where: { followerId: currentUserId },
          select: ['followingId'],
        });
        const currentUserFollowingIds = Array.from(
          new Set(currentUserFollowingList.map((f) => f.followingId)),
        );

        if (currentUserFollowingIds.length > 0) {
          // Batch query: get all follows from currentUserFollowingIds to followerIds
          const mutualConnectionsData = await this.followRepository
            .createQueryBuilder('follow')
            .where('follow.followerId IN (:...followingIds)', {
              followingIds: currentUserFollowingIds,
            })
            .andWhere('follow.followingId IN (:...followerIds)', {
              followerIds,
            })
            .select(['follow.followerId', 'follow.followingId'])
            .getMany();

          // Count mutual connections per follower
          const connectionCounts = new Map<string, number>();
          for (const connection of mutualConnectionsData) {
            const count = connectionCounts.get(connection.followingId) || 0;
            connectionCounts.set(connection.followingId, count + 1);
          }

          // Set mutual follow counts
          for (const follower of followers) {
            mutualFollowsCounts.set(
              follower.id,
              connectionCounts.get(follower.id) || 0,
            );
          }
        }
      }

      // Add isFollowing flag and mutualFollowsCount
      const followersWithFollowing = followers.map((follower) => ({
        ...follower,
        isFollowing: currentUserId
          ? currentUserFollowing.has(follower.id)
          : false,
        ...(currentUserId && {
          mutualFollowsCount: mutualFollowsCounts.get(follower.id) || 0,
        }),
      })) as (User & {
        isFollowing: boolean;
        mutualFollowsCount?: number;
      } & Record<string, any>)[];

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
        data: followersWithFollowing,
        meta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting followers list',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get followers list');
    }
  }

  /**
   * Get follow count statistics for a user
   */
  async getFollowStats(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'followersCount', 'followingCount'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting follow stats',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get follow stats');
    }
  }

  /**
   * Get follow suggestions based on mutual connections
   */
  async getFollowSuggestions(
    userId: string,
    limit: number = 10,
  ): Promise<User[]> {
    try {
      // Limit suggestions to prevent abuse
      const safeLimit = Math.min(limit, 50);

      // Check cache first
      const cacheKey = `follow:suggestions:${userId}`;
      const cached = await this.cachingService.get<User[]>(cacheKey);
      if (cached !== null && cached.length > 0) {
        return cached.slice(0, safeLimit);
      }

      // Get users that the current user is following
      const following = await this.followRepository.find({
        where: { followerId: userId },
        select: ['followingId'],
      });

      const followingIds = following.map((f) => f.followingId);

      let suggestions: User[];

      if (followingIds.length === 0) {
        // If user follows no one, suggest popular users
        suggestions = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.profile', 'profile')
          .where('user.id != :userId', { userId })
          .andWhere('user.isPublic = :isPublic', { isPublic: true })
          .select([
            'user.id',
            'user.username',
            'user.displayName',
            'user.isPublic',
            'user.followersCount',
            'user.followingCount',
            'profile.id',
            'profile.avatar',
            'profile.bio',
          ])
          .orderBy('user.followersCount', 'DESC')
          .take(safeLimit)
          .getMany();
      } else {
        // Limit query scope for users with many followers (optimization)
        const maxFollowingToCheck = Math.min(followingIds.length, 100);

        // Get users followed by people the current user follows (mutual connections)
        const mutualConnections = await this.followRepository
          .createQueryBuilder('follow')
          .where('follow.followerId IN (:...followingIds)', {
            followingIds: followingIds.slice(0, maxFollowingToCheck),
          })
          .andWhere('follow.followingId != :userId', { userId })
          .select(['follow.followingId'])
          .getMany();

        // Count how many mutual connections each user has
        const userConnectionCounts = new Map<string, number>();
        mutualConnections.forEach((follow) => {
          const count = userConnectionCounts.get(follow.followingId) || 0;
          userConnectionCounts.set(follow.followingId, count + 1);
        });

        // Get users already being followed to exclude them
        const alreadyFollowing = new Set(followingIds);
        alreadyFollowing.add(userId); // Exclude self

        // Sort by mutual connection count and get top suggestions
        const sortedSuggestions = Array.from(userConnectionCounts.entries())
          .filter(([suggestedUserId]) => !alreadyFollowing.has(suggestedUserId))
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, safeLimit)
          .map(([suggestedUserId]) => suggestedUserId);

        if (sortedSuggestions.length === 0) {
          suggestions = [];
        } else {
          // Fetch full user data for suggestions
          suggestions = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .where('user.id IN (:...userIds)', { userIds: sortedSuggestions })
            .select([
              'user.id',
              'user.username',
              'user.displayName',
              'user.isPublic',
              'user.followersCount',
              'user.followingCount',
              'profile.id',
              'profile.avatar',
              'profile.bio',
            ])
            .getMany();

          // Sort to maintain mutual connection order
          suggestions = suggestions.sort((a, b) => {
            const indexA = sortedSuggestions.indexOf(a.id);
            const indexB = sortedSuggestions.indexOf(b.id);
            return indexA - indexB;
          });
        }
      }

      // Cache suggestions for 5 minutes
      await this.cachingService.set(cacheKey, suggestions, {
        ttl: 300,
        tags: [`user:${userId}`, `user:${userId}:following`],
      });

      return suggestions;
    } catch (error) {
      this.loggingService.error(
        'Error getting follow suggestions',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException(
        'Failed to get follow suggestions',
      );
    }
  }

  /**
   * Get follow analytics for a user
   */
  async getFollowAnalytics(userId: string): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    newFollowersLast7Days: number;
    newFollowersLast30Days: number;
    unfollowsLast7Days: number;
    unfollowsLast30Days: number;
    topFollowers: Array<{
      userId: string;
      username: string;
      displayName: string;
    }>;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'followersCount', 'followingCount'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get new followers in last 7 and 30 days
      const [newFollowers7Days, newFollowers30Days] = await Promise.all([
        this.followRepository.count({
          where: {
            followingId: userId,
            dateCreated: MoreThanOrEqual(sevenDaysAgo),
          },
        }),
        this.followRepository.count({
          where: {
            followingId: userId,
            dateCreated: MoreThanOrEqual(thirtyDaysAgo),
          },
        }),
      ]);

      // Get unfollows from audit logs
      const unfollowLogs = await this.auditLogService.findWithFilters({
        userId: userId,
        category: LogCategory.USER_MANAGEMENT,
        level: LogLevel.INFO,
        startDate: thirtyDaysAgo,
        limit: 1000, // Get enough logs to count unfollows
      });

      // Filter and count unfollows in time periods
      let unfollows7Days = 0;
      let unfollows30Days = 0;

      for (const log of unfollowLogs) {
        if (
          log.metadata &&
          typeof log.metadata === 'object' &&
          log.metadata.action === 'unfollow'
        ) {
          const logDate = log.dateCreated;
          if (logDate >= sevenDaysAgo) {
            unfollows7Days++;
          }
          if (logDate >= thirtyDaysAgo) {
            unfollows30Days++;
          }
        }
      }

      // Get top followers (users who follow this user and have most followers themselves)
      const topFollowers = await this.followRepository
        .createQueryBuilder('follow')
        .leftJoinAndSelect('follow.follower', 'follower')
        .where('follow.followingId = :userId', { userId })
        .select([
          'follower.id',
          'follower.username',
          'follower.displayName',
          'follower.followersCount',
        ])
        .orderBy('follower.followersCount', 'DESC')
        .take(10)
        .getMany();

      return {
        totalFollowers: user.followersCount || 0,
        totalFollowing: user.followingCount || 0,
        newFollowersLast7Days: newFollowers7Days,
        newFollowersLast30Days: newFollowers30Days,
        unfollowsLast7Days: unfollows7Days,
        unfollowsLast30Days: unfollows30Days,
        topFollowers: topFollowers.map((f) => ({
          userId: f.follower.id,
          username: f.follower.username,
          displayName: f.follower.displayName,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting follow analytics',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get follow analytics');
    }
  }

  /**
   * Clear cooldown for a specific follow relationship (admin only)
   */
  async clearCooldown(followerId: string, followingId: string): Promise<void> {
    try {
      const cooldownKey = `follow:cooldown:${followerId}:${followingId}`;
      await this.redisService.del(cooldownKey);

      this.loggingService.log('Follow cooldown cleared', 'FollowsService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followerId,
        metadata: { followingId, action: 'clear_cooldown' },
      });
    } catch (error) {
      this.loggingService.error(
        'Error clearing cooldown',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId: followerId,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { followingId },
        },
      );

      throw new InternalServerErrorException('Failed to clear cooldown');
    }
  }

  // #########################################################
  // EXPORT FUNCTIONALITY
  // #########################################################

  /**
   * Export followers list as CSV or JSON
   */
  async exportFollowers(
    userId: string,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    try {
      const follows = await this.followRepository.find({
        where: { followingId: userId },
        relations: ['follower', 'follower.profile'],
        order: { dateCreated: 'DESC' },
      });

      if (format === 'json') {
        return JSON.stringify(
          follows.map((f) => ({
            userId: f.follower.id,
            username: f.follower.username,
            displayName: f.follower.displayName,
            email: f.follower.email,
            followedAt: f.dateCreated.toISOString(),
            bio: f.follower.profile?.bio || '',
            avatar: f.follower.profile?.avatar || '',
          })),
          null,
          2,
        );
      }

      // CSV format
      const headers = [
        'User ID',
        'Username',
        'Display Name',
        'Email',
        'Followed At',
        'Bio',
        'Avatar URL',
      ];
      const rows = follows.map((f) => [
        f.follower.id,
        f.follower.username,
        f.follower.displayName || '',
        f.follower.email || '',
        f.dateCreated.toISOString(),
        (f.follower.profile?.bio || '').replace(/"/g, '""'), // Escape quotes
        f.follower.profile?.avatar || '',
      ]);

      const csvRows = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ];

      return csvRows.join('\n');
    } catch (error) {
      this.loggingService.error(
        'Error exporting followers',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to export followers');
    }
  }

  /**
   * Export following list as CSV or JSON
   */
  async exportFollowing(
    userId: string,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    try {
      const follows = await this.followRepository.find({
        where: { followerId: userId },
        relations: ['following', 'following.profile'],
        order: { dateCreated: 'DESC' },
      });

      if (format === 'json') {
        return JSON.stringify(
          follows.map((f) => ({
            userId: f.following.id,
            username: f.following.username,
            displayName: f.following.displayName,
            email: f.following.email,
            followedAt: f.dateCreated.toISOString(),
            bio: f.following.profile?.bio || '',
            avatar: f.following.profile?.avatar || '',
          })),
          null,
          2,
        );
      }

      // CSV format
      const headers = [
        'User ID',
        'Username',
        'Display Name',
        'Email',
        'Followed At',
        'Bio',
        'Avatar URL',
      ];
      const rows = follows.map((f) => [
        f.following.id,
        f.following.username,
        f.following.displayName || '',
        f.following.email || '',
        f.dateCreated.toISOString(),
        (f.following.profile?.bio || '').replace(/"/g, '""'), // Escape quotes
        f.following.profile?.avatar || '',
      ]);

      const csvRows = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ];

      return csvRows.join('\n');
    } catch (error) {
      this.loggingService.error(
        'Error exporting following',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to export following');
    }
  }

  // #########################################################
  // ENHANCED ANALYTICS
  // #########################################################

  /**
   * Get enhanced follow analytics with growth trends
   */
  async getEnhancedFollowAnalytics(userId: string): Promise<{
    totalFollowers: number;
    totalFollowing: number;
    newFollowersLast7Days: number;
    newFollowersLast30Days: number;
    unfollowsLast7Days: number;
    unfollowsLast30Days: number;
    topFollowers: Array<{
      userId: string;
      username: string;
      displayName: string;
    }>;
    growthTrends: {
      daily: Array<{ date: string; followers: number; following: number }>;
      weekly: Array<{ week: string; followers: number; following: number }>;
    };
    engagementMetrics: {
      averageFollowersPerDay: number;
      averageFollowingPerDay: number;
      followerRetentionRate: number; // Percentage of followers who remain after 30 days
    };
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get basic analytics
      const basicAnalytics = await this.getFollowAnalytics(userId);

      // Get daily growth trends for last 30 days
      const dailyTrends: Array<{
        date: string;
        followers: number;
        following: number;
      }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const [followersCount, followingCount] = await Promise.all([
          this.followRepository.count({
            where: {
              followingId: userId,
              dateCreated: Between(dateStart, dateEnd),
            },
          }),
          this.followRepository.count({
            where: {
              followerId: userId,
              dateCreated: Between(dateStart, dateEnd),
            },
          }),
        ]);

        dailyTrends.push({
          date: dateStart.toISOString().split('T')[0],
          followers: followersCount,
          following: followingCount,
        });
      }

      // Get weekly growth trends for last 12 weeks
      const weeklyTrends: Array<{
        week: string;
        followers: number;
        following: number;
      }> = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        weekEnd.setHours(23, 59, 59, 999);

        const [followersCount, followingCount] = await Promise.all([
          this.followRepository.count({
            where: {
              followingId: userId,
              dateCreated: Between(weekStart, weekEnd),
            },
          }),
          this.followRepository.count({
            where: {
              followerId: userId,
              dateCreated: Between(weekStart, weekEnd),
            },
          }),
        ]);

        weeklyTrends.push({
          week: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
          followers: followersCount,
          following: followingCount,
        });
      }

      // Calculate engagement metrics
      const totalDays = 30;
      const averageFollowersPerDay =
        basicAnalytics.newFollowersLast30Days / totalDays;
      const averageFollowingPerDay = basicAnalytics.totalFollowing / totalDays;

      // Calculate follower retention rate (followers who followed 30+ days ago and still follow)
      const oldFollowers = await this.followRepository.count({
        where: {
          followingId: userId,
          dateCreated: MoreThanOrEqual(ninetyDaysAgo),
        },
      });

      const currentFollowers = user.followersCount || 0;
      const followerRetentionRate =
        oldFollowers > 0 ? (currentFollowers / oldFollowers) * 100 : 100;

      return {
        ...basicAnalytics,
        growthTrends: {
          daily: dailyTrends,
          weekly: weeklyTrends,
        },
        engagementMetrics: {
          averageFollowersPerDay:
            Math.round(averageFollowersPerDay * 100) / 100,
          averageFollowingPerDay:
            Math.round(averageFollowingPerDay * 100) / 100,
          followerRetentionRate: Math.round(followerRetentionRate * 100) / 100,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.loggingService.error(
        'Error getting enhanced follow analytics',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException(
        'Failed to get enhanced follow analytics',
      );
    }
  }

  /**
   * Get follow history/audit log
   */
  async getFollowHistory(
    userId: string,
    paginationDto: PaginationDto = {},
  ): Promise<
    PaginationResponse<{
      type: 'follow' | 'unfollow';
      targetUserId: string;
      targetUsername: string;
      timestamp: Date;
      metadata?: Record<string, any>;
    }>
  > {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 50;
      const skip = (page - 1) * limit;

      // Get follow events from audit logs
      const followLogs = await this.auditLogService.findWithFilters({
        userId,
        category: LogCategory.USER_MANAGEMENT,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        limit: 1000,
      });

      // Combine and format history
      const history: Array<{
        type: 'follow' | 'unfollow';
        targetUserId: string;
        targetUsername: string;
        timestamp: Date;
        metadata?: Record<string, any>;
      }> = [];

      // Process audit logs
      for (const log of followLogs) {
        if (
          log.metadata &&
          typeof log.metadata === 'object' &&
          (log.metadata.action === 'follow' ||
            log.metadata.action === 'unfollow' ||
            log.metadata.followingId ||
            log.metadata.followerId)
        ) {
          const metadata = log.metadata;
          const targetUserId = metadata.followingId || metadata.followerId;

          if (targetUserId) {
            const targetUser = await this.userRepository.findOne({
              where: { id: targetUserId },
              select: ['id', 'username', 'displayName'],
            });

            history.push({
              type: metadata.action === 'unfollow' ? 'unfollow' : 'follow',
              targetUserId,
              targetUsername: targetUser?.username || 'Unknown',
              timestamp: log.dateCreated,
              metadata: {
                logId: log.id,
                ...metadata,
              },
            });
          }
        }
      }

      // Sort by timestamp (newest first) and paginate
      history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const paginatedHistory = history.slice(skip, skip + limit);

      const totalPages = Math.ceil(history.length / limit);
      const meta: PaginationMeta = {
        page,
        limit,
        total: history.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: paginatedHistory,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting follow history',
        error instanceof Error ? error.stack : undefined,
        'FollowsService',
        {
          category: LogCategory.DATABASE,
          userId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );

      throw new InternalServerErrorException('Failed to get follow history');
    }
  }
}
