import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketService } from './websocket.service';
import { RedisService } from '@redis/redis';
import { LoggingService } from '@logging/logging';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            keyBuilder: {
              build: jest.fn((...args) => args.join(':')),
            },
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

    service = module.get<WebSocketService>(WebSocketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeConnection', () => {
    it('should store websocket connection', async () => {
      const redisService = service['redisService'] as jest.Mocked<RedisService>;
      redisService.set.mockResolvedValue('OK');

      await expect(service.storeConnection('ws-123', 'socket-123', 'user-123')).resolves.not.toThrow();
    });
  });

  describe('removeConnection', () => {
    it('should remove websocket connection', async () => {
      const redisService = service['redisService'] as jest.Mocked<RedisService>;
      redisService.del.mockResolvedValue(1);

      await expect(service.removeConnection('ws-123', 'user-123')).resolves.not.toThrow();
    });
  });
});

