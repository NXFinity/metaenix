import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitorService } from './performance-monitor.service';
import { RedisService } from '@redis/redis';
import { LoggingService } from '@logging/logging';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitorService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PerformanceMonitorService>(PerformanceMonitorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMetric', () => {
    it('should record performance metric', async () => {
      const redisService = service['redisService'] as jest.Mocked<RedisService>;
      redisService.set.mockResolvedValue('OK');
      redisService.get.mockResolvedValue(null);

      await expect(service.recordMetric({
        endpoint: '/test',
        method: 'GET',
        duration: 100,
        statusCode: 200,
        timestamp: new Date(),
      })).resolves.not.toThrow();
    });
  });
});

