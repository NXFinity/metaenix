import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './assets/entities/notification.entity';
import { User } from '../../assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;

  const mockNotification: Partial<Notification> = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'like',
    message: 'Test notification',
    dateCreated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
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
          provide: LoggingService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should successfully upload a notification', async () => {
      const userRepository = service['userRepository'] as jest.Mocked<Repository<User>>;
      userRepository.findOne.mockResolvedValue({ id: 'user-123' } as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);

      const result = await service.createNotification('user-123', {
        type: 'like' as any,
        title: 'Test',
        message: 'Test notification',
      });

      expect(result).toBeDefined();
      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should successfully mark notification as read', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      notificationRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      await service.markAsRead('user-123', 'notif-123');

      expect(notificationRepository.update).toHaveBeenCalled();
    });
  });
});

