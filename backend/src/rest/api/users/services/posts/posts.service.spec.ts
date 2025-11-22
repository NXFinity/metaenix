import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './assets/entities/post.entity';
import { Like } from 'src/services/likes/assets/entities/like.entity';
import { Share } from 'src/services/shares/assets/entities/share.entity';
import { Bookmark } from './assets/entities/bookmark.entity';
import { Report } from './assets/entities/report.entity';
import { Reaction } from './assets/entities/reaction.entity';
import { Collection } from './assets/entities/collection.entity';
import { User } from '../../assets/entities/user.entity';
import { Follow } from '../follows/assets/entities/follow.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { StorageService } from 'src/rest/storage/storage.service';
import { VideosService } from '../videos/videos.service';
import { TrackingService } from 'src/services/tracking/tracking.service';
import { AnalyticsService } from 'src/services/analytics/analytics.service';

describe('PostsService', () => {
  let service: PostsService;
  let postRepository: jest.Mocked<Repository<Post>>;
  let cachingService: jest.Mocked<CachingService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockPost: Partial<Post> = {
    id: 'post-123',
    userId: 'user-123',
    content: 'Test post content',
    user: mockUser as User,
    dateCreated: new Date(),
    isPublic: true,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(Post),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Like),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Share),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Bookmark),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Reaction),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CachingService,
          useValue: {
            getOrSetUser: jest.fn(),
            invalidateByTags: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: VideosService,
          useValue: {
            getVideoById: jest.fn(),
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
            trackPostView: jest.fn(),
            calculatePostAnalytics: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postRepository = module.get(getRepositoryToken(Post));
    cachingService = module.get(CachingService);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should successfully upload a post', async () => {
      const createPostDto = {
        content: 'Test post content',
        isPublic: true,
      };

      (cachingService.getOrSetUser as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockUser as User);
      postRepository.create.mockReturnValue(mockPost as Post);
      postRepository.save.mockResolvedValue(mockPost as Post);

      const result = await service.createPost('user-123', createPostDto as any);

      expect(result).toBeDefined();
      expect(postRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (cachingService.getOrSetUser as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(
        service.createPost('user-123', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if no content or media', async () => {
      (cachingService.getOrSetUser as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockUser as User);

      await expect(service.createPost('user-123', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should successfully find a post', async () => {
      postRepository.findOne.mockResolvedValue(mockPost as Post);

      const result = await service.findOne('post-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('post-123');
    });

    it('should throw error if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockPost as Post], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, 'user-123');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updatePost', () => {
    it('should successfully update a post', async () => {
      const updateDto = { content: 'Updated content' };
      postRepository.findOne.mockResolvedValue(mockPost as Post);
      postRepository.save.mockResolvedValue({
        ...mockPost,
        content: 'Updated content',
      } as Post);

      const result = await service.updatePost('post-123', updateDto, 'user-123');

      expect(result.content).toBe('Updated content');
    });

    it('should throw error if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePost('user-123', 'invalid', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if user not owner', async () => {
      const otherUserPost = { ...mockPost, userId: 'other-user' };
      postRepository.findOne.mockResolvedValue(otherUserPost as Post);

      await expect(
        service.updatePost('user-123', 'post-123', { content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      postRepository.findOne.mockResolvedValue(mockPost as Post);
      postRepository.remove.mockResolvedValue(mockPost as Post);

      await service.deletePost('post-123', 'user-123');

      expect(postRepository.remove).toHaveBeenCalled();
    });

    it('should throw error if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost('invalid', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('likePost', () => {
    it('should successfully like a post', async () => {
      const likeRepository = service['likeRepository'] as jest.Mocked<Repository<Like>>;
      postRepository.findOne.mockResolvedValue(mockPost as Post);
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.save.mockResolvedValue({
        id: 'like-123',
        resourceType: 'post',
        resourceId: 'post-123',
        userId: 'user-123',
      } as Like);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      const eventEmitter = service['eventEmitter'] as any;
      eventEmitter.emit = jest.fn();

      const result = await service.likePost('user-123', 'post-123');

      expect(result).toBeDefined();
    });
  });

  describe('sharePost', () => {
    it('should successfully share a post', async () => {
      const shareRepository = service['shareRepository'] as jest.Mocked<Repository<Share>>;
      postRepository.findOne.mockResolvedValue(mockPost as Post);
      shareRepository.findOne.mockResolvedValue(null);
      shareRepository.save.mockResolvedValue({
        id: 'share-123',
        resourceType: 'post',
        resourceId: 'post-123',
        userId: 'user-123',
      } as Share);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      const eventEmitter = service['eventEmitter'] as any;
      eventEmitter.emit = jest.fn();

      const result = await service.sharePost('user-123', 'post-123');

      expect(result).toBeDefined();
    });
  });

  describe('bookmarkPost', () => {
    it('should successfully bookmark a post', async () => {
      const bookmarkRepository = service[
        'bookmarkRepository'
      ] as jest.Mocked<Repository<Bookmark>>;
      postRepository.findOne.mockResolvedValue(mockPost as Post);
      bookmarkRepository.findOne.mockResolvedValue(null);
      bookmarkRepository.save.mockResolvedValue({
        id: 'bookmark-123',
        postId: 'post-123',
        userId: 'user-123',
      } as Bookmark);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const result = await service.bookmarkPost('user-123', 'post-123');

      expect(result).toBeDefined();
    });
  });
});

