import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LikesService } from './likes.service';
import { Like } from './assets/entities/like.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { Comment } from '../comments/assets/entities/comment.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsService } from '../analytics/analytics.service';

describe('LikesService', () => {
  let service: LikesService;
  let likeRepository: jest.Mocked<Repository<Like>>;

  const mockLike: Partial<Like> = {
    id: 'like-123',
    resourceType: 'post',
    resourceId: 'post-123',
    userId: 'user-123',
    dateCreated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: getRepositoryToken(Like),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Post),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Video),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            findOne: jest.fn(),
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
            invalidateByTags: jest.fn().mockResolvedValue(undefined),
            getOrSetUser: jest.fn().mockImplementation(async (_key, _id, fn) => await fn()),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            calculatePostAnalytics: jest.fn(),
            calculateVideoAnalytics: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
    likeRepository = module.get(getRepositoryToken(Like));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('likeResource', () => {
    it('should successfully like a resource', async () => {
      const postRepository = service['postRepository'] as jest.Mocked<Repository<Post>>;
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      postRepository.findOne.mockResolvedValue({ id: 'post-123', userId: 'post-owner-123', dateDeleted: null } as unknown as Post);
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => await fn());
      const userRepository = service['userRepository'] as jest.Mocked<Repository<User>>;
      userRepository.findOne.mockResolvedValue({ id: 'user-123' } as User);
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.create.mockReturnValue(mockLike as Like);
      likeRepository.save.mockResolvedValue(mockLike as Like);
      cachingService.invalidateByTags.mockResolvedValue(undefined);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const result = await service.likeResource('user-123', 'post', 'post-123');

      expect(result).toBeDefined();
      expect(likeRepository.save).toHaveBeenCalled();
    });
  });

  describe('unlikeResource', () => {
    it('should successfully unlike a resource', async () => {
      likeRepository.findOne.mockResolvedValue(mockLike as Like);
      likeRepository.remove.mockResolvedValue(mockLike as Like);
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      cachingService.invalidateByTags.mockResolvedValue(undefined);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      await service.unlikeResource('user-123', 'post', 'post-123');

      expect(likeRepository.remove).toHaveBeenCalled();
    });
  });
});

