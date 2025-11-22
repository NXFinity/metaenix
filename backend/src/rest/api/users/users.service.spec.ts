import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User } from './assets/entities/user.entity';
import { Security } from './assets/entities/security/security.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { FollowsService } from './services/follows/follows.service';
import { TrackingService } from '../../../services/tracking/tracking.service';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { ROLE } from '../../../security/roles';
import { PaginationDto } from '../../../common/dto/pagination.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let cachingService: jest.Mocked<CachingService>;
  let loggingService: jest.Mocked<LoggingService>;
  let followsService: jest.Mocked<FollowsService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    websocketId: 'ws-123',
    role: ROLE.Member,
    isPublic: true,
    dateCreated: new Date(),
    dateUpdated: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            save: jest.fn(),
            manager: {
              transaction: jest.fn(),
            },
          },
        },
        {
          provide: getRepositoryToken(Security),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CachingService,
          useValue: {
            getOrSetUser: jest.fn(),
            invalidateUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                SYSTEM_USERNAME: 'systemadmin',
              };
              return config[key];
            }),
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
          provide: FollowsService,
          useValue: {
            isFollowing: jest.fn(),
            getFollowStatus: jest.fn(),
          },
        },
        {
          provide: TrackingService,
          useValue: {
            trackView: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            getGeographicAnalytics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    cachingService = module.get(CachingService);
    loggingService = module.get(LoggingService);
    followsService = module.get(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      websocketId: 'ws-123',
      role: ROLE.Member,
    };

    it('should successfully upload a user with all related entities', async () => {
      // Arrange
      const mockManager = {
        save: jest.fn().mockResolvedValue(mockUser as User),
      };
      const mockTransaction = jest.fn(async (callback) => {
        return callback(mockManager);
      });
      userRepository.manager.transaction = mockTransaction;
      // Mock existsByEmail and existsByUsername to return null (user doesn't exist)
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledTimes(5); // User, Security, Profile, Privacy, Social
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser as User); // Email exists

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow();
      expect(userRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('should throw error if username already exists', async () => {
      // Arrange
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(null) // Email doesn't exist
        .mockResolvedValueOnce(mockUser as User); // Username exists

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow();
      expect(userRepository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      // Arrange
      const userId = 'user-123';
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        return fn();
      });
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :id', {
        id: userId,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        return fn();
      });
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(userId)).rejects.toThrow(
        `User with id ${userId} not found`,
      );
    });

    it('should use cache if available', async () => {
      // Arrange
      const userId = 'user-123';
      cachingService.getOrSetUser.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toBeDefined();
      expect(cachingService.getOrSetUser).toHaveBeenCalled();
      expect(mockQueryBuilder.getOne).not.toHaveBeenCalled();
    });
  });

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      const username = 'testuser';
      const userCheck = {
        id: 'user-123',
        username: 'testuser',
        isPublic: true,
        privacy: { isFollowerOnly: false, isSubscriberOnly: false },
      };
      const fullUser = {
        ...mockUser,
        profile: { id: 'profile-123' },
        privacy: { id: 'privacy-123' },
        social: { id: 'social-123' },
      };

      // Mock the first query (userCheck)
      const userCheckQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userCheck),
      };

      // Mock the second query (full user fetch)
      const fullUserQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fullUser as User),
      };

      // Mock getRepository for Follow counts
      const followRepository = {
        count: jest.fn().mockResolvedValue(0),
      };

      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(userCheckQueryBuilder)
        .mockReturnValueOnce(fullUserQueryBuilder);

      userRepository.manager.getRepository = jest.fn().mockReturnValue(followRepository);

      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        return fn();
      });

      // Act
      const result = await service.findByUsername(username);

      // Assert
      expect(result).toBeDefined();
      expect(userCheckQueryBuilder.where).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const username = 'non-existent';
      const userCheckQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      userRepository.createQueryBuilder = jest.fn().mockReturnValue(userCheckQueryBuilder);

      // Act & Assert
      await expect(service.findByUsername(username)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check privacy settings for private profiles', async () => {
      // Arrange
      const username = 'testuser';
      const currentUserId = 'current-user-123';
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'user-123',
        username: 'testuser',
        isPublic: false,
        privacy: { isFollowerOnly: true, isSubscriberOnly: false },
      });
      followsService.isFollowing.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.findByUsername(username, currentUserId),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      // Arrange
      const paginationDto: PaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'dateCreated',
        sortOrder: 'DESC',
      };

      // findAll creates TWO query builders - one for count, one for results
      const countQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
      };

      const resultsQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser as User]),
      };

      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(resultsQueryBuilder);

      // Act
      const result = await service.findAll(paginationDto);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(100);
      expect(result.data).toHaveLength(1);
    });

    it('should use default pagination if not provided', async () => {
      // Arrange
      const countQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
      };

      const resultsQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser as User]),
      };

      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(resultsQueryBuilder);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.data).toHaveLength(1);
    });

    it('should exclude system admin from results', async () => {
      // Arrange
      const countQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };

      const resultsQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser as User]),
      };

      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(resultsQueryBuilder);

      // Act
      await service.findAll();

      // Assert
      expect(countQueryBuilder.where).toHaveBeenCalledWith(
        'user.username != :systemUsername',
        { systemUsername: 'systemadmin' },
      );
      expect(resultsQueryBuilder.where).toHaveBeenCalledWith(
        'user.username != :systemUsername',
        { systemUsername: 'systemadmin' },
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockQueryBuilder.getCount.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('existsByEmail', () => {
    it('should return user if email exists', async () => {
      // Arrange
      const email = 'test@example.com';
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.existsByEmail(email);

      // Assert
      expect(result).toBe(mockUser);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
        email,
      });
    });

    it('should return null if email does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await service.existsByEmail(email);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on error and log it', async () => {
      // Arrange
      const email = 'test@example.com';
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.existsByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('existsByUsername', () => {
    it('should return user if username exists', async () => {
      // Arrange
      const username = 'testuser';
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.existsByUsername(username);

      // Assert
      expect(result).toBe(mockUser);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.username = :username',
        { username },
      );
    });

    it('should return null if username does not exist', async () => {
      // Arrange
      const username = 'nonexistent';
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await service.existsByUsername(username);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on error and log it', async () => {
      // Arrange
      const username = 'testuser';
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.existsByUsername(username);

      // Assert
      expect(result).toBeNull();
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should return full user data with all relations', async () => {
      // Arrange
      const userId = 'user-123';
      const fullUser = {
        ...mockUser,
        profile: { id: 'profile-123' },
        privacy: { id: 'privacy-123' },
        security: { id: 'security-123' },
        social: { id: 'social-123' },
      };
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        return fn();
      });
      mockQueryBuilder.getOne.mockResolvedValue(fullUser as User);

      // Act
      const result = await service.getMe(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.privacy).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.social).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        return fn();
      });
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMe(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    const updateDto = {
      username: 'newusername',
      displayName: 'New Display Name',
    };

    it('should successfully update user', async () => {
      // Arrange
      const userId = 'user-123';
      const updatedUser = {
        ...mockUser,
        username: 'newusername',
        displayName: 'New Display Name',
        profile: { id: 'profile-123' },
        privacy: { id: 'privacy-123' },
        security: { id: 'security-123' },
      };
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockUser as User) // Initial find
        .mockResolvedValueOnce(null) // Username check (not taken)
        .mockResolvedValueOnce(null) // DisplayName check (not taken)
        .mockResolvedValueOnce(updatedUser as User); // Final find in transaction
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(updatedUser as User),
        save: jest.fn().mockResolvedValue(updatedUser as User),
      };
      userRepository.manager.transaction = jest.fn().mockImplementation(
        async (callback: any) => {
          return callback(mockManager);
        },
      ) as any;
      cachingService.invalidateUser.mockResolvedValue(undefined);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.username).toBe('newusername');
      expect(cachingService.invalidateUser).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if username is already taken', async () => {
      // Arrange
      const userId = 'user-123';
      const otherUser = { ...mockUser, id: 'other-user-123', username: 'newusername' };
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockUser as User) // Initial find
        .mockResolvedValueOnce(null); // DisplayName check (not taken)

      // Mock existsByUsername - it uses query builder and returns other user (username taken)
      const existsByUsernameQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(otherUser as User), // Username already taken!
      };

      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(existsByUsernameQueryBuilder); // For existsByUsername check

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        'Username is already taken',
      );
    });
  });

  describe('delete', () => {
    it('should successfully delete user', async () => {
      // Arrange
      const userId = 'user-123';
      const userToDelete = {
        ...mockUser,
        profile: { id: 'profile-123' },
        privacy: { id: 'privacy-123' },
        security: { id: 'security-123' },
      };
      userRepository.findOne.mockResolvedValue(userToDelete as User);
      userRepository.remove = jest.fn().mockResolvedValue(userToDelete as User);
      cachingService.invalidateUser.mockResolvedValue(undefined);

      // Act
      await service.delete(userId);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['profile', 'privacy', 'security'],
      });
      expect(userRepository.remove).toHaveBeenCalledWith(userToDelete);
      expect(cachingService.invalidateUser).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(userId)).rejects.toThrow(NotFoundException);
    });

    it('should handle cache invalidation errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const userToDelete = {
        ...mockUser,
        profile: { id: 'profile-123' },
        privacy: { id: 'privacy-123' },
        security: { id: 'security-123' },
      };
      userRepository.findOne.mockResolvedValue(userToDelete as User);
      userRepository.remove = jest.fn().mockResolvedValue(userToDelete as User);
      cachingService.invalidateUser.mockRejectedValue(
        new Error('Cache error'),
      );

      // Act
      await service.delete(userId);

      // Assert
      expect(userRepository.remove).toHaveBeenCalled();
      expect(loggingService.error).toHaveBeenCalled();
    });
  });
});

