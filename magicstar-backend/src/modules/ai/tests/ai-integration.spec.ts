import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AiModule } from '../ai.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

describe('AI Module Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [],
          synchronize: true,
        }),
        // CacheModule.register({ // 在测试中使用mock
        //   isGlobal: true,
        //   ttl: 300,
        // }),
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        PassportModule,
        AiModule,
      ],
    })
      .overrideProvider('OPENAI_API_KEY')
      .useValue('test-api-key')
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 生成测试用的JWT token
    const jwt = app.get(JwtService);
    authToken = jwt.sign({ sub: 'test-user-id', username: 'testuser' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/ai/interpretation/generate (POST)', () => {
    it('should generate tarot interpretation successfully', async () => {
      const tarotRequest = {
        divinationData: {
          type: 'tarot',
          question: '我的事业发展如何？',
          cards: [
            {
              name: '皇帝',
              position: '过去',
              isReversed: false,
              meaning: '权威与控制',
              keywords: ['权威', '稳定', '控制'],
            },
            {
              name: '星星',
              position: '现在',
              isReversed: false,
              meaning: '希望与指引',
              keywords: ['希望', '灵感', '指引'],
            },
            {
              name: '太阳',
              position: '未来',
              isReversed: false,
              meaning: '成功与快乐',
              keywords: ['成功', '快乐', '成就'],
            },
          ],
        },
        options: {
          language: 'zh-CN',
          tone: 'professional',
          detailLevel: 'detailed',
          focusAreas: ['career', 'growth'],
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tarotRequest)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('type', 'tarot');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('detailedAnalysis');
      expect(response.body.data).toHaveProperty('personalizedMessages');
      expect(response.body.data).toHaveProperty('qualityScore');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data.qualityScore).toBeGreaterThan(0);
      expect(response.body.data.confidence).toBeGreaterThan(0);
    });

    it('should generate astrology interpretation successfully', async () => {
      const astrologyRequest = {
        divinationData: {
          type: 'astrology',
          question: '我的性格特点是什么？',
          birthInfo: {
            birthDate: '1990-06-15',
            birthTime: '14:30',
            birthPlace: '北京',
            sunSign: '双子座',
            moonSign: '天秤座',
            risingSign: '处女座',
          },
        },
        options: {
          language: 'zh-CN',
          tone: 'mystical',
          detailLevel: 'standard',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(astrologyRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('astrology');
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.detailedAnalysis).toBeDefined();
    });

    it('should generate numerology interpretation successfully', async () => {
      const numerologyRequest = {
        divinationData: {
          type: 'numerology',
          question: '我的生命数字有什么含义？',
          numbers: {
            lifePathNumber: 7,
            birthDate: '1985-12-03',
            destinyNumber: 9,
            soulNumber: 3,
          },
        },
        options: {
          language: 'zh-CN',
          tone: 'scientific',
          detailLevel: 'brief',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(numerologyRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('numerology');
      expect(response.body.data.summary).toBeDefined();
    });

    it('should handle invalid request data', async () => {
      const invalidRequest = {
        divinationData: {
          type: 'invalid_type',
          question: '',
        },
      };

      await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should require authentication', async () => {
      const validRequest = {
        divinationData: {
          type: 'tarot',
          question: '测试问题',
          cards: [],
        },
      };

      await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .send(validRequest)
        .expect(401);
    });
  });

  describe('/ai/interpretation/batch (POST)', () => {
    it('should generate batch interpretations successfully', async () => {
      const batchRequest = {
        divinationDataList: [
          {
            type: 'tarot',
            question: '爱情运势如何？',
            cards: [
              {
                name: '恋人',
                position: '现在',
                isReversed: false,
                meaning: '爱情与选择',
                keywords: ['爱情', '选择'],
              },
            ],
          },
          {
            type: 'numerology',
            question: '事业发展如何？',
            numbers: {
              lifePathNumber: 5,
              birthDate: '1992-08-20',
            },
          },
        ],
        options: {
          language: 'zh-CN',
          tone: 'casual',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBe(2);
    });

    it('should handle empty batch request', async () => {
      const emptyBatchRequest = {
        divinationDataList: [],
      };

      await request(app.getHttpServer())
        .post('/ai/interpretation/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyBatchRequest)
        .expect(400);
    });
  });

  describe('/ai/interpretation/regenerate (POST)', () => {
    it('should regenerate interpretation successfully', async () => {
      const regenerateRequest = {
        originalId: 'test-interpretation-id',
        divinationData: {
          type: 'tarot',
          question: '重新解读的问题',
          cards: [
            {
              name: '愚者',
              position: '现在',
              isReversed: true,
              meaning: '鲁莽与冲动',
              keywords: ['冲动', '鲁莽'],
            },
          ],
        },
        newOptions: {
          tone: 'encouraging',
          detailLevel: 'detailed',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(regenerateRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('/ai/interpretation/stats (GET)', () => {
    it('should return interpretation statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/interpretation/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('totalGenerated');
      expect(response.body.data).toHaveProperty('averageQuality');
      expect(response.body.data).toHaveProperty('typeDistribution');
    });
  });

  describe('/ai/interpretation/types (GET)', () => {
    it('should return supported divination types', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/interpretation/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('types');
      expect(response.body.data.types).toContain('tarot');
      expect(response.body.data.types).toContain('astrology');
      expect(response.body.data.types).toContain('numerology');
      expect(response.body.data).toHaveProperty('descriptions');
    });
  });

  describe('/ai/interpretation/options (GET)', () => {
    it('should return interpretation options', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/interpretation/options')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('languages');
      expect(response.body.data).toHaveProperty('tones');
      expect(response.body.data).toHaveProperty('detailLevels');
      expect(response.body.data).toHaveProperty('focusAreas');
    });
  });

  describe('Quality Assessment Integration', () => {
    it('should assess interpretation quality', async () => {
      const interpretationId = 'test-interpretation-id';
      const originalData = {
        type: 'tarot',
        question: '测试问题',
        cards: [
          {
            name: '太阳',
            position: '现在',
            isReversed: false,
            meaning: '成功与快乐',
            keywords: ['成功', '快乐'],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/ai/interpretation/${interpretationId}/assess-quality`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(originalData)
        .expect(200);

      expect(response.body).toHaveProperty('overallScore');
      expect(response.body).toHaveProperty('dimensions');
      expect(response.body).toHaveProperty('suggestions');
    });

    it('should perform batch quality assessment', async () => {
      const batchAssessmentRequest = {
        interpretations: [
          {
            id: 'interp1',
            originalData: {
              type: 'tarot',
              question: '问题1',
              cards: [{ name: '愚者', position: '现在', isReversed: false, meaning: '新开始', keywords: ['开始'] }],
            },
          },
          {
            id: 'interp2',
            originalData: {
              type: 'astrology',
              question: '问题2',
              birthInfo: { birthDate: '1990-01-01', sunSign: '摩羯座' },
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/batch/assess-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchAssessmentRequest)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('overallScore');
    });
  });

  describe('Optimization Integration', () => {
    it('should optimize interpretation', async () => {
      const interpretationId = 'test-interpretation-id';
      const optimizationRequest = {
        originalData: {
          type: 'tarot',
          question: '需要优化的问题',
          cards: [
            {
              name: '月亮',
              position: '现在',
              isReversed: true,
              meaning: '困惑与迷茫',
              keywords: ['困惑', '迷茫'],
            },
          ],
        },
        config: {
          strategies: ['clarity', 'personalization'],
          targetAudience: 'general',
          optimizationGoals: ['improve_clarity', 'enhance_relevance'],
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/ai/interpretation/${interpretationId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizationRequest)
        .expect(200);

      expect(response.body).toHaveProperty('optimizedInterpretation');
      expect(response.body).toHaveProperty('improvements');
      expect(response.body).toHaveProperty('qualityComparison');
    });

    it('should get optimization strategies', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/interpretation/optimization/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('strategies');
      expect(response.body.strategies).toBeInstanceOf(Array);
    });

    it('should get optimization statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/interpretation/optimization/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .expect(200);

      expect(response.body).toHaveProperty('totalOptimizations');
      expect(response.body).toHaveProperty('averageImprovement');
      expect(response.body).toHaveProperty('strategyEffectiveness');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rate limiting', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/ai/interpretation/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            divinationData: {
              type: 'tarot',
              question: '快速请求测试',
              cards: [{ name: '愚者', position: '现在', isReversed: false, meaning: '新开始', keywords: ['开始'] }],
            },
          })
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        (response) => response.status === 'fulfilled' && response.value.status === 429
      );

      // 应该有一些请求被限流
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle service unavailable scenarios', async () => {
      // 模拟服务不可用的情况
      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          divinationData: {
            type: 'tarot',
            question: '服务不可用测试',
            cards: [],
          },
        });

      // 根据实际的错误处理逻辑调整期望的状态码
      expect([400, 500, 503]).toContain(response.status);
    });

    it('should validate request size limits', async () => {
      const largeRequest = {
        divinationData: {
          type: 'tarot',
          question: 'A'.repeat(10000), // 超大问题
          cards: Array(100).fill({
            name: '测试卡牌',
            position: '测试位置',
            isReversed: false,
            meaning: '测试含义',
            keywords: ['测试'],
          }),
        },
      };

      await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeRequest)
        .expect(400);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should complete interpretation within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          divinationData: {
            type: 'tarot',
            question: '性能测试问题',
            cards: [
              {
                name: '星星',
                position: '现在',
                isReversed: false,
                meaning: '希望与指引',
                keywords: ['希望', '指引'],
              },
            ],
          },
          options: {
            detailLevel: 'brief',
          },
        })
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(30000); // 30秒内完成
    });

    it('should include performance metadata in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/interpretation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          divinationData: {
            type: 'numerology',
            question: '元数据测试',
            numbers: {
              lifePathNumber: 3,
              birthDate: '1988-05-15',
            },
          },
        })
        .expect(201);

      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata).toHaveProperty('processingTime');
      expect(response.body.data.metadata).toHaveProperty('tokenUsage');
      expect(response.body.data.metadata).toHaveProperty('modelUsed');
    });
  });
});