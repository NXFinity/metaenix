import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SharesService } from './shares.service';
import { Share } from './assets/entities/share.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsService } from '../analytics/analytics.service';

describe('SharesService', () => {
  let service: SharesService;

  const mockShare: Partial<Share> = {
    id: 'share-123',
    resourceType: 'post',
    resourceId: 'post-123',
    userId: 'user-123',
    dateCreated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        {
          provide: getRepositoryToken(Share),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
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
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: CachingService,
          useValue: {
            invalidateByTags: jest.fn(),
            getOrSetUser: jest.fn(),
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

    service = module.get<SharesService>(SharesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shareResource', () => {
    it('should successfully share a resource', async () => {
      const postRepository = service['postRepository'] as jest.Mocked<Repository<Post>>;
      const dataSource = service['dataSource'] as jest.Mocked<DataSource>;
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      postRepository.findOne.mockResolvedValue({ id: 'post-123', userId: 'user-123', dateDeleted: null } as unknown as Post);
      cachingService.getOrSetUser = jest.fn().mockResolvedValue({ id: 'user-123' } as any);
      dataSource.transaction = jest.fn().mockImplementation(async (callback: any) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(null),
          save: jest.fn().mockResolvedValue(mockShare as Share),
        };
        return callback(mockManager);
      });
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const result = await service.shareResource('user-123', 'post', 'post-123', {});

      expect(result).toBeDefined();
    });
  });

  describe('hasShared', () => {
    it('should check if user has shared resource', async () => {
      const shareRepository = service['shareRepository'] as jest.Mocked<Repository<Share>>;
      shareRepository.findOne.mockResolvedValue(mockShare as Share);

      const result = await service.hasShared('user-123', 'post', 'post-123');

      expect(result).toBe(true);
    });

    it('should return false if user has not shared', async () => {
      const shareRepository = service['shareRepository'] as jest.Mocked<Repository<Share>>;
      shareRepository.findOne.mockResolvedValue(null);

      const result = await service.hasShared('user-123', 'post', 'post-123');

      expect(result).toBe(false);
    });
  });

  describe('getSharesCount', () => {
    it('should get shares count for a resource', async () => {
      const shareRepository = service['shareRepository'] as jest.Mocked<Repository<Share>>;
      shareRepository.count.mockResolvedValue(5);

      const result = await service.getSharesCount('post', 'post-123');

      expect(result).toBe(5);
    });
  });
});

