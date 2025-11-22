import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '../../src/rest/api/users/users.module';
import { UsersService } from '../../src/rest/api/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('UsersController (Integration)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(UsersService)
      .useValue({
        findAll: jest.fn(),
        findOne: jest.fn(),
        findMe: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .overrideProvider(JwtService)
      .useValue({
        sign: jest.fn(),
        verify: jest.fn(),
      })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn(),
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

    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v1/users', () => {
    it('should return paginated users', async () => {
      const mockUsers = {
        data: [
          { id: '1', username: 'user1' },
          { id: '2', username: 'user2' },
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

      (usersService.findAll as jest.Mock).mockResolvedValue(mockUsers);

      return request(app.getHttpServer())
        .get('/v1/users')
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
        .get('/v1/users')
        .query({ page: -1, limit: 0 })
        .expect(400);
    });
  });

  describe('GET /v1/users/:id', () => {
    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/v1/users/invalid-uuid')
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/v1/users/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });

    it('should return user for valid UUID', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
      };

      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      return request(app.getHttpServer())
        .get('/v1/users/123e4567-e89b-12d3-a456-426614174000')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username');
        });
    });
  });
});

