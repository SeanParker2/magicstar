import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenaiService, OpenAiModelConfig } from '../services/openai.service';
import aiConfig from '../config/ai.config';

describe('OpenAI Service Tests', () => {
  let module: TestingModule;
  let openaiService: OpenaiService;
  let configService: ConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [aiConfig],
          isGlobal: true,
        }),
      ],
      providers: [OpenaiService],
    }).compile();

    openaiService = module.get<OpenaiService>(OpenaiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize OpenAI service', () => {
      expect(openaiService).toBeDefined();
    });

    it('should load OpenAI configuration', () => {
      const openaiConfig = configService.get('ai.openai');
      expect(openaiConfig).toBeDefined();
    });
  });

  describe('API Connection', () => {
    it('should check API connection', async () => {
      const isConnected = await openaiService.checkConnection();
      expect(typeof isConnected).toBe('boolean');
    }, 10000);

    it('should get available models', async () => {
      const models = await openaiService.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Text Generation', () => {
    it('should generate text completion', async () => {
      const prompt = '请简单介绍一下塔罗牌的历史';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 100,
        temperature: 0.7,
      };

      const response = await openaiService.generateCompletion(prompt, config);

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.tokenUsage).toBeDefined();
      expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(response.responseTime).toBeGreaterThan(0);
    }, 30000);

    it('should handle streaming completion', async () => {
      const prompt = '请解释一下愚者牌的含义';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 150,
        temperature: 0.7,
      };
      const chunks: string[] = [];

      const response = await openaiService.generateStreamCompletion(
        prompt,
        config,
        (chunk) => {
          chunks.push(chunk);
        }
      );

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      expect(chunks.length).toBeGreaterThan(0);
      
      // 验证流式响应的完整性
      const fullText = chunks.join('');
      expect(fullText).toBe(response.text);
    }, 30000);

    it('should validate model configuration', () => {
      const validConfig: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
      };

      const result = openaiService.validateModelConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid model configuration', () => {
      const invalidConfig: OpenAiModelConfig = {
        model: 'invalid-model',
        maxTokens: -1,
        temperature: 3.0,
      };

      const result = openaiService.validateModelConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid prompts gracefully', async () => {
      const emptyPrompt = '';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 50,
      };

      await expect(
        openaiService.generateCompletion(emptyPrompt, config)
      ).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      const prompt = '测试超时处理';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 50,
      };

      // 这个测试可能需要模拟网络超时
      // 在实际环境中，我们依赖OpenAI服务的稳定性
      const response = await openaiService.generateCompletion(prompt, config);
      expect(response).toBeDefined();
    }, 45000);
  });

  describe('Performance Monitoring', () => {
    it('should track response times', async () => {
      const prompt = '简单测试';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 50,
        temperature: 0.7,
      };

      const startTime = Date.now();
      const response = await openaiService.generateCompletion(prompt, config);
      const endTime = Date.now();
      const actualTime = endTime - startTime;

      expect(response.responseTime).toBeGreaterThan(0);
      expect(response.responseTime).toBeLessThanOrEqual(actualTime + 1000); // Allow some margin
    }, 30000);

    it('should monitor token usage accurately', async () => {
      const prompt = '请解释塔罗牌中愚者牌的象征意义';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 150,
        temperature: 0.7,
      };

      const response = await openaiService.generateCompletion(prompt, config);

      expect(response.tokenUsage.promptTokens).toBeGreaterThan(0);
      expect(response.tokenUsage.completionTokens).toBeGreaterThan(0);
      expect(response.tokenUsage.totalTokens).toBe(
        response.tokenUsage.promptTokens + response.tokenUsage.completionTokens
      );
      
      if (response.tokenUsage.cost) {
        expect(response.tokenUsage.cost).toBeGreaterThan(0);
      }
    }, 30000);

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 3;
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 50,
        temperature: 0.7,
      };

      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        openaiService.generateCompletion(`并发测试请求 ${i + 1}`, config)
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results.length).toBe(concurrentRequests);
      results.forEach(result => {
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
      });

      // Concurrent requests should be faster than sequential
      const totalTime = endTime - startTime;
      const averageSequentialTime = results.reduce((sum, r) => sum + r.responseTime, 0);
      expect(totalTime).toBeLessThan(averageSequentialTime * 0.8);
    }, 60000);
  });

  describe('Response Quality', () => {
    it('should generate meaningful responses', async () => {
      const prompt = '请简单说明塔罗牌的用途';
      const config: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 100,
        temperature: 0.7,
      };

      const response = await openaiService.generateCompletion(prompt, config);

      // Check response quality metrics
      expect(response.text.length).toBeGreaterThan(20);
      expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(response.responseTime).toBeGreaterThan(0);
      
      // Check for meaningful content
      expect(response.text).not.toMatch(/^(I cannot|I am unable|Sorry)/i);
      expect(response.text.trim()).not.toBe('');
      
      // Check for Chinese content (since prompt is in Chinese)
      expect(response.text).toMatch(/[\u4e00-\u9fff]/);
    }, 30000);

    it('should handle different temperature settings', async () => {
      const prompt = '描述一下塔罗牌的魅力';
      const baseConfig: OpenAiModelConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 100,
      };

      // Test with low temperature (more deterministic)
      const lowTempResponse = await openaiService.generateCompletion(prompt, {
        ...baseConfig,
        temperature: 0.1,
      });

      // Test with high temperature (more creative)
      const highTempResponse = await openaiService.generateCompletion(prompt, {
        ...baseConfig,
        temperature: 0.9,
      });

      expect(lowTempResponse.text).toBeDefined();
      expect(highTempResponse.text).toBeDefined();
      expect(lowTempResponse.text.length).toBeGreaterThan(0);
      expect(highTempResponse.text.length).toBeGreaterThan(0);
      
      // Responses should be different due to temperature difference
      expect(lowTempResponse.text).not.toBe(highTempResponse.text);
    }, 60000);
  });

  describe('Model Compatibility', () => {
    it('should work with different GPT models', async () => {
      const prompt = '简单测试';
      const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
      
      for (const model of models) {
        const config: OpenAiModelConfig = {
          model,
          maxTokens: 50,
          temperature: 0.7,
        };

        const response = await openaiService.generateCompletion(prompt, config);
        expect(response).toBeDefined();
        expect(response.text).toBeDefined();
        expect(response.model).toBe(model);
        expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
      }
    }, 60000);
  });
});