import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../../src/security/auth/auth.module';
import { AuthService } from '../../src/security/auth/auth.service';
import { UsersService } from '../../src/rest/api/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthController (Integration)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        login: jest.fn(),
        register: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerifyEmail: jest.fn(),
        refreshToken: jest.fn(),
        logout: jest.fn(),
      })
      .overrideProvider(UsersService)
      .useValue({
        findByEmail: jest.fn(),
        create: jest.fn(),
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

    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /v1/auth/login', () => {
    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });

    it('should return 401 for invalid credentials', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 200 for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'Member',
      };

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });
  });

  describe('POST /v1/auth/register', () => {
    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          username: 'testuser',
        })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          username: 'testuser',
        })
        .expect(400);
    });

    it('should return 201 for valid registration', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      (authService.register as jest.Mock).mockResolvedValue({
        user: mockUser,
        message: 'Registration successful',
      });

      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          username: 'testuser',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('message');
        });
    });
  });
});

