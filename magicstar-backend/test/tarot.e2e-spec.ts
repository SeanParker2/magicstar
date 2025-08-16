import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { TarotCard } from '../src/modules/divination/entities/tarot-card.entity';
import { TarotSpread } from '../src/modules/divination/entities/tarot-spread.entity';
import { TarotReading } from '../src/modules/divination/entities/tarot-reading.entity';
import { createTestApp, cleanupTestData } from './test-setup';

describe('TarotController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;

    // 创建测试用户
    const registerResponse = await request
      .default(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'tarot@example.com',
        password: 'Test123456',
        nickname: 'TarotUser',
      });

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await app.close();
  });

  describe('/tarot/cards (GET)', () => {
    it('should get all tarot cards', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/tarot/cards')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // 验证卡片结构
      const card = response.body.data[0];
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('suit');
      expect(card).toHaveProperty('number');
      expect(card).toHaveProperty('uprightMeaning');
      expect(card).toHaveProperty('reversedMeaning');
    });

    it('should cache tarot cards on subsequent requests', async () => {
      const start1 = Date.now();
      await request
        .default(app.getHttpServer())
        .get('/tarot/cards')
        .expect(200);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request
        .default(app.getHttpServer())
        .get('/tarot/cards')
        .expect(200);
      const time2 = Date.now() - start2;

      // 第二次请求应该更快（来自缓存）
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('/tarot/spreads (GET)', () => {
    it('should get all tarot spreads', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/tarot/spreads')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // 验证牌阵结构
      const spread = response.body.data[0];
      expect(spread).toHaveProperty('id');
      expect(spread).toHaveProperty('name');
      expect(spread).toHaveProperty('description');
      expect(spread).toHaveProperty('cardCount');
      expect(spread).toHaveProperty('positions');
    });
  });

  describe('/tarot/reading (POST)', () => {
    let spreadId: string;

    beforeAll(async () => {
      // 获取一个牌阵ID
      const spreadsResponse = await request
        .default(app.getHttpServer())
        .get('/tarot/spreads');
      
      spreadId = spreadsResponse.body.data[0].id;
    });

    it('should perform a tarot reading with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
          question: '我的未来会怎样？',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('question', '我的未来会怎样？');
      expect(response.body.data).toHaveProperty('cards');
      expect(response.body.data).toHaveProperty('interpretation');
      expect(response.body.data).toHaveProperty('spread');
      expect(response.body.data.cards).toBeInstanceOf(Array);
      expect(response.body.data.cards.length).toBeGreaterThan(0);
    });

    it('should not perform reading without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .send({
          spreadId: spreadId,
          question: '测试问题',
        })
        .expect(401);
    });

    it('should not perform reading with invalid spread ID', async () => {
      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: 'invalid-spread-id',
          question: '测试问题',
        })
        .expect(400);
    });

    it('should not perform reading without question', async () => {
      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
        })
        .expect(400);
    });

    it('should not perform reading with empty question', async () => {
      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
          question: '',
        })
        .expect(400);
    });
  });

  describe('/tarot/readings (GET)', () => {
    beforeAll(async () => {
      // 创建一些测试占卜记录
      const spreadsResponse = await request
        .default(app.getHttpServer())
        .get('/tarot/spreads');
      
      const spreadId = spreadsResponse.body.data[0].id;

      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
          question: '第一次占卜',
        });

      await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
          question: '第二次占卜',
        });
    });

    it('should get user reading history with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/tarot/readings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // 验证占卜记录结构
      const reading = response.body.data[0];
      expect(reading).toHaveProperty('id');
      expect(reading).toHaveProperty('question');
      expect(reading).toHaveProperty('createdAt');
      expect(reading).toHaveProperty('spread');
    });

    it('should not get readings without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .get('/tarot/readings')
        .expect(401);
    });

    it('should support pagination', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/tarot/readings?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('/tarot/readings/:id (GET)', () => {
    let readingId: string;

    beforeAll(async () => {
      // 创建一个测试占卜记录
      const spreadsResponse = await request
        .default(app.getHttpServer())
        .get('/tarot/spreads');
      
      const spreadId = spreadsResponse.body.data[0].id;

      const readingResponse = await request
        .default(app.getHttpServer())
        .post('/tarot/reading')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          spreadId: spreadId,
          question: '详细占卜测试',
        });

      readingId = readingResponse.body.data.id;
    });

    it('should get specific reading details with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/tarot/readings/${readingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', readingId);
      expect(response.body.data).toHaveProperty('question');
      expect(response.body.data).toHaveProperty('cards');
      expect(response.body.data).toHaveProperty('interpretation');
      expect(response.body.data).toHaveProperty('spread');
    });

    it('should not get reading details without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/tarot/readings/${readingId}`)
        .expect(401);
    });

    it('should not get non-existent reading', async () => {
      await request
        .default(app.getHttpServer())
        .get('/tarot/readings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});