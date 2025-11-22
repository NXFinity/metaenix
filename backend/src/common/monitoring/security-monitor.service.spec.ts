import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMonitorService } from './security-monitor.service';
import { RedisService } from '@redis/redis';
import { AuditLogService } from '@logging/logging';

describe('SecurityMonitorService', () => {
  let service: SecurityMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMonitorService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            saveAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityMonitorService>(SecurityMonitorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordEvent', () => {
    it('should record security event', async () => {
      const redisService = service['redisService'] as jest.Mocked<RedisService>;
      redisService.set.mockResolvedValue('OK');
      redisService.get.mockResolvedValue(null);
      redisService.incr.mockResolvedValue(1);

      await expect(
        service.recordEvent({
          type: 'failed_login',
          userId: 'user-123',
          severity: 'medium',
          timestamp: new Date(),
        }),
      ).resolves.not.toThrow();
    });
  });
});

