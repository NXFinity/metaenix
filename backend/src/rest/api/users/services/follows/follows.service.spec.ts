import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { Follow } from './assets/entities/follow.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { AnalyticsService } from 'src/services/analytics/analytics.service';
import { RedisService } from '@redis/redis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '@logging/logging';

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepository: jest.Mocked<Repository<Follow>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  const mockFollowedUser: Partial<User> = {
    id: 'user-456',
    username: 'followeduser',
    displayName: 'Followed User',
    email: 'followed@example.com',
  };

  const mockFollow: Partial<Follow> = {
    id: 'follow-123',
    followerId: 'user-123',
    followingId: 'user-456',
    follower: mockUser as User,
    following: mockFollowedUser as User,
    dateCreated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CachingService,
          useValue: {
            getOrSetUser: jest.fn(),
            invalidateUser: jest.fn(),
            invalidateByTags: jest.fn().mockResolvedValue(1),
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackFollow: jest.fn(),
            trackUnfollow: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue('OK'),
            ttl: jest.fn(),
            del: jest.fn().mockResolvedValue(1),
            keyBuilder: {
              build: jest.fn((...args) => args.join(':')),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
    followRepository = module.get(getRepositoryToken(Follow));
    userRepository = module.get(getRepositoryToken(User));
    analyticsService = module.get(AnalyticsService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('followUser', () => {
    it('should successfully follow a user', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce(mockFollowedUser as User);
      followRepository.findOne.mockResolvedValue(null); // Not already following
      redisService.get.mockResolvedValue(null); // No cooldown
      redisService.del.mockResolvedValue(1);
      followRepository.create.mockReturnValue(mockFollow as Follow);
      followRepository.save.mockResolvedValue(mockFollow as Follow);
      (analyticsService.calculateUserAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.followUser(followerId, followingId);

      // Assert
      expect(result).toBeDefined();
      expect(followRepository.save).toHaveBeenCalled();
    });

    it('should throw error if trying to follow self', async () => {
      // Arrange
      const userId = 'user-123';

      // Act & Assert
      await expect(service.followUser(userId, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.followUser(userId, userId)).rejects.toThrow(
        'You cannot follow yourself',
      );
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.followUser(followerId, followingId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if already following', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce(mockFollowedUser as User);
      followRepository.findOne.mockResolvedValue(mockFollow as Follow);

      // Act & Assert
      await expect(service.followUser(followerId, followingId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.followUser(followerId, followingId)).rejects.toThrow(
        'You are already following this user',
      );
    });
  });

  describe('unfollowUser', () => {
    it('should successfully unfollow a user', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      followRepository.findOne.mockResolvedValue(mockFollow as Follow);
      followRepository.remove.mockResolvedValue(mockFollow as Follow);
      redisService.set = jest.fn().mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);
      (analyticsService.calculateUserAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // Act
      await service.unfollowUser(followerId, followingId);

      // Assert
      expect(followRepository.remove).toHaveBeenCalled();
    });

    it('should throw error if not following', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      followRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.unfollowUser(followerId, followingId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unfollowUser(followerId, followingId)).rejects.toThrow(
        'You are not following this user',
      );
    });
  });

  describe('isFollowing', () => {
    it('should return true if following', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      (cachingService.get as jest.Mock) = jest.fn().mockResolvedValue(null); // No cache
      followRepository.findOne.mockResolvedValue(mockFollow as Follow);
      (cachingService.set as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.isFollowing(followerId, followingId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if not following', async () => {
      // Arrange
      const followerId = 'user-123';
      const followingId = 'user-456';
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      (cachingService.get as jest.Mock) = jest.fn().mockResolvedValue(null); // No cache
      followRepository.findOne.mockResolvedValue(null);
      (cachingService.set as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.isFollowing(followerId, followingId);

      // Assert
      expect(result).toBe(false);
    });
  });
});

