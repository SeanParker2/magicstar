import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BaiduService } from './baidu.service';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('BaiduService', () => {
  let service: BaiduService;
  let configService: ConfigService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaiduService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<BaiduService>(BaiduService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);

    // 设置默认配置
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        'api.baidu.apiKey': 'test-api-key',
        'api.baidu.secretKey': 'test-secret-key',
        'BAIDU_MAX_RETRIES': 3,
        'BAIDU_BASE_DELAY': 1000,
        'BAIDU_MAX_DELAY': 30000,
        'BAIDU_BACKOFF_MULTIPLIER': 2,
      };
      return config[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccessToken', () => {
    it('should get access token successfully', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));

      // 使用反射访问私有方法进行测试
      const getAccessToken = service['getAccessToken'].bind(service);
      const token = await getAccessToken();

      expect(token).toBe('test-access-token');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://aip.baidubce.com/oauth/2.0/token',
        null,
        {
          params: {
            grant_type: 'client_credentials',
            client_id: 'test-api-key',
            client_secret: 'test-secret-key',
          },
        },
      );
    });

    it('should handle token request error', async () => {
      const mockErrorResponse = {
        data: {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockErrorResponse));

      const getAccessToken = service['getAccessToken'].bind(service);
      
      await expect(getAccessToken()).rejects.toThrow(HttpException);
    });

    it('should cache access token', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));

      const getAccessToken = service['getAccessToken'].bind(service);
      
      // 第一次调用
      const token1 = await getAccessToken();
      // 第二次调用应该使用缓存
      const token2 = await getAccessToken();

      expect(token1).toBe(token2);
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateCompletion', () => {
    beforeEach(() => {
      // Mock getAccessToken
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };
      mockHttpService.post.mockReturnValueOnce(of(mockTokenResponse));
    });

    it('should generate completion successfully', async () => {
      const mockCompletionResponse = {
        data: {
          result: '这是一个测试回复',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockCompletionResponse));

      const result = await service.generateCompletion('测试提示词');

      expect(result.text).toBe('这是一个测试回复');
      expect(result.tokenUsage.totalTokens).toBe(30);
      expect(result.provider).toBe('baidu');
      expect(result.model).toBe('ernie-bot-turbo');
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        data: {
          error_code: 336003,
          error_msg: 'System busy, please try again later',
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockErrorResponse));

      await expect(service.generateCompletion('测试提示词')).rejects.toThrow(HttpException);
    });

    it('should use custom model config', async () => {
      const mockCompletionResponse = {
        data: {
          result: '自定义配置回复',
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockCompletionResponse));

      const config = {
        model: 'ernie-bot-4',
        temperature: 0.9,
        topP: 0.9,
        penaltyScore: 1.5,
      };

      const result = await service.generateCompletion('测试提示词', config);

      expect(result.model).toBe('ernie-bot-4');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('ernie-bot-4'),
        expect.objectContaining({
          temperature: 0.9,
          top_p: 0.9,
          penalty_score: 1.5,
        }),
        expect.any(Object),
      );
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection is healthy', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));

      const result = await service.checkConnection();
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.checkConnection();
      expect(result).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', async () => {
      const models = await service.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain('ernie-bot');
      expect(models).toContain('ernie-bot-turbo');
      expect(models).toContain('ernie-bot-4');
    });
  });

  describe('validateModelConfig', () => {
    it('should validate correct config', () => {
      const config = {
        model: 'ernie-bot',
        temperature: 0.7,
        topP: 0.8,
        penaltyScore: 1.2,
      };

      const result = service.validateModelConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid temperature', () => {
      const config = {
        temperature: 1.5, // 超出范围
      };

      const result = service.validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('temperature must be between 0.01 and 1.0');
    });

    it('should reject invalid topP', () => {
      const config = {
        topP: 0, // 超出范围
      };

      const result = service.validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('topP must be between 0.01 and 1.0');
    });

    it('should reject invalid penaltyScore', () => {
      const config = {
        penaltyScore: 3.0, // 超出范围
      };

      const result = service.validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('penaltyScore must be between 1.0 and 2.0');
    });

    it('should reject unsupported model', () => {
      const config = {
        model: 'unsupported-model',
      };

      const result = service.validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported model: unsupported-model');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when connection works', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));

      const status = await service.getHealthStatus();
      
      expect(status.status).toBe('healthy');
      expect(status.details.connection).toBe(true);
      expect(Array.isArray(status.details.models)).toBe(true);
      expect(status.timestamp).toBeDefined();
    });

    it('should return unhealthy status when connection fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      const status = await service.getHealthStatus();
      
      expect(status.status).toBe('unhealthy');
      expect(status.details.connection).toBe(false);
      expect(Array.isArray(status.details.models)).toBe(true);
    });
  });

  describe('retry mechanism', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should identify retryable errors correctly', () => {
      const isRetryableError = service['isRetryableError'].bind(service);
      
      // Network errors should be retryable
      const networkError = new Error('Network error');
      networkError['code'] = 'ECONNRESET';
      expect(isRetryableError(networkError)).toBe(true);
      
      // 5xx errors should be retryable
      const serverError = {
        response: { status: 500 }
      };
      expect(isRetryableError(serverError)).toBe(true);
      
      // 429 errors should be retryable
      const rateLimitError = {
        response: { status: 429 }
      };
      expect(isRetryableError(rateLimitError)).toBe(true);
      
      // Baidu specific retryable errors
      const baiduRetryableError = {
        response: {
          data: { error_code: 336003 }
        }
      };
      expect(isRetryableError(baiduRetryableError)).toBe(true);
      
      // 4xx errors (except 429) should not be retryable
      const clientError = {
        response: { status: 401 }
      };
      expect(isRetryableError(clientError)).toBe(false);
    });

    it('should not retry on non-retryable errors', async () => {
      // Mock token request
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 2592000,
        },
      };
      
      // Mock completion request with non-retryable error
      const authError = new Error('Access token invalid');
      authError['response'] = {
        status: 401,
        data: {
          error_code: 110,
          error_msg: 'Access token invalid or no longer valid',
        },
      };

      let callCount = 0;
      mockHttpService.post.mockImplementation((url) => {
        callCount++;
        if (url.includes('oauth/2.0/token')) {
          return of(mockTokenResponse);
        }
        return throwError(() => authError);
      });

      await expect(service.generateCompletion('测试提示词')).rejects.toThrow(HttpException);
      expect(callCount).toBe(2); // 1 for token + 1 for completion (no retry)
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost correctly', () => {
      const calculateCost = service['calculateCost'].bind(service);
      
      // ernie-bot-turbo: 0.008元/千tokens
      const cost = calculateCost('ernie-bot-turbo', 1000, 1000);
      expect(cost).toBe(0.016); // (1000/1000 * 0.008) + (1000/1000 * 0.008)
    });

    it('should return 0 for unknown model', () => {
      const calculateCost = service['calculateCost'].bind(service);
      
      const cost = calculateCost('unknown-model', 1000, 1000);
      expect(cost).toBe(0);
    });
  });
});