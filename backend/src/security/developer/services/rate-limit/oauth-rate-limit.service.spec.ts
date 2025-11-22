import { Test, TestingModule } from '@nestjs/testing';
import { OAuthRateLimitService } from './oauth-rate-limit.service';
import { RedisService } from '@redis/redis';
import { Application } from '../../assets/entities/application.entity';
import { ApplicationEnvironment } from '../../assets/enum/application-environment.enum';
import { ApplicationStatus } from '../../assets/enum/application-status.enum';

describe('OAuthRateLimitService', () => {
  let service: OAuthRateLimitService;
  let redisService: jest.Mocked<RedisService>;

  const mockApplication: Partial<Application> = {
    id: 'app-123',
    clientId: 'test-client',
    environment: ApplicationEnvironment.DEVELOPMENT,
    status: ApplicationStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthRateLimitService,
        {
          provide: RedisService,
          useValue: {
            eval: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthRateLimitService>(OAuthRateLimitService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should check rate limit for client', async () => {
      redisService.eval.mockResolvedValue([5, 95, Date.now() + 3600, 100] as any);

      const result = await service.checkRateLimit(mockApplication as Application, 'user-123');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(typeof result.allowed).toBe('boolean');
    });
  });
});

