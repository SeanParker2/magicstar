import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiModelProvider } from '../entities/ai-response.entity';

export interface OpenAiCompletionResult {
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

export interface OpenAiModelConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface OpenAiRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface OpenAiRateLimitInfo {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
}

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai: OpenAI;
  private readonly defaultModel: string;
  private readonly retryConfig: OpenAiRetryConfig;
  private readonly modelPricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-32k': { input: 0.06, output: 0.12 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
      baseURL: this.configService.get<string>('OPENAI_BASE_URL'),
      organization: this.configService.get<string>('OPENAI_ORGANIZATION'),
    });

    this.defaultModel = this.configService.get<string>('OPENAI_DEFAULT_MODEL', 'gpt-3.5-turbo');
    
    this.retryConfig = {
      maxRetries: this.configService.get<number>('OPENAI_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('OPENAI_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('OPENAI_MAX_DELAY', 30000),
      backoffMultiplier: this.configService.get<number>('OPENAI_BACKOFF_MULTIPLIER', 2),
    };
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
        `Operation failed (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}), retrying in ${delay}ms: ${error.message}`,
      );

      await this.sleep(delay);
      return this.executeWithRetry(operation, retryCount + 1);
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // OpenAI API 错误码
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const retryableErrorTypes = [
      'rate_limit_exceeded',
      'server_error',
      'timeout',
      'connection_error',
    ];

    // 检查 HTTP 状态码
    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // 检查错误类型
    if (error.type && retryableErrorTypes.includes(error.type)) {
      return true;
    }

    // 检查错误消息
    const errorMessage = error.message?.toLowerCase() || '';
    const retryableMessages = [
      'rate limit',
      'timeout',
      'connection',
      'network',
      'server error',
    ];

    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成文本补全（带重试机制）
   */
  async generateCompletion(
    prompt: string,
    config: OpenAiModelConfig = {},
  ): Promise<OpenAiCompletionResult> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();

      try {
        const model = config.model || this.defaultModel;
        
        this.logger.debug(`Generating completion with model: ${model}`);

        const response = await this.openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 2000,
          top_p: config.topP ?? 1,
          frequency_penalty: config.frequencyPenalty ?? 0,
          presence_penalty: config.presencePenalty ?? 0,
          stop: config.stopSequences,
        });

        const responseTime = Date.now() - startTime;
        const choice = response.choices[0];
        const usage = response.usage;

        if (!choice?.message?.content) {
          throw new Error('No content in OpenAI response');
        }

        // 计算成本
        const cost = this.calculateCost(model, usage?.prompt_tokens || 0, usage?.completion_tokens || 0);

        const result: OpenAiCompletionResult = {
          provider: AiModelProvider.OPENAI,
          model,
          text: choice.message.content,
          raw: response,
          tokenUsage: {
            promptTokens: usage?.prompt_tokens || 0,
            completionTokens: usage?.completion_tokens || 0,
            totalTokens: usage?.total_tokens || 0,
            cost,
          },
          responseTime,
        };

        // 尝试解析结构化响应
        try {
          const parsed = JSON.parse(choice.message.content);
          result.formatted = parsed;
        } catch {
          // 如果不是JSON，保持原文本
          result.formatted = { text: choice.message.content };
        }

        this.logger.debug(`OpenAI completion generated in ${responseTime}ms, tokens: ${usage?.total_tokens}`);
        
        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.logger.error(`OpenAI completion failed after ${responseTime}ms: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  /**
   * 生成流式补全
   */
  async generateStreamCompletion(
    prompt: string,
    config: OpenAiModelConfig = {},
    onChunk?: (chunk: string) => void,
  ): Promise<OpenAiCompletionResult> {
    const startTime = Date.now();
    let fullContent = '';
    let tokenCount = 0;

    try {
      const model = config.model || this.defaultModel;
      
      this.logger.debug(`Generating stream completion with model: ${model}`);

      const stream = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2000,
        top_p: config.topP ?? 1,
        frequency_penalty: config.frequencyPenalty ?? 0,
        presence_penalty: config.presencePenalty ?? 0,
        stop: config.stopSequences,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          tokenCount++;
          onChunk?.(content);
        }
      }

      const responseTime = Date.now() - startTime;
      
      // 估算token使用量（流式响应通常不返回准确的token计数）
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);
      const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      const cost = this.calculateCost(model, estimatedPromptTokens, estimatedCompletionTokens);

      const result: OpenAiCompletionResult = {
        provider: AiModelProvider.OPENAI,
        model,
        text: fullContent,
        raw: { stream: true, chunks: tokenCount },
        tokenUsage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedTotalTokens,
          cost,
        },
        responseTime,
      };

      // 尝试解析结构化响应
      try {
        const parsed = JSON.parse(fullContent);
        result.formatted = parsed;
      } catch {
        result.formatted = { text: fullContent };
      }

      this.logger.debug(`OpenAI stream completion generated in ${responseTime}ms, estimated tokens: ${estimatedTotalTokens}`);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`OpenAI stream completion failed after ${responseTime}ms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查API连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      this.logger.error(`OpenAI connection check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.openai.models.list();
      return response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      this.logger.error(`Failed to get available models: ${error.message}`);
      return [this.defaultModel];
    }
  }

  /**
   * 计算API调用成本
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costs = this.modelPricing[model] || this.modelPricing['gpt-3.5-turbo'];
    
    const inputCost = (promptTokens / 1000) * costs.input;
    const outputCost = (completionTokens / 1000) * costs.output;
    
    return Math.round((inputCost + outputCost) * 10000) / 10000; // 保留4位小数
  }

  /**
   * 验证模型配置
   */
  validateModelConfig(config: OpenAiModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.maxTokens !== undefined && (config.maxTokens < 1 || config.maxTokens > 4096)) {
      errors.push('Max tokens must be between 1 and 4096');
    }

    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      errors.push('Top P must be between 0 and 1');
    }

    if (config.frequencyPenalty !== undefined && (config.frequencyPenalty < -2 || config.frequencyPenalty > 2)) {
      errors.push('Frequency penalty must be between -2 and 2');
    }

    if (config.presencePenalty !== undefined && (config.presencePenalty < -2 || config.presencePenalty > 2)) {
      errors.push('Presence penalty must be between -2 and 2');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}