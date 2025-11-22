import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';
import { Video } from './assets/entities/video.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { StorageService } from 'src/rest/storage/storage.service';
import { TrackingService } from 'src/services/tracking/tracking.service';
import { AnalyticsService } from 'src/services/analytics/analytics.service';

describe('VideosService', () => {
  let service: VideosService;
  let videoRepository: jest.Mocked<Repository<Video>>;

  const mockVideo: Partial<Video> = {
    id: 'video-123',
    userId: 'user-123',
    videoUrl: 'https://example.com/video.mp4',
    status: 'ready',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        {
          provide: getRepositoryToken(Video),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
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
            invalidateByTags: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
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

    service = module.get<VideosService>(VideosService);
    videoRepository = module.get(getRepositoryToken(Video));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVideoById', () => {
    it('should successfully get a video', async () => {
      videoRepository.findOne.mockResolvedValue(mockVideo as Video);

      const result = await service.getVideoById('video-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('video-123');
    });

    it('should throw error if video not found', async () => {
      videoRepository.findOne.mockResolvedValue(null);

      await expect(service.getVideoById('invalid', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

