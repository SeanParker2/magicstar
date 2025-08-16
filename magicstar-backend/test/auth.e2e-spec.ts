import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { createTestApp, cleanupTestData } from './test-setup';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let testUser: Partial<User>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;

    // 清理测试数据
    await dataSource.getRepository(User).delete({});

    testUser = {
      email: 'test@example.com',
      password: 'Test123456',
      phone: '13800138000',
      nickname: 'TestUser',
    };
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user with email', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          nickname: testUser.nickname,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not register user with existing email', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          nickname: 'AnotherUser',
        })
        .expect(400);
    });

    it('should not register user with invalid email', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
          nickname: testUser.nickname,
        })
        .expect(400);
    });

    it('should not register user with weak password', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123',
          nickname: testUser.nickname,
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not login with invalid email', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should not login with invalid password', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    let authToken: string;

    beforeAll(async () => {
      // 获取认证token
      const loginResponse = await request
        .default(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      
      authToken = loginResponse.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should not get profile without token', async () => {
      await request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should not get profile with invalid token', async () => {
      await request
        .default(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/phone-login (POST)', () => {
    beforeAll(async () => {
      // 创建一个手机号用户
      await request
        .default(app.getHttpServer())
        .post('/auth/register')
        .send({
          phone: testUser.phone,
          password: testUser.password,
          nickname: 'PhoneUser',
        });
    });

    it('should login with phone and password', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/auth/phone-login')
        .send({
          phone: testUser.phone,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not login with invalid phone', async () => {
      await request
        .default(app.getHttpServer())
        .post('/auth/phone-login')
        .send({
          phone: '99999999999',
          password: testUser.password,
        })
        .expect(401);
    });
  });
});