import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { createTestApp, cleanupTestData } from './test-setup';

describe('AIController (e2e)', () => {
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
        email: 'ai@example.com',
        password: 'Test123456',
        nickname: 'AIUser',
      });

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await app.close();
  });

  describe('/ai/chat (POST)', () => {
    it('should generate AI chat response with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '你好，请介绍一下塔罗牌占卜',
          context: 'tarot_introduction',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('response');
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data.response).toBeTruthy();
      expect(typeof response.body.data.response).toBe('string');
    });

    it('should not generate response without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .send({
          message: '你好',
          context: 'general',
        })
        .expect(401);
    });

    it('should not generate response with empty message', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '',
          context: 'general',
        })
        .expect(400);
    });

    it('should not generate response with missing message', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: 'general',
        })
        .expect(400);
    });

    it('should handle different context types', async () => {
      const contexts = ['tarot_reading', 'astrology', 'fortune_telling', 'general'];
      
      for (const context of contexts) {
        const response = await request
          .default(app.getHttpServer())
          .post('/ai/chat')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: `请介绍${context}相关内容`,
            context: context,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('response');
        expect(response.body.data.response).toBeTruthy();
      }
    });
  });

  describe('/ai/tarot-interpretation (POST)', () => {
    it('should generate tarot card interpretation with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/tarot-interpretation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cards: [
            {
              cardId: 1,
              cardName: 'The Fool',
              cardNameCn: '愚者',
              position: 1,
              positionName: '过去',
              isReversed: false,
            },
            {
              cardId: 2,
              cardName: 'The Magician',
              cardNameCn: '魔术师',
              position: 2,
              positionName: '现在',
              isReversed: true,
            },
          ],
          question: '我的未来发展如何？',
          spreadName: '过去现在未来',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('overallInterpretation');
      expect(response.body.data).toHaveProperty('detailedInterpretation');
      expect(response.body.data).toHaveProperty('advice');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.detailedInterpretation).toBeInstanceOf(Array);
      expect(response.body.data.detailedInterpretation.length).toBe(2);
    });

    it('should not generate interpretation without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/tarot-interpretation')
        .send({
          cards: [{
            cardId: 1,
            cardName: 'The Fool',
            position: 1,
            isReversed: false,
          }],
          question: '测试问题',
          spreadName: '单张牌',
        })
        .expect(401);
    });

    it('should not generate interpretation with empty cards array', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/tarot-interpretation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cards: [],
          question: '测试问题',
          spreadName: '单张牌',
        })
        .expect(400);
    });

    it('should not generate interpretation without question', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/tarot-interpretation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cards: [{
            cardId: 1,
            cardName: 'The Fool',
            position: 1,
            isReversed: false,
          }],
          spreadName: '单张牌',
        })
        .expect(400);
    });
  });

  describe('/ai/astrology-analysis (POST)', () => {
    it('should generate astrology analysis with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/astrology-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          birthDate: '1990-01-01',
          birthTime: '12:00',
          birthPlace: '北京',
          analysisType: 'personality',
          question: '请分析我的性格特点',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('advice');
      expect(response.body.data.analysis).toBeTruthy();
      expect(typeof response.body.data.analysis).toBe('string');
    });

    it('should not generate analysis without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/astrology-analysis')
        .send({
          birthDate: '1990-01-01',
          birthTime: '12:00',
          birthPlace: '北京',
          analysisType: 'personality',
        })
        .expect(401);
    });

    it('should not generate analysis with invalid birth date', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/astrology-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          birthDate: 'invalid-date',
          birthTime: '12:00',
          birthPlace: '北京',
          analysisType: 'personality',
        })
        .expect(400);
    });

    it('should handle different analysis types', async () => {
      const analysisTypes = ['personality', 'career', 'relationship', 'health'];
      
      for (const analysisType of analysisTypes) {
        const response = await request
          .default(app.getHttpServer())
          .post('/ai/astrology-analysis')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            birthDate: '1990-01-01',
            birthTime: '12:00',
            birthPlace: '北京',
            analysisType: analysisType,
            question: `请分析我的${analysisType}`,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('analysis');
      }
    });
  });

  describe('/ai/fortune-prediction (POST)', () => {
    it('should generate fortune prediction with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/fortune-prediction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          predictionType: 'daily',
          category: 'overall',
          userInfo: {
            birthDate: '1990-01-01',
            zodiacSign: 'capricorn',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('prediction');
      expect(response.body.data).toHaveProperty('luckyNumbers');
      expect(response.body.data).toHaveProperty('luckyColors');
      expect(response.body.data).toHaveProperty('advice');
      expect(response.body.data.prediction).toBeTruthy();
      expect(response.body.data.luckyNumbers).toBeInstanceOf(Array);
      expect(response.body.data.luckyColors).toBeInstanceOf(Array);
    });

    it('should not generate prediction without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/ai/fortune-prediction')
        .send({
          predictionType: 'daily',
          category: 'overall',
        })
        .expect(401);
    });

    it('should handle different prediction types', async () => {
      const predictionTypes = ['daily', 'weekly', 'monthly', 'yearly'];
      
      for (const predictionType of predictionTypes) {
        const response = await request
          .default(app.getHttpServer())
          .post('/ai/fortune-prediction')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            predictionType: predictionType,
            category: 'overall',
            userInfo: {
              birthDate: '1990-01-01',
              zodiacSign: 'capricorn',
            },
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('prediction');
      }
    });

    it('should handle different categories', async () => {
      const categories = ['overall', 'love', 'career', 'health', 'finance'];
      
      for (const category of categories) {
        const response = await request
          .default(app.getHttpServer())
          .post('/ai/fortune-prediction')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            predictionType: 'daily',
            category: category,
            userInfo: {
              birthDate: '1990-01-01',
              zodiacSign: 'capricorn',
            },
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('prediction');
      }
    });
  });

  describe('/ai/usage-stats (GET)', () => {
    it('should get AI usage statistics with authentication', async () => {
      // 先进行一些AI调用以生成统计数据
      await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '测试消息',
          context: 'general',
        });

      const response = await request
        .default(app.getHttpServer())
        .get('/ai/usage-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalCalls');
      expect(response.body.data).toHaveProperty('totalTokens');
      expect(response.body.data).toHaveProperty('dailyUsage');
      expect(response.body.data).toHaveProperty('monthlyUsage');
      expect(typeof response.body.data.totalCalls).toBe('number');
      expect(typeof response.body.data.totalTokens).toBe('number');
    });

    it('should not get usage stats without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .get('/ai/usage-stats')
        .expect(401);
    });

    it('should support date range filtering', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/ai/usage-stats?startDate=2023-01-01&endDate=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalCalls');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for AI endpoints', async () => {
      const promises: Promise<any>[] = [];
      
      // 发送大量并发请求
      for (let i = 0; i < 20; i++) {
        promises.push(
          request
            .default(app.getHttpServer())
            .post('/ai/chat')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              message: `测试消息 ${i}`,
              context: 'general',
            })
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // 检查是否有请求被限流
      const rateLimitedResponses = responses.filter(
        (result) => 
          result.status === 'fulfilled' && 
          (result as PromiseFulfilledResult<any>).value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000); // 增加超时时间
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      // 发送可能导致AI服务错误的请求
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: ''.repeat(10000), // 超长消息
          context: 'general',
        });

      // 应该返回错误响应而不是崩溃
      expect([400, 413, 500]).toContain(response.status);
      if (response.status !== 500) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should handle invalid context gracefully', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '测试消息',
          context: 'invalid_context_type',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});