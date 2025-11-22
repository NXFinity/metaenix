import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Authentication E2E', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'e2e-test@example.com',
          password: 'TestPassword123!',
          username: 'e2etestuser',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('username');
          expect(res.body.user).toHaveProperty('email');
        });
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          username: 'user1',
        })
        .expect(201);

      // Duplicate registration
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          username: 'user2',
        })
        .expect(409);
    });

    it('should reject duplicate username registration', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'TestPassword123!',
          username: 'duplicateuser',
        })
        .expect(201);

      // Duplicate registration
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'TestPassword123!',
          username: 'duplicateuser',
        })
        .expect(409);
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'login-test@example.com',
          password: 'TestPassword123!',
          username: 'logintest',
        })
        .expect(201);

      // Login
      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'TestPassword123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Register and login
      const registerResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'refresh-test@example.com',
          password: 'TestPassword123!',
          username: 'refreshtest',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'refresh-test@example.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh token
      return request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });
  });
});

