import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Posts E2E', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login to get access token
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: 'posts-e2e@example.com',
        password: 'TestPassword123!',
        username: 'postse2e',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'posts-e2e@example.com',
        password: 'TestPassword123!',
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/posts', () => {
    it('should create a new post', () => {
      return request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'This is a test post for E2E testing',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('content');
          expect(res.body).toHaveProperty('userId');
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/v1/posts')
        .send({
          content: 'This should fail without auth',
        })
        .expect(401);
    });
  });

  describe('GET /v1/posts', () => {
    it('should return paginated posts', async () => {
      // Create a post first
      await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Post for listing test',
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/v1/posts')
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('total');
        });
    });
  });

  describe('GET /v1/posts/:id', () => {
    it('should return a specific post', async () => {
      // Create a post
      const createResponse = await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Post for detail test',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Get the post
      return request(app.getHttpServer())
        .get(`/v1/posts/${postId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', postId);
          expect(res.body).toHaveProperty('content');
        });
    });

    it('should return 404 for non-existent post', () => {
      return request(app.getHttpServer())
        .get('/v1/posts/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });
  });

  describe('PATCH /v1/posts/:id', () => {
    it('should update a post', async () => {
      // Create a post
      const createResponse = await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Original content',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Update the post
      return request(app.getHttpServer())
        .patch(`/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Updated content',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', postId);
          expect(res.body).toHaveProperty('content', 'Updated content');
        });
    });

    it('should require authentication', async () => {
      // Create a post
      const createResponse = await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Post to update',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Try to update without auth
      return request(app.getHttpServer())
        .patch(`/v1/posts/${postId}`)
        .send({
          content: 'Should fail',
        })
        .expect(401);
    });
  });

  describe('DELETE /v1/posts/:id', () => {
    it('should delete a post', async () => {
      // Create a post
      const createResponse = await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Post to delete',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Delete the post
      return request(app.getHttpServer())
        .delete(`/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should require authentication', async () => {
      // Create a post
      const createResponse = await request(app.getHttpServer())
        .post('/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Post to delete',
        })
        .expect(201);

      const postId = createResponse.body.id;

      // Try to delete without auth
      return request(app.getHttpServer())
        .delete(`/v1/posts/${postId}`)
        .expect(401);
    });
  });
});

