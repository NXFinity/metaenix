import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual } from 'typeorm';
import { User } from 'src/rest/api/users/assets/entities/user.entity';
import { Profile } from 'src/rest/api/users/assets/entities/profile.entity';
import { Privacy } from 'src/rest/api/users/assets/entities/security/privacy.entity';
import { Security } from 'src/rest/api/users/assets/entities/security/security.entity';
import { Social } from 'src/rest/api/users/assets/entities/social.entity';
import { UpdateUserDto } from 'src/rest/api/users/assets/dto/createUser.dto';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { RedisService } from '@redis/redis';

/**
 * Admin Users Service
 * 
 * This service handles admin-specific user management operations.
 * Uses repositories directly - no dependency on REST API services.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // Note: These repositories are available for future use but not currently needed
    // as we use manager.save() within transactions
    // @InjectRepository(Profile)
    // private readonly profileRepository: Repository<Profile>,
    // @InjectRepository(Privacy)
    // private readonly privacyRepository: Repository<Privacy>,
    // @InjectRepository(Security)
    // private readonly securityRepository: Repository<Security>,
    // @InjectRepository(Social)
    // private readonly socialRepository: Repository<Social>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Update user by ID (admin only)
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      // Get user with all relations
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'privacy', 'security', 'social'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Check for username conflicts
      if (updateUserDto.username !== undefined) {
        const existingUser = await this.userRepository.findOne({
          where: { username: updateUserDto.username },
        });
        if (existingUser && existingUser.id !== id) {
          throw new HttpException(
            'Username is already taken',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Check for displayName conflicts
      if (updateUserDto.displayName !== undefined) {
        const existingUser = await this.userRepository.findOne({
          where: { displayName: updateUserDto.displayName },
        });
        if (existingUser && existingUser.id !== id) {
          throw new HttpException(
            'Display name is already taken',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Use transaction to ensure all updates are atomic
      return await this.userRepository.manager.transaction(async (manager) => {
        // Reload user within transaction
        const userInTransaction = await manager.findOne(User, {
          where: { id },
          relations: ['profile', 'privacy', 'security', 'social'],
        }) as User | null;

        if (!userInTransaction) {
          throw new NotFoundException(`User with id ${id} not found`);
        }

        // Update user fields
        if (updateUserDto.username !== undefined) {
          userInTransaction.username = updateUserDto.username;
        }
        if (updateUserDto.displayName !== undefined) {
          userInTransaction.displayName = updateUserDto.displayName;
        }
        if (updateUserDto.isPublic !== undefined) {
          userInTransaction.isPublic = updateUserDto.isPublic;
        }
        // Note: Role updates should use an admin-specific DTO (to be implemented)
        // For now, role updates are not supported via UpdateUserDto

        // Save user changes
        await manager.save(User, userInTransaction);

        // Update Profile entity if provided
        if (updateUserDto.profile) {
          const profile = userInTransaction.profile || new Profile();
          profile.user = userInTransaction;

          if (updateUserDto.profile.firstName !== undefined) {
            profile.firstName = updateUserDto.profile.firstName;
          }
          if (updateUserDto.profile.lastName !== undefined) {
            profile.lastName = updateUserDto.profile.lastName;
          }
          if (updateUserDto.profile.bio !== undefined) {
            profile.bio = updateUserDto.profile.bio;
          }
          if (updateUserDto.profile.location !== undefined) {
            profile.location = updateUserDto.profile.location;
          }
          if (updateUserDto.profile.website !== undefined) {
            profile.website = updateUserDto.profile.website;
          }
          if (updateUserDto.profile.dateOfBirth !== undefined) {
            profile.dateOfBirth = new Date(updateUserDto.profile.dateOfBirth);
          }
          if (updateUserDto.profile.avatar !== undefined) {
            profile.avatar = updateUserDto.profile.avatar;
          }
          if (updateUserDto.profile.cover !== undefined) {
            profile.cover = updateUserDto.profile.cover;
          }
          if (updateUserDto.profile.banner !== undefined) {
            profile.banner = updateUserDto.profile.banner;
          }
          if (updateUserDto.profile.offline !== undefined) {
            profile.offline = updateUserDto.profile.offline;
          }
          if (updateUserDto.profile.chat !== undefined) {
            profile.chat = updateUserDto.profile.chat;
          }

          await manager.save(Profile, profile);
        }

        // Update Privacy entity if provided
        if (updateUserDto.privacy) {
          const privacy = userInTransaction.privacy || new Privacy();
          privacy.user = userInTransaction;

          if (updateUserDto.privacy.isFollowerOnly !== undefined) {
            privacy.isFollowerOnly = updateUserDto.privacy.isFollowerOnly;
          }
          if (updateUserDto.privacy.isSubscriberOnly !== undefined) {
            privacy.isSubscriberOnly = updateUserDto.privacy.isSubscriberOnly;
          }
          if (updateUserDto.privacy.isMatureContent !== undefined) {
            privacy.isMatureContent = updateUserDto.privacy.isMatureContent;
          }
          if (updateUserDto.privacy.allowMessages !== undefined) {
            privacy.allowMessages = updateUserDto.privacy.allowMessages;
          }
          if (updateUserDto.privacy.allowNotifications !== undefined) {
            privacy.allowNotifications =
              updateUserDto.privacy.allowNotifications;
          }
          if (updateUserDto.privacy.allowFriendRequests !== undefined) {
            privacy.allowFriendRequests =
              updateUserDto.privacy.allowFriendRequests;
          }

          await manager.save(Privacy, privacy);
        }

        // Update Social entity if provided
        if (updateUserDto.social) {
          const social = userInTransaction.social || new Social();
          social.user = userInTransaction;

          if (updateUserDto.social.twitter !== undefined) {
            social.twitter = updateUserDto.social.twitter;
          }
          if (updateUserDto.social.instagram !== undefined) {
            social.instagram = updateUserDto.social.instagram;
          }
          if (updateUserDto.social.facebook !== undefined) {
            social.facebook = updateUserDto.social.facebook;
          }
          if (updateUserDto.social.github !== undefined) {
            social.github = updateUserDto.social.github;
          }
          if (updateUserDto.social.linkedin !== undefined) {
            social.linkedin = updateUserDto.social.linkedin;
          }
          if (updateUserDto.social.youtube !== undefined) {
            social.youtube = updateUserDto.social.youtube;
          }
          if (updateUserDto.social.tiktok !== undefined) {
            social.tiktok = updateUserDto.social.tiktok;
          }
          if (updateUserDto.social.discord !== undefined) {
            social.discord = updateUserDto.social.discord;
          }
          if (updateUserDto.social.twitch !== undefined) {
            social.twitch = updateUserDto.social.twitch;
          }
          if (updateUserDto.social.snapchat !== undefined) {
            social.snapchat = updateUserDto.social.snapchat;
          }
          if (updateUserDto.social.pinterest !== undefined) {
            social.pinterest = updateUserDto.social.pinterest;
          }
          if (updateUserDto.social.reddit !== undefined) {
            social.reddit = updateUserDto.social.reddit;
          }

          await manager.save(Social, social);
        }

        // Note: Security updates (ban, timeout, verify) should use an admin-specific DTO (to be implemented)
        // For now, security updates are not supported via UpdateUserDto

        // Return updated user with all relations (without password)
        const updatedUser = await manager.findOne(User, {
          where: { id },
          relations: ['profile', 'privacy', 'social', 'security'],
        }) as User | null;

        if (!updatedUser) {
          throw new NotFoundException(`User with id ${id} not found`);
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = updatedUser;

        // Invalidate user cache after successful update
        try {
          await this.cachingService.invalidateUser(id);
        } catch (cacheError) {
          // Log cache invalidation error but don't fail the update
          this.loggingService.error(
            `Error invalidating cache for user: ${id}`,
            cacheError instanceof Error ? cacheError.stack : undefined,
            'AdminUsersService',
            {
              category: LogCategory.DATABASE,
              error:
                cacheError instanceof Error
                  ? cacheError
                  : new Error(String(cacheError)),
              metadata: { userId: id },
            },
          );
        }

        this.loggingService.log('User updated by admin', 'AdminUsersService', {
          category: LogCategory.USER_MANAGEMENT,
          metadata: { userId: id },
        });

        return userWithoutPassword as User;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      this.loggingService.error(
        `Error updating user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId: id },
        },
      );
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  /**
   * Delete user by ID (admin only - hard delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'privacy', 'security', 'social'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Use transaction to ensure all deletions are atomic
      await this.userRepository.manager.transaction(async (manager) => {
        // Delete related entities first (cascade should handle this, but being explicit)
        if (user.profile) {
          await manager.remove(Profile, user.profile);
        }
        if (user.privacy) {
          await manager.remove(Privacy, user.privacy);
        }
        if (user.security) {
          await manager.remove(Security, user.security);
        }
        if (user.social) {
          await manager.remove(Social, user.social);
        }

        // Delete user (cascade will handle related entities)
        await manager.remove(User, user);
      });

      // Invalidate cache
      try {
        await this.cachingService.invalidateUser(id);
      } catch (cacheError) {
        this.loggingService.error(
          `Error invalidating cache for deleted user: ${id}`,
          cacheError instanceof Error ? cacheError.stack : undefined,
          'AdminUsersService',
        );
      }

      this.loggingService.log('User deleted by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        metadata: { userId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId: id },
        },
      );
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  /**
   * Clear follow cooldown (admin only)
   */
  async clearCooldown(followerId: string, followingId: string): Promise<void> {
    try {
      const cooldownKey = `follow:cooldown:${followerId}:${followingId}`;
      await this.redisService.del(cooldownKey);

      this.loggingService.log('Follow cooldown cleared by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        metadata: { followerId, followingId, action: 'clear_cooldown' },
      });
    } catch (error) {
      this.loggingService.error(
        'Error clearing cooldown',
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { followerId, followingId },
        },
      );

      throw new InternalServerErrorException('Failed to clear cooldown');
    }
  }

  /**
   * Search users by username, email, or display name
   */
  async searchUsers(
    query: string,
    paginationDto: { page?: number; limit?: number } = {},
  ): Promise<{
    data: User[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;
      const skip = (page - 1) * limit;

      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile');

      // If query is provided and not empty, apply search filters
      if (query && query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        queryBuilder
          .where('user.username ILIKE :search', { search: searchTerm })
          .orWhere('user.email ILIKE :search', { search: searchTerm })
          .orWhere('user.displayName ILIKE :search', { search: searchTerm });
      }

      const [users, total] = await queryBuilder
        .orderBy('user.dateCreated', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data: users.map((user) => {
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        }),
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.loggingService.error(
        'Error searching users',
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to search users');
    }
  }

  /**
   * Get full admin view of user (including private data, security info)
   */
  async getUserDetails(id: string): Promise<User & { security: Security }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'privacy', 'security', 'social', 'security.bannedBy'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User & { security: Security };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting user details: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get user details');
    }
  }

  /**
   * Ban a user
   */
  async banUser(
    id: string,
    reason: string,
    bannedUntil?: Date,
    bannedBy: string = 'system',
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['security'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      if (!user.security) {
        throw new HttpException(
          'User security record not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      user.security.isBanned = true;
      user.security.banReason = reason;
      user.security.bannedAt = new Date();
      if (bannedUntil) {
        user.security.bannedUntil = bannedUntil;
      } else {
        (user.security as any).bannedUntil = undefined;
      }
      if (bannedBy !== 'system') {
        const adminUser = await this.userRepository.findOne({
          where: { id: bannedBy },
        });
        if (adminUser) {
          user.security.bannedBy = adminUser;
        }
      }

      await this.userRepository.manager.save(Security, user.security);

      // Invalidate cache
      await this.cachingService.invalidateUser(id);

      this.loggingService.log('User banned by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: bannedBy,
        metadata: { targetUserId: id, reason, bannedUntil },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      this.loggingService.error(
        `Error banning user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to ban user');
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(id: string, unbannedBy: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['security'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      if (!user.security) {
        throw new HttpException(
          'User security record not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      user.security.isBanned = false;
      // TypeORM nullable fields - use undefined instead of null for TypeScript
      (user.security as any).banReason = undefined;
      (user.security as any).bannedAt = undefined;
      (user.security as any).bannedUntil = undefined;
      (user.security as any).bannedBy = undefined;

      await this.userRepository.manager.save(Security, user.security);

      // Invalidate cache
      await this.cachingService.invalidateUser(id);

      this.loggingService.log('User unbanned by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: unbannedBy,
        metadata: { targetUserId: id },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      this.loggingService.error(
        `Error unbanning user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to unban user');
    }
  }

  /**
   * Timeout a user (temporary ban)
   */
  async timeoutUser(
    id: string,
    reason: string,
    timedOutUntil: Date,
    timedOutBy: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['security'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      if (!user.security) {
        throw new HttpException(
          'User security record not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      user.security.isTimedOut = true;
      user.security.timeoutReason = reason;
      user.security.timedOutUntil = timedOutUntil;

      const adminUser = await this.userRepository.findOne({
        where: { id: timedOutBy },
      });
      if (adminUser) {
        user.security.timedOutBy = adminUser;
      }

      await this.userRepository.manager.save(Security, user.security);

      // Invalidate cache
      await this.cachingService.invalidateUser(id);

      this.loggingService.log('User timed out by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: timedOutBy,
        metadata: { targetUserId: id, reason, timedOutUntil },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      this.loggingService.error(
        `Error timing out user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to timeout user');
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(
    id: string,
    paginationDto: { page?: number; limit?: number } = {},
  ): Promise<{
    data: Array<{
      type: string;
      action: string;
      timestamp: Date;
      details?: Record<string, any>;
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    try {
      // This would query audit logs filtered by userId
      // For now, return empty array as audit log querying needs to be implemented
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 20;

      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    } catch (error) {
      this.loggingService.error(
        `Error getting user activity: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get user activity');
    }
  }

  /**
   * Change user role
   */
  async changeUserRole(
    id: string,
    role: string,
    changedBy: string,
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Validate role
      const validRoles = ['Member', 'Moderator', 'Admin', 'Developer'];
      if (!validRoles.includes(role)) {
        throw new HttpException(
          `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      user.role = role as any;
      await this.userRepository.save(user);

      // Invalidate cache
      await this.cachingService.invalidateUser(id);

      this.loggingService.log('User role changed by admin', 'AdminUsersService', {
        category: LogCategory.USER_MANAGEMENT,
        userId: changedBy,
        metadata: { targetUserId: id, newRole: role },
      });

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      this.loggingService.error(
        `Error changing user role: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to change user role');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    timedOutUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const [
        totalUsers,
        activeUsers,
        bannedUsers,
        timedOutUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
      ] = await Promise.all([
        this.userRepository.count({ where: { dateDeleted: IsNull() } }),
        this.userRepository
          .createQueryBuilder('user')
          .where('user.dateDeleted IS NULL')
          .andWhere('user.dateUpdated >= :weekAgo', { weekAgo })
          .getCount(),
        this.userRepository
          .createQueryBuilder('user')
          .leftJoin('user.security', 'security')
          .where('user.dateDeleted IS NULL')
          .andWhere('security.isBanned = :isBanned', { isBanned: true })
          .getCount(),
        this.userRepository
          .createQueryBuilder('user')
          .leftJoin('user.security', 'security')
          .where('user.dateDeleted IS NULL')
          .andWhere('security.isTimedOut = :isTimedOut', { isTimedOut: true })
          .getCount(),
        this.userRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(today),
            dateDeleted: IsNull(),
          },
        }),
        this.userRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(weekAgo),
            dateDeleted: IsNull(),
          },
        }),
        this.userRepository.count({
          where: {
            dateCreated: MoreThanOrEqual(monthAgo),
            dateDeleted: IsNull(),
          },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        bannedUsers,
        timedOutUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
      };
    } catch (error) {
      this.loggingService.error(
        'Error getting user stats',
        error instanceof Error ? error.stack : undefined,
        'AdminUsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to get user stats');
    }
  }
}
