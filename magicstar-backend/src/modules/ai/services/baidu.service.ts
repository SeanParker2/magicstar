import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AiModelProvider } from '../entities/ai-response.entity';
import { PrometheusService } from '../../monitoring/services/prometheus.service';

export interface BaiduCompletionResult {
  provider: AiModelProvider;
  model: string;
  version?: string;
  text: string;
  formatted?: any;
  raw: any;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  responseTime: number;
  rawResponse?: any;
}

export interface BaiduModelConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  penaltyScore?: number;
  stream?: boolean;
  userId?: string;
}

export interface BaiduRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface BaiduAccessToken {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
}

@Injectable()
export class BaiduService {
  private readonly logger = new Logger(BaiduService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://aip.baidubce.com';
  private readonly retryConfig: BaiduRetryConfig;
  private accessTokenCache: BaiduAccessToken | null = null;
  
  // 文心一言模型定价（每千tokens，单位：元）
  private readonly modelPricing: Record<string, { input: number; output: number }> = {
    'ernie-bot': { input: 0.012, output: 0.012 },
    'ernie-bot-turbo': { input: 0.008, output: 0.008 },
    'ernie-bot-4': { input: 0.120, output: 0.120 },
    'ernie-3.5': { input: 0.012, output: 0.012 },
    'ernie-lite': { input: 0.008, output: 0.008 },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prometheusService: PrometheusService,
  ) {
    this.apiKey = this.configService.get<string>('api.baidu.apiKey') || '';
    this.secretKey = this.configService.get<string>('api.baidu.secretKey') || '';
    
    if (!this.apiKey || !this.secretKey) {
      this.logger.warn('Baidu API credentials not configured');
    }

    this.retryConfig = {
      maxRetries: this.configService.get<number>('BAIDU_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('BAIDU_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('BAIDU_MAX_DELAY', 30000),
      backoffMultiplier: this.configService.get<number>('BAIDU_BACKOFF_MULTIPLIER', 2),
    };
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的token是否有效
    if (this.accessTokenCache && Date.now() < this.accessTokenCache.expiresAt) {
      return this.accessTokenCache.accessToken;
    }

    try {
      const url = `${this.baseUrl}/oauth/2.0/token`;
      const params = {
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.secretKey,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, null, { params })
      );

      if (response.data.error) {
        throw new Error(`获取访问令牌失败: ${response.data.error_description}`);
      }

      const { access_token, expires_in } = response.data;
      
      // 缓存token，提前5分钟过期以确保安全
      this.accessTokenCache = {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: Date.now() + (expires_in - 300) * 1000,
      };

      this.logger.log('Successfully obtained Baidu access token');
      return access_token;
    } catch (error) {
      this.logger.error('Failed to get Baidu access token:', error.message);
      throw new HttpException(
        '获取百度访问令牌失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 带重试机制的执行方法
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const isRetryableError = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryConfig.maxRetries && isRetryableError;

      if (!shouldRetry) {
        this.logger.error(`Operation failed after ${retryCount} retries: ${error.message}`);
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
        this.retryConfig.maxDelay,
      );

      this.logger.warn(
        `Retrying operation (${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms delay`,
      );

      await this.sleep(delay);
      return this.executeWithRetry(operation, retryCount + 1);
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP状态码错误
    if (error.response?.status) {
      const status = error.response.status;
      // 5xx服务器错误和429限流错误可重试
      return status >= 500 || status === 429;
    }

    // 百度API特定错误
    if (error.response?.data?.error_code) {
      const errorCode = error.response.data.error_code;
      // 系统繁忙、请求限流等错误可重试
      return [17, 18, 19, 336003, 336004].includes(errorCode);
    }

    return false;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成文本补全
   */
  async generateCompletion(
    prompt: string,
    config: BaiduModelConfig = {},
  ): Promise<BaiduCompletionResult> {
    const startTime = Date.now();
    const model = config.model || 'ernie-bot-turbo';

    return this.executeWithRetry(async () => {
      try {
        const accessToken = await this.getAccessToken();
        const url = `${this.baseUrl}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${accessToken}`;

        const requestBody = {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.temperature ?? 0.7,
          top_p: config.topP ?? 0.8,
          penalty_score: config.penaltyScore ?? 1.0,
          stream: config.stream ?? false,
          user_id: config.userId,
        };

        this.logger.log(`Sending request to Baidu API with model: ${model}`);
        
        const response = await firstValueFrom(
          this.httpService.post(url, requestBody, {
            timeout: 60000,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );

        if (response.data.error_code) {
          throw new Error(`百度API错误: ${response.data.error_msg}`);
        }

        const responseTime = Date.now() - startTime;
        const result = response.data.result;
        const usage = response.data.usage;

        const completionResult: BaiduCompletionResult = {
          provider: AiModelProvider.BAIDU,
          model,
          text: result,
          raw: response.data,
          tokenUsage: {
            promptTokens: usage?.prompt_tokens || 0,
            completionTokens: usage?.completion_tokens || 0,
            totalTokens: usage?.total_tokens || 0,
            cost: this.calculateCost(model, usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
          },
          responseTime,
          rawResponse: response.data,
        };

        this.logger.log(
          `Baidu API request completed in ${responseTime}ms, tokens: ${completionResult.tokenUsage.totalTokens}`,
        );

        // 记录成功的AI请求指标
        this.prometheusService.recordAiRequest('baidu', model, 'success');

        return completionResult;
      } catch (error) {
        this.logger.error('Baidu API request failed:', error.message);
        
        // 记录失败的AI请求指标
        this.prometheusService.recordAiRequest('baidu', model, 'error');
        
        throw new HttpException(
          `百度文心一言API调用失败: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  /**
   * 生成流式文本补全
   */
  async generateStreamCompletion(
    prompt: string,
    config: BaiduModelConfig = {},
    onChunk?: (chunk: string) => void,
  ): Promise<BaiduCompletionResult> {
    const startTime = Date.now();
    const model = config.model || 'ernie-bot-turbo';
    let fullText = '';
    let totalTokens = 0;

    return this.executeWithRetry(async () => {
      try {
        const accessToken = await this.getAccessToken();
        const url = `${this.baseUrl}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${accessToken}`;

        const requestBody = {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.temperature ?? 0.7,
          top_p: config.topP ?? 0.8,
          penalty_score: config.penaltyScore ?? 1.0,
          stream: true,
          user_id: config.userId,
        };

        this.logger.log(`Sending stream request to Baidu API with model: ${model}`);
        
        const response = await firstValueFrom(
          this.httpService.post(url, requestBody, {
            timeout: 60000,
            headers: {
              'Content-Type': 'application/json',
            },
            responseType: 'stream',
          })
        );

        // 处理流式响应
        return new Promise<BaiduCompletionResult>((resolve, reject) => {
          let buffer = '';
          
          response.data.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.result) {
                    fullText += data.result;
                    onChunk?.(data.result);
                  }
                  if (data.usage) {
                    totalTokens = data.usage.total_tokens;
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          });
          
          response.data.on('end', () => {
            const responseTime = Date.now() - startTime;
            
            resolve({
              provider: AiModelProvider.BAIDU,
              model,
              text: fullText,
              raw: { result: fullText },
              tokenUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens,
                cost: this.calculateCost(model, 0, totalTokens),
              },
              responseTime,
            });
          });
          
          response.data.on('error', (error: Error) => {
            reject(error);
          });
        });
      } catch (error) {
        this.logger.error('Baidu stream API request failed:', error.message);
        throw new HttpException(
          `百度文心一言流式API调用失败: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      this.logger.error('Baidu connection check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    return Object.keys(this.modelPricing);
  }

  /**
   * 计算调用成本
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return 0;
    }

    const promptCost = (promptTokens / 1000) * pricing.input;
    const completionCost = (completionTokens / 1000) * pricing.output;
    
    return promptCost + completionCost;
  }

  /**
   * 验证模型配置
   */
  validateModelConfig(config: BaiduModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.temperature !== undefined) {
      if (config.temperature < 0.01 || config.temperature > 1.0) {
        errors.push('temperature must be between 0.01 and 1.0');
      }
    }

    if (config.topP !== undefined) {
      if (config.topP < 0.01 || config.topP > 1.0) {
        errors.push('topP must be between 0.01 and 1.0');
      }
    }

    if (config.penaltyScore !== undefined) {
      if (config.penaltyScore < 1.0 || config.penaltyScore > 2.0) {
        errors.push('penaltyScore must be between 1.0 and 2.0');
      }
    }

    if (config.model && !this.modelPricing[config.model]) {
      errors.push(`Unsupported model: ${config.model}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    details: {
      connection: boolean;
      accessToken: boolean;
      models: string[];
    };
  }> {
    try {
      const connection = await this.checkConnection();
      const models = await this.getAvailableModels();
      
      return {
        status: connection ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          connection,
          accessToken: !!this.accessTokenCache?.accessToken,
          models,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          connection: false,
          accessToken: false,
          models: [],
        },
      };
    }
  }
}