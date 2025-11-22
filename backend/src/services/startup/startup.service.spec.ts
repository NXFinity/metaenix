import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StartupService } from './startup.service';
import { CachingService } from '@caching/caching';
import { UsersService } from '../../rest/api/users/users.service';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '@logging/logging';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';

describe('StartupService', () => {
  let service: StartupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupService,
        {
          provide: getRepositoryToken(Post),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: CachingService,
          useValue: {
            getOrSetUser: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
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

    service = module.get<StartupService>(StartupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize service', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });
});

