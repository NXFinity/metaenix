import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { PostsModule } from '../../src/rest/api/users/services/posts/posts.module';
import { PostsService } from '../../src/rest/api/users/services/posts/posts.service';
import { CommentsService } from '../../src/services/comments/comments.service';
import { LikesService } from '../../src/services/likes/likes.service';
import { SharesService } from '../../src/services/shares/shares.service';

describe('PostsController (Integration)', () => {
  let app: INestApplication<App>;
  let postsService: PostsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostsModule],
    })
      .overrideProvider(PostsService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .overrideProvider(CommentsService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .overrideProvider(LikesService)
      .useValue({
        toggleLike: jest.fn(),
      })
      .overrideProvider(SharesService)
      .useValue({
        share: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    postsService = moduleFixture.get<PostsService>(PostsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v1/posts', () => {
    it('should return paginated posts', async () => {
      const mockPosts = {
        data: [
          { id: '1', content: 'Post 1' },
          { id: '2', content: 'Post 2' },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      (postsService.findAll as jest.Mock).mockResolvedValue(mockPosts);

      return request(app.getHttpServer())
        .get('/v1/posts')
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should validate pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/v1/posts')
        .query({ page: -1, limit: 0 })
        .expect(400);
    });
  });

  describe('GET /v1/posts/:id', () => {
    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/v1/posts/invalid-uuid')
        .expect(400);
    });

    it('should return 404 for non-existent post', async () => {
      (postsService.findOne as jest.Mock).mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/v1/posts/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });

    it('should return post for valid UUID', async () => {
      const mockPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test post',
        userId: 'user-123',
      };

      (postsService.findOne as jest.Mock).mockResolvedValue(mockPost);

      return request(app.getHttpServer())
        .get('/v1/posts/123e4567-e89b-12d3-a456-426614174000')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('content');
        });
    });
  });

  describe('POST /v1/posts', () => {
    it('should return 400 for missing content', () => {
      return request(app.getHttpServer())
        .post('/v1/posts')
        .send({})
        .expect(400);
    });

    it('should return 400 for content exceeding max length', () => {
      return request(app.getHttpServer())
        .post('/v1/posts')
        .send({
          content: 'a'.repeat(1001), // Assuming max length is 1000
        })
        .expect(400);
    });
  });
});

