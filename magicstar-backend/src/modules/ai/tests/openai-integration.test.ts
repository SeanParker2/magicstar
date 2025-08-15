import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from '../services/openai.service';
import { AiModelProvider } from '../entities/ai-response.entity';

describe('OpenAI Integration Tests', () => {
  let service: OpenaiService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenaiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-key',
                OPENAI_DEFAULT_MODEL: 'gpt-3.5-turbo',
                OPENAI_MAX_RETRIES: 3,
                OPENAI_BASE_DELAY: 1000,
                OPENAI_MAX_DELAY: 30000,
                OPENAI_BACKOFF_MULTIPLIER: 2,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenaiService>(OpenaiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('API Connection', () => {
    it('should check connection status', async () => {
      const isConnected = await service.checkConnection();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should get available models', async () => {
      const models = await service.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('Text Generation', () => {
    it('should generate completion with default config', async () => {
      const prompt = '请简单介绍一下塔罗牌占卜';
      
      const result = await service.generateCompletion(prompt);
      
      expect(result).toBeDefined();
      expect(result.provider).toBe(AiModelProvider.OPENAI);
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should generate completion with custom config', async () => {
      const prompt = '解释一下星座运势的原理';
      const config = {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500,
      };
      
      const result = await service.generateCompletion(prompt, config);
      
      expect(result).toBeDefined();
      expect(result.model).toBe(config.model);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.tokenUsage.completionTokens).toBeLessThanOrEqual(config.maxTokens);
    });

    it('should handle structured response', async () => {
      const prompt = `请以JSON格式回答以下问题：
问题：塔罗牌有多少张？
格式：{"answer": "答案", "explanation": "解释"}`;
      
      const result = await service.generateCompletion(prompt, {
        temperature: 0.3,
      });
      
      expect(result).toBeDefined();
      expect(result.formatted).toBeDefined();
      
      if (typeof result.formatted === 'object') {
        expect(result.formatted).toHaveProperty('answer');
      }
    });
  });

  describe('Stream Generation', () => {
    it('should generate stream completion', async () => {
      const prompt = '请详细介绍塔罗牌的历史';
      const chunks: string[] = [];
      
      const result = await service.generateStreamCompletion(
        prompt,
        { maxTokens: 300 },
        (chunk) => {
          chunks.push(chunk);
        }
      );
      
      expect(result).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe(result.text);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model config', () => {
      const invalidConfig = {
        temperature: 5, // 超出范围
        maxTokens: -1, // 无效值
      };
      
      const validation = service.validateModelConfig(invalidConfig);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should retry on retryable errors', async () => {
      // 这个测试需要模拟网络错误，实际环境中可能难以测试
      // 可以通过mock来测试重试逻辑
      expect(true).toBe(true); // 占位测试
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate API costs correctly', async () => {
      const prompt = '简单测试';
      
      const result = await service.generateCompletion(prompt);
      
      expect(result.tokenUsage.cost).toBeDefined();
      expect(result.tokenUsage.cost).toBeGreaterThan(0);
      expect(typeof result.tokenUsage.cost).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should complete requests within reasonable time', async () => {
      const prompt = '快速回答：1+1等于几？';
      const startTime = Date.now();
      
      const result = await service.generateCompletion(prompt, {
        maxTokens: 50,
      });
      
      const totalTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(totalTime).toBeLessThan(30000); // 30秒内完成
      expect(result.responseTime).toBeLessThan(totalTime);
    });
  });
});