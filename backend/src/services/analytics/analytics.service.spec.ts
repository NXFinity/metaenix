import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { LoggingService } from '@logging/logging';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateUserAnalytics', () => {
    it('should calculate user analytics', async () => {
      const viewTrackRepository = service['viewTrackRepository'] as jest.Mocked<Repository<ViewTrack>>;
      const userAnalyticsRepository = service['userAnalyticsRepository'] as jest.Mocked<Repository<UserAnalytics>>;
      
      viewTrackRepository.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: 10 }),
      })) as any;
      
      userAnalyticsRepository.findOne.mockResolvedValue(null);
      userAnalyticsRepository.create.mockReturnValue({} as UserAnalytics);
      userAnalyticsRepository.save.mockResolvedValue({} as UserAnalytics);

      await expect(service.calculateUserAnalytics('user-123')).resolves.not.toThrow();
    });
  });

  describe('calculatePostAnalytics', () => {
    it('should calculate post analytics', async () => {
      const viewTrackRepository = service['viewTrackRepository'] as jest.Mocked<Repository<ViewTrack>>;
      const postAnalyticsRepository = service['postAnalyticsRepository'] as jest.Mocked<Repository<PostAnalytics>>;
      
      viewTrackRepository.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: 5 }),
      })) as any;
      
      postAnalyticsRepository.findOne.mockResolvedValue(null);
      postAnalyticsRepository.create.mockReturnValue({} as PostAnalytics);
      postAnalyticsRepository.save.mockResolvedValue({} as PostAnalytics);

      await expect(service.calculatePostAnalytics('post-123')).resolves.not.toThrow();
    });
  });
});

