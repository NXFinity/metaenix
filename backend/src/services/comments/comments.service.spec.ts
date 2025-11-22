import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './assets/entities/comment.entity';
import { Post } from '../../rest/api/users/services/posts/assets/entities/post.entity';
import { Video } from '../../rest/api/users/services/videos/assets/entities/video.entity';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import { LoggingService } from '@logging/logging';
import { CachingService } from '@caching/caching';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsService } from '../analytics/analytics.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepository: jest.Mocked<Repository<Comment>>;

  const mockComment: Partial<Comment> = {
    id: 'comment-123',
    resourceType: 'post',
    resourceId: 'post-123',
    userId: 'user-123',
    content: 'Test comment',
    dateCreated: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
            findAndCount: jest.fn(),
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
            getOrSetUser: jest.fn().mockImplementation(async (_key, _id, fn) => await fn()),
            invalidateByTags: jest.fn().mockResolvedValue(undefined),
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
            trackComment: jest.fn(),
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

    service = module.get<CommentsService>(CommentsService);
    commentRepository = module.get(getRepositoryToken(Comment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('should successfully upload a comment', async () => {
      const postRepository = service['postRepository'] as jest.Mocked<Repository<Post>>;
      postRepository.findOne.mockResolvedValue({ id: 'post-123', userId: 'post-owner-123', allowComments: true, dateDeleted: null } as unknown as Post);
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      cachingService.getOrSetUser.mockImplementation(async (_key, _id, fn) => {
        const user = await fn();
        return user;
      });
      const userRepository = service['userRepository'] as jest.Mocked<Repository<User>>;
      userRepository.findOne.mockResolvedValue({ id: 'user-123' } as User);
      const dataSource = service['dataSource'] as jest.Mocked<DataSource>;
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          create: jest.fn().mockReturnValue(mockComment as Comment),
          save: jest.fn().mockResolvedValue(mockComment as Comment),
          findOne: jest.fn().mockResolvedValue(null),
        };
        return await callback(mockManager);
      });
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      commentRepository.findOne.mockResolvedValue(mockComment as Comment);

      const result = await service.createComment('user-123', 'post', 'post-123', {
        content: 'Test comment',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getComments', () => {
    it('should successfully get comments for a resource', async () => {
      const postRepository = service['postRepository'] as jest.Mocked<Repository<Post>>;
      postRepository.findOne.mockResolvedValue({ id: 'post-123', userId: 'user-123', allowComments: true, dateDeleted: null } as unknown as Post);
      commentRepository.findAndCount = jest.fn().mockResolvedValue([[mockComment as Comment], 1]);
      commentRepository.find = jest.fn().mockResolvedValue([]);

      const result = await service.getComments('post', 'post-123', {});

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getCommentById', () => {
    it('should successfully get a comment by ID', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment as Comment);

      const result = await service.getCommentById('comment-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('comment-123');
    });
  });

  describe('deleteComment', () => {
    it('should successfully delete a comment', async () => {
      const mockCommentWithUser = {
        ...mockComment,
        userId: 'user-123',
        dateDeleted: null,
        parentCommentId: null,
        resourceType: 'post',
        resourceId: 'post-123',
      } as unknown as Comment;
      commentRepository.findOne.mockResolvedValue(mockCommentWithUser);
      const dataSource = service['dataSource'] as jest.Mocked<DataSource>;
      dataSource.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          decrement: jest.fn().mockResolvedValue(undefined),
          softDelete: jest.fn().mockResolvedValue(undefined),
        };
        return await callback(mockManager);
      });
      const cachingService = service['cachingService'] as jest.Mocked<CachingService>;
      cachingService.invalidateByTags.mockResolvedValue(undefined);
      const analyticsService = service['analyticsService'] as jest.Mocked<AnalyticsService>;
      (analyticsService.calculatePostAnalytics as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      await service.deleteComment('user-123', 'comment-123');

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw error if user not owner', async () => {
      const mockCommentWithUser = {
        ...mockComment,
        userId: 'other-user',
        dateDeleted: null,
        parentCommentId: null,
        resourceType: 'post',
        resourceId: 'post-123',
      } as unknown as Comment;
      commentRepository.findOne.mockResolvedValue(mockCommentWithUser);

      await expect(service.deleteComment('user-123', 'comment-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

