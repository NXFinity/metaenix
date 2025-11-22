import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { Application } from './assets/entities/application.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { ScopeService } from './services/scopes/scope.service';
import { ApplicationStatus } from './assets/enum/application-status.enum';
import * as crypto from 'crypto';

jest.mock('crypto');

describe('DeveloperService', () => {
  let service: DeveloperService;
  let applicationRepository: jest.Mocked<Repository<Application>>;

  const mockApplication: Partial<Application> = {
    id: 'app-123',
    userId: 'user-123',
    name: 'Test App',
    clientId: 'test-client-id',
    clientSecret: 'hashed-secret',
    status: ApplicationStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeveloperService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            getAllScopes: jest.fn().mockReturnValue([]),
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

    service = module.get<DeveloperService>(DeveloperService);
    applicationRepository = module.get(getRepositoryToken(Application));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApplication', () => {
    it('should successfully upload an application', async () => {
      (crypto.randomBytes as jest.Mock) = jest.fn().mockReturnValue(Buffer.from('test'));
      applicationRepository.create.mockReturnValue(mockApplication as Application);
      applicationRepository.save.mockResolvedValue(mockApplication as Application);

      const result = await service.createApplication('user-123', {
        name: 'Test App',
        redirectUris: ['https://example.com'],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test App');
    });
  });

  describe('findApplication', () => {
    it('should successfully find an application', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);

      const result = await service.findApplication('app-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('app-123');
    });

    it('should throw error if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(service.findApplication('invalid', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateApplication', () => {
    it('should successfully update an application', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);
      applicationRepository.save.mockResolvedValue({
        ...mockApplication,
        name: 'Updated App',
      } as Application);

      const result = await service.updateApplication('app-123', 'user-123', {
        name: 'Updated App',
      });

      expect(result.name).toBe('Updated App');
    });
  });

  describe('deleteApplication', () => {
    it('should successfully delete an application', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);
      applicationRepository.remove.mockResolvedValue(mockApplication as Application);

      await service.deleteApplication('app-123', 'user-123');

      expect(applicationRepository.remove).toHaveBeenCalled();
    });
  });

  describe('regenerateSecret', () => {
    it('should successfully regenerate client secret', async () => {
      (crypto.randomBytes as jest.Mock) = jest.fn().mockReturnValue(Buffer.from('new-secret'));
      applicationRepository.findOne.mockResolvedValue(mockApplication as Application);
      applicationRepository.save.mockResolvedValue(mockApplication as Application);

      const result = await service.regenerateSecret('app-123', 'user-123');

      expect(result).toHaveProperty('clientSecret');
    });
  });
});

