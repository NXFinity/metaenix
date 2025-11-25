import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './assets/dto/createUser.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './assets/entities/user.entity';
import { Repository } from 'typeorm';
import { Profile } from './assets/entities/profile.entity';
import { Privacy } from './assets/entities/security/privacy.entity';
import { Social } from './assets/entities/social.entity';
import { ROLE } from '../../../security/roles';
import { Security } from './assets/entities/security/security.entity';
import { Follow } from './services/follows/assets/entities/follow.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  PaginationResponse,
  PaginationMeta,
} from '../../../common/interfaces/pagination-response.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { FollowsService } from './services/follows/follows.service';
import { TrackingService } from '../../../services/tracking/tracking.service';
import { AnalyticsService } from '../../../services/analytics/analytics.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    // @InjectRepository(Profile)
    // private readonly profileRepository: Repository<Profile>, // Reserved for future use
    // @InjectRepository(Privacy)
    // private readonly privacyRepository: Repository<Privacy>, // Reserved for future use
    @InjectRepository(Security)
    private readonly securityRepository: Repository<Security>,
    private readonly loggingService: LoggingService,
    private readonly cachingService: CachingService,
    private readonly configService: ConfigService,
    private readonly followsService: FollowsService,
    private readonly trackingService: TrackingService,
    private readonly analyticsService: AnalyticsService, // Centralized analytics service
  ) {}

  // #########################################################
  // CREATE OPTIONS - ALWAYS AT THE TOP
  // #########################################################

  // User Creation
  async create(user: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    websocketId: string;
    role?: ROLE;
  }): Promise<User> {
    // Check if user already exists
    const existingEmail = await this.existsByEmail(user.email);
    const existingUsername = await this.existsByUsername(user.username);

    // Generic error message to prevent user enumeration
    if (existingEmail || existingUsername) {
      throw new HttpException(
        'User creation failed. Please check your information and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Use transaction to ensure all entities are created atomically
    return await this.userRepository.manager.transaction(async (manager) => {
      // Create User
      const newUser = await manager.save(User, user);

      // Create Users Security (will be updated with verification token by AuthService)
      const security = new Security();
      security.user = newUser;
      security.isVerified = false;
      security.isTwoFactorEnabled = false;
      security.isBanned = false;
      security.isTimedOut = false;
      security.isAgedVerified = false;
      await manager.save(Security, security);

      // Create Users Profile
      const profile = new Profile();
      profile.user = newUser;
      await manager.save(Profile, profile);

      // Create Users Privacy
      const privacy = new Privacy();
      privacy.user = newUser;
      await manager.save(Privacy, privacy);

      // Create Users Social
      const social = new Social();
      social.user = newUser;
      await manager.save(Social, social);

      // Return User
      return newUser;
    });
  }

  // #########################################################
  // FIND OPTIONS - AFTER CREATE
  // #########################################################

  // Find All Users with Pagination
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginationResponse<User>> {
    try {
      const page = paginationDto.page || 1;
      const limit = paginationDto.limit || 10;
      const sortBy = paginationDto.sortBy || 'dateCreated';
      const sortOrder = paginationDto.sortOrder || 'DESC';
      const skip = (page - 1) * limit;

      // Validate sortBy field to prevent SQL injection
      const allowedSortFields = [
        'dateCreated',
        'username',
        'displayName',
        'email',
        'role',
      ];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'dateCreated';
      const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Get system admin username to exclude from public view
      const systemUsername = this.configService.get<string>('SYSTEM_USERNAME') || 'systemadmin';

      // Build base query for counting - count public, follower-only, and subscriber-only users, exclude systemadmin
      const countQueryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.privacy', 'privacy')
        .where('user.username != :systemUsername', { systemUsername })
        .andWhere(
          '(user.isPublic = :isPublic OR privacy.isFollowerOnly = :isFollowerOnly OR privacy.isSubscriberOnly = :isSubscriberOnly)',
          { isPublic: true, isFollowerOnly: true, isSubscriberOnly: true }
        );

      // Get total count (before pagination)
      const total = await countQueryBuilder.getCount();

      // Build query for paginated results - only select safe fields, exclude systemadmin
      // Include public profiles, follower-only profiles, and subscriber-only profiles
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('user.privacy', 'privacy')
        .leftJoinAndSelect('user.social', 'social')
        .where('user.username != :systemUsername', { systemUsername })
        .andWhere(
          '(user.isPublic = :isPublic OR privacy.isFollowerOnly = :isFollowerOnly OR privacy.isSubscriberOnly = :isSubscriberOnly)',
          { isPublic: true, isFollowerOnly: true, isSubscriberOnly: true }
        )
        .orderBy(`user.${safeSortBy}`, safeSortOrder)
        .select([
          'user.id',
          'user.username',
          'user.displayName',
          'user.email',
          'user.isPublic',
          'user.role',
          'user.dateCreated',
          'user.dateUpdated',
          'profile.id',
          'profile.avatar',
          'profile.cover',
          'privacy.id',
          'privacy.isFollowerOnly',
          'privacy.isSubscriberOnly',
          'social.id',
          'social.twitter',
          'social.instagram',
          'social.facebook',
          'social.github',
          'social.linkedin',
          'social.youtube',
          'social.tiktok',
          'social.discord',
          'social.twitch',
          'social.snapchat',
          'social.pinterest',
          'social.reddit',
        ])
        .skip(skip)
        .take(limit);

      // Get paginated results
      const users = await queryBuilder.getMany();

      // Calculate pagination metadata
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
        data: users,
        meta,
      };
    } catch (error) {
      this.loggingService.error(
        'Error finding all users',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      throw new InternalServerErrorException('Failed to find all users');
    }
  }

  // Find by ID
  async findOne(id: string): Promise<User> {
    try {
      return await this.cachingService.getOrSetUser('id', id, async () => {
        const user = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.profile', 'profile')
          .where('user.id = :id', { id })
          .select([
            'user.id',
            'user.username',
            'user.email',
            'user.isPublic',
            'profile.id',
          ])
          .getOne();

        if (!user) {
          throw new NotFoundException(`User with id ${id} not found`);
        }

        return user;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error finding user by id: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId: id },
        },
      );
      throw new InternalServerErrorException('Failed to find user by id');
    }
  }

  // Find by Username (case-insensitive)
  async findByUsername(username: string, currentUserId?: string): Promise<User> {
    try {
      // Normalize username to lowercase for cache key, but preserve original for query
      const normalizedUsername = username.toLowerCase();

      // First, quickly check if user exists and get privacy settings (lightweight query)
      const userCheck = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.privacy', 'privacy')
        .where('LOWER(user.username) = LOWER(:username)', { username })
        .select([
          'user.id',
          'user.username',
          'user.displayName',
          'user.isPublic',
          'privacy.id',
          'privacy.isFollowerOnly',
          'privacy.isSubscriberOnly',
        ])
        .getOne();

      if (!userCheck) {
        throw new NotFoundException(
          `User with username ${username} not found`,
        );
      }

      // Check privacy settings early (before expensive queries)
      const isPrivate = userCheck.isPublic === false;
      const isFollowerOnly = userCheck.privacy?.isFollowerOnly === true;
      const isSubscriberOnly = userCheck.privacy?.isSubscriberOnly === true;
      const hasPrivacyRestriction = isPrivate || isFollowerOnly || isSubscriberOnly;
      
      if (hasPrivacyRestriction) {
        // If viewing own profile, allow access
        if (currentUserId && currentUserId === userCheck.id) {
          // Continue to full user fetch
        } else {
          // Check if user has access based on privacy settings
          let hasAccess = false;
          
          if (isFollowerOnly && currentUserId) {
            // Check if current user is following this user
            try {
              hasAccess = await this.followsService.isFollowing(currentUserId, userCheck.id);
            } catch (error) {
              // If check fails, assume no access
              hasAccess = false;
            }
          } else if (isSubscriberOnly && currentUserId) {
            // TODO: Check if current user is subscribed to this user
            // Subscription service not yet implemented
            hasAccess = false;
          } else if (isPrivate && currentUserId) {
            // TODO: Check if users are friends
            // Friends service not yet implemented
            hasAccess = false;
          }
          
          if (!hasAccess) {
            // Determine the appropriate error message based on privacy settings
            let errorMessage = 'This profile is private. Only friends can view private profiles.';
            if (isSubscriberOnly) {
              errorMessage = 'This profile is only visible to subscribers.';
            } else if (isFollowerOnly) {
              errorMessage = 'This profile is only visible to followers.';
            }
            
            // Include privacy information in the error response
            throw new ForbiddenException({
              message: errorMessage,
              privacy: {
                isFollowerOnly,
                isSubscriberOnly,
                isPrivate,
              },
            });
          }
          // If hasAccess is true, continue to full user fetch
        }
      }

      // Now fetch full user data (only if privacy check passed)
      const user = await this.cachingService.getOrSetUser(
        'username',
        normalizedUsername,
        async () => {
          const foundUser = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .leftJoinAndSelect('user.privacy', 'privacy')
            .leftJoinAndSelect('user.social', 'social')
            .where('LOWER(user.username) = LOWER(:username)', { username })
            .select([
              'user.id',
              'user.username',
              'user.displayName',
              'user.email',
              'user.isPublic',
              'user.followersCount',
              'user.followingCount',
              'user.viewsCount',
              'user.isDeveloper',
              'user.developerTermsAcceptedAt',
              'user.dateCreated',
              'user.dateUpdated',
              'profile.id',
              'profile.firstName',
              'profile.lastName',
              'profile.bio',
              'profile.location',
              'profile.website',
              'profile.avatar',
              'profile.cover',
              'profile.banner',
              'profile.offline',
              'profile.dateOfBirth',
              'privacy.id',
              'privacy.isFollowerOnly',
              'privacy.isSubscriberOnly',
              'social.id',
              'social.twitter',
              'social.instagram',
              'social.facebook',
              'social.github',
              'social.linkedin',
              'social.youtube',
              'social.tiktok',
              'social.discord',
              'social.twitch',
              'social.snapchat',
              'social.pinterest',
              'social.reddit',
            ])
            .getOne();

          if (!foundUser) {
            throw new NotFoundException(
              `User with username ${username} not found`,
            );
          }

          // Calculate actual counts from Follow table to ensure accuracy
          const followRepository = this.userRepository.manager.getRepository(Follow);
          const [actualFollowersCount, actualFollowingCount] = await Promise.all([
            followRepository.count({
              where: { followingId: foundUser.id },
            }),
            followRepository.count({
              where: { followerId: foundUser.id },
            }),
          ]);

          // Update the user object with actual counts
          return {
            ...foundUser,
            followersCount: actualFollowersCount,
            followingCount: actualFollowingCount,
          };
        },
      );

      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.loggingService.error(
        `Error finding user by username: ${username}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { username },
        },
      );
      throw new InternalServerErrorException('Failed to find user by username');
    }
  }

  // Find by Email Address
  async findByEmail(email: string): Promise<User> {
    try {
      return await this.cachingService.getOrSetUser(
        'email',
        email,
        async () => {
          const user = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .where('user.email = :email', { email })
            .select([
              'user.id',
              'user.username',
              'user.email',
              'user.isPublic',
              'profile.id',
            ]) // keep this if you want all columns; later you can explicitly define what to select
            .getOne();

          if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
          }

          return user;
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        'Error finding user by email',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      throw new InternalServerErrorException('Failed to find user by email');
    }
  }

  // Check if user exists by email (returns null if not found, doesn't throw)
  async existsByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email })
        .getOne();
    } catch (error) {
      this.loggingService.error(
        'Error checking user by email',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      return null;
    }
  }

  // Check if user exists by username (returns null if not found, doesn't throw)
  async existsByUsername(username: string): Promise<User | null> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.username = :username', { username })
        .getOne();
    } catch (error) {
      this.loggingService.error(
        'Error checking user by username',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { username },
        },
      );
      return null;
    }
  }

  // Find user by websocketId (for WebSocket authentication)
  async findByWebsocketId(websocketId: string): Promise<User | null> {
    try {
      return await this.cachingService.getOrSetUser(
        'websocketId',
        websocketId,
        async () => {
          return await this.userRepository
            .createQueryBuilder('user')
            .where('user.websocketId = :websocketId', { websocketId })
            .select([
              'user.id',
              'user.username',
              'user.displayName',
              'user.email',
              'user.websocketId',
              'user.role',
              'user.isPublic',
            ])
            .getOne();
        },
      );
    } catch (error) {
      this.loggingService.error(
        `Error finding user by websocketId: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
      return null;
    }
  }

  // #########################################################
  // GET CURRENT USER
  // #########################################################

  async getMe(userId: string): Promise<User> {
    try {
      const fetchUserData = async () => {
        const userData = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.profile', 'profile')
          .leftJoinAndSelect('user.privacy', 'privacy')
          .leftJoinAndSelect('user.social', 'social')
          .leftJoinAndSelect('user.security', 'security')
          .where('user.id = :id', { id: userId })
          .select([
            'user.id',
            'user.username',
            'user.displayName',
            'user.email',
            'user.isPublic',
            'user.followersCount',
            'user.followingCount',
            'user.viewsCount',
            'user.isDeveloper',
            'user.developerTermsAcceptedAt',
            'user.dateCreated',
            'user.dateUpdated',
            'user.websocketId',
            'user.role',
            'profile.id',
            'profile.firstName',
            'profile.lastName',
            'profile.bio',
            'profile.location',
            'profile.website',
            'profile.avatar',
            'profile.cover',
            'profile.banner',
            'profile.offline',
            'profile.dateOfBirth',
            'privacy.id',
            'privacy.isFollowerOnly',
            'privacy.isSubscriberOnly',
            'privacy.isMatureContent',
            'privacy.allowMessages',
            'privacy.allowNotifications',
            'privacy.allowFriendRequests',
            'privacy.notifyOnFollow',
            'social.id',
            'social.twitter',
            'social.instagram',
            'social.facebook',
            'social.github',
            'social.linkedin',
            'social.youtube',
            'social.tiktok',
            'social.discord',
            'social.twitch',
            'social.snapchat',
            'social.pinterest',
            'social.reddit',
            'security.id',
            'security.isVerified',
            'security.dateVerified',
            'security.isTwoFactorEnabled',
            'security.twoFactorEnabledAt',
            'security.twoFactorLastVerified',
            'security.isBanned',
            'security.banReason',
            'security.bannedUntil',
            'security.bannedAt',
            'security.isTimedOut',
            'security.timeoutReason',
            'security.timedOutUntil',
            'security.isAgedVerified',
            'security.agedVerifiedDate',
          ])
          .getOne();

        if (!userData) {
          throw new NotFoundException(`User with id ${userId} not found`);
        }

        // Calculate actual counts from Follow table to ensure accuracy
        const followRepository = this.userRepository.manager.getRepository(Follow);
        const [actualFollowersCount, actualFollowingCount] = await Promise.all([
          followRepository.count({
            where: { followingId: userId },
          }),
          followRepository.count({
            where: { followerId: userId },
          }),
        ]);

        // Remove password and sensitive security fields from response
        const { password, ...userWithoutPassword } = userData;
        
        // Remove sensitive security fields if security exists
        if (userWithoutPassword.security) {
          const {
            twoFactorSecret,
            twoFactorBackupCodes,
            refreshToken,
            passwordResetToken,
            passwordResetTokenExpires,
            verificationToken,
            twoFactorToken,
            ...safeSecurity
          } = userWithoutPassword.security;
          userWithoutPassword.security = safeSecurity as any;
        }

        // Update the user object with actual counts
        return {
          ...userWithoutPassword,
          followersCount: actualFollowersCount,
          followingCount: actualFollowingCount,
        } as User;
      };

      // Try to get from cache first
      const user = await this.cachingService.getOrSetUser(
        'id',
        userId,
        fetchUserData,
        {
          tags: ['user', `user:${userId}`, 'user:me'],
        },
      );

      // Check if relations are missing or role is missing (stale cache) and reload if needed
      if (!user.security || !user.privacy || !user.role) {
        // Cache returned incomplete data, invalidate and fetch fresh from DB
        await this.cachingService.invalidateUser(userId);
        
        // Fetch fresh data from database
        const freshUserData = await fetchUserData();

        // Update cache with fresh data
        await this.cachingService.cacheUser(userId, freshUserData, {
          tags: ['user', `user:${userId}`, 'user:me'],
        });

        return freshUserData;
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error getting current user: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      throw new InternalServerErrorException('Failed to get current user');
    }
  }

  // Update Security entity with verification token
  async updateSecurityVerification(
    userId: string,
    verificationToken: string,
  ): Promise<void> {
    const security = await this.securityRepository.findOne({
      where: { user: { id: userId } },
    });

    if (security) {
      security.verificationToken = verificationToken;
      security.isVerified = false;
      await this.securityRepository.save(security);
    }
  }

  // Find Security entity by verification token
  async findSecurityByVerificationToken(
    token: string,
  ): Promise<Security | null> {
    try {
      return await this.securityRepository.findOne({
        where: { verificationToken: token },
        relations: ['user'],
      });
    } catch (error) {
      this.loggingService.error(
        'Error finding security by verification token',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      return null;
    }
  }

  // Update Security entity verification status
  async updateSecurityVerificationStatus(
    security: Security,
    isVerified: boolean,
    dateVerified: Date,
  ): Promise<void> {
    security.isVerified = isVerified;
    security.dateVerified = dateVerified;
    security.verificationToken = null; // Clear the token after verification
    await this.securityRepository.save(security);

    // Invalidate user cache after verification status update
    if (security.user?.id) {
      try {
        await this.cachingService.invalidateUser(security.user.id);
      } catch (cacheError) {
        // Log cache invalidation error but don't fail the verification update
        this.loggingService.error(
          `Error invalidating cache after verification status update: ${security.user.id}`,
          cacheError instanceof Error ? cacheError.stack : undefined,
          'UsersService',
          {
            category: LogCategory.DATABASE,
            error:
              cacheError instanceof Error
                ? cacheError
                : new Error(String(cacheError)),
            metadata: { userId: security.user.id },
          },
        );
      }
    }
  }

  // Find Security entity by user email
  async findSecurityByUserEmail(email: string): Promise<Security | null> {
    try {
      return await this.securityRepository.findOne({
        where: { user: { email } },
        relations: ['user'],
      });
    } catch (error) {
      this.loggingService.error(
        'Error finding security by user email',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      return null;
    }
  }

  // Find user with security relation by email
  async findUserWithSecurityByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
        relations: ['security'],
      });
    } catch (error) {
      this.loggingService.error(
        'Error finding user with security by email',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { email },
        },
      );
      return null;
    }
  }

  // Update user password
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
      user.password = newPassword;
      await this.userRepository.save(user);

      // Invalidate user cache after password update
      try {
        await this.cachingService.invalidateUser(userId);
      } catch (cacheError) {
        // Log cache invalidation error but don't fail the password update
        this.loggingService.error(
          `Error invalidating cache after password update: ${userId}`,
          cacheError instanceof Error ? cacheError.stack : undefined,
          'UsersService',
          {
            category: LogCategory.DATABASE,
            error:
              cacheError instanceof Error
                ? cacheError
                : new Error(String(cacheError)),
            metadata: { userId },
          },
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error updating user password: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      throw new InternalServerErrorException('Failed to update password');
    }
  }

  // Update Security entity with password reset token
  async updatePasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const security = await this.securityRepository.findOne({
      where: { user: { id: userId } },
    });

    if (security) {
      security.passwordResetToken = token;
      security.passwordResetTokenExpires = expiresAt;
      await this.securityRepository.save(security);
    }
  }

  // Find Security entity by password reset token
  async findSecurityByPasswordResetToken(
    token: string,
  ): Promise<Security | null> {
    try {
      return await this.securityRepository.findOne({
        where: { passwordResetToken: token },
        relations: ['user'],
      });
    } catch (error) {
      this.loggingService.error(
        'Error finding security by password reset token',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
        },
      );
      return null;
    }
  }

  // Clear password reset token
  async clearPasswordResetToken(userId: string): Promise<void> {
    const security = await this.securityRepository.findOne({
      where: { user: { id: userId } },
    });

    if (security) {
      security.passwordResetToken = null;
      security.passwordResetTokenExpires = null;
      await this.securityRepository.save(security);
    }
  }

  // #########################################################
  // UPDATE OPTIONS - AFTER FIND OPTIONS
  // #########################################################

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      // Get user with all relations
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'privacy', 'security'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Update User entity fields (only allowed fields)
      if (updateUserDto.username !== undefined) {
        // Check if username is already taken by another user
        const existingUser = await this.existsByUsername(
          updateUserDto.username,
        );
        if (existingUser && existingUser.id !== id) {
          throw new HttpException(
            'Username is already taken',
            HttpStatus.BAD_REQUEST,
          );
        }
        user.username = updateUserDto.username;
      }

      if (updateUserDto.displayName !== undefined) {
        // Check if displayName is already taken by another user
        const existingUser = await this.userRepository.findOne({
          where: { displayName: updateUserDto.displayName },
        });
        if (existingUser && existingUser.id !== id) {
          throw new HttpException(
            'Display name is already taken',
            HttpStatus.BAD_REQUEST,
          );
        }
        user.displayName = updateUserDto.displayName;
      }

      if (updateUserDto.isPublic !== undefined) {
        user.isPublic = updateUserDto.isPublic;
      }

      // Use transaction to ensure all updates are atomic
      return await this.userRepository.manager.transaction(async (manager) => {
        // Reload user within transaction to ensure we have latest data
        const userInTransaction = await manager.findOne(User, {
          where: { id },
          relations: ['profile', 'privacy', 'security'],
        });

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

        // Return updated user with all relations (without password)
        const updatedUser = await manager.findOne(User, {
          where: { id },
          relations: ['profile', 'privacy', 'social', 'security'],
        });

        if (!updatedUser) {
          throw new NotFoundException(`User with id ${id} not found`);
        }

        const { password, ...userWithoutPassword } = updatedUser;

        // Invalidate user cache after successful update
        try {
          await this.cachingService.invalidateUser(id);
        } catch (cacheError) {
          // Log cache invalidation error but don't fail the update
          this.loggingService.error(
            `Error invalidating cache for user: ${id}`,
            cacheError instanceof Error ? cacheError.stack : undefined,
            'UsersService',
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
        'UsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId: id },
        },
      );
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  // #########################################################
  // DELETE OPTIONS - AFTER UPDATE OPTIONS - ALWAYS AT END
  // #########################################################

  async delete(id: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'privacy', 'security'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Hard delete - permanently removes user and related entities (CASCADE)
      await this.userRepository.remove(user);

      // Invalidate user cache after successful delete
      try {
        await this.cachingService.invalidateUser(id);
      } catch (cacheError) {
        // Log cache invalidation error but don't fail the delete
        this.loggingService.error(
          `Error invalidating cache for deleted user: ${id}`,
          cacheError instanceof Error ? cacheError.stack : undefined,
          'UsersService',
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Error deleting user: ${id}`,
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId: id },
        },
      );
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  // #########################################################
  // VIEW TRACKING
  // #########################################################

  /**
   * Track profile view (increment viewsCount and track geographic data)
   */
  async trackProfileView(userId: string, req: any, viewerUserId?: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return; // Silently fail if user doesn't exist
      }

      // Only track if profile is public
      if (!user.isPublic) {
        return;
      }

      // Track view using centralized tracking service
      const trackingResult = await this.trackingService.trackProfileView(userId, req, viewerUserId);

      // Only recalculate analytics if view was actually tracked (not a duplicate)
      if (trackingResult.tracked) {
        this.analyticsService.calculateUserAnalytics(userId).catch((error: unknown) => {
          this.loggingService.error(
            'Error recalculating user analytics after view',
            error instanceof Error ? error.stack : undefined,
            'UsersService',
          );
        });
      }

      // Invalidate cache
      await this.cachingService.invalidateUser(userId);
    } catch (error) {
      // Silently fail for view tracking
      this.loggingService.error(
        'Error tracking profile view',
        error instanceof Error ? error.stack : undefined,
        'UsersService',
        {
          category: LogCategory.DATABASE,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
    }
  }

  /**
   * Get geographic analytics for a user
   */
  async getGeographicAnalytics(userId: string) {
    return this.analyticsService.getGeographicAnalytics(userId);
  }
}
