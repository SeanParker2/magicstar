import { Logger } from '@nestjs/common';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  retryableStatusCodes?: number[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  retryHistory: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  startTime: number;
  endTime: number;
  error?: Error;
  delay?: number;
}

export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);

  constructor(private readonly config: RetryConfig) {}

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName = 'Unknown Operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const retryHistory: RetryAttempt[] = [];
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        this.logger.debug(`Executing ${operationName} (attempt ${attempt + 1}/${this.config.maxRetries + 1})`);
        
        const result = await operation();
        
        const attemptEndTime = Date.now();
        retryHistory.push({
          attempt: attempt + 1,
          startTime: attemptStartTime,
          endTime: attemptEndTime,
        });

        this.logger.debug(`${operationName} succeeded on attempt ${attempt + 1}`);
        
        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime,
          retryHistory,
        };
      } catch (error) {
        const attemptEndTime = Date.now();
        lastError = error as Error;
        
        retryHistory.push({
          attempt: attempt + 1,
          startTime: attemptStartTime,
          endTime: attemptEndTime,
          error: lastError,
        });

        // 检查是否为可重试的错误
        if (!this.isRetryableError(lastError)) {
          this.logger.error(`${operationName} failed with non-retryable error: ${lastError.message}`);
          break;
        }

        // 如果已达到最大重试次数，不再重试
        if (attempt >= this.config.maxRetries) {
          this.logger.error(`${operationName} failed after ${attempt + 1} attempts: ${lastError.message}`);
          break;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt);
        retryHistory[retryHistory.length - 1].delay = delay;
        
        this.logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`
        );

        // 等待后重试
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxRetries + 1,
      totalTime: Date.now() - startTime,
      retryHistory,
    };
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: Error): boolean {
    // 检查错误类型
    if (this.config.retryableErrors) {
      const errorType = error.constructor.name;
      if (this.config.retryableErrors.includes(errorType)) {
        return true;
      }
    }

    // 检查HTTP状态码（如果错误包含状态码）
    if (this.config.retryableStatusCodes && 'status' in error) {
      const status = (error as any).status;
      if (this.config.retryableStatusCodes.includes(status)) {
        return true;
      }
    }

    // 检查错误消息中的关键词
    const errorMessage = error.message?.toLowerCase() || '';
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'server error',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
      'econnreset',
      'enotfound',
      'etimedout',
    ];

    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * 计算延迟时间（指数退避）
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // 添加抖动
    return Math.min(jitteredDelay, this.config.maxDelay);
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取重试统计信息
   */
  getRetryStats(result: RetryResult<any>): {
    totalAttempts: number;
    successRate: number;
    averageAttemptTime: number;
    totalRetryTime: number;
  } {
    const totalAttempts = result.attempts;
    const successRate = result.success ? 1 : 0;
    const averageAttemptTime = result.retryHistory.reduce(
      (sum, attempt) => sum + (attempt.endTime - attempt.startTime),
      0
    ) / result.retryHistory.length;
    const totalRetryTime = result.totalTime;

    return {
      totalAttempts,
      successRate,
      averageAttemptTime,
      totalRetryTime,
    };
  }
}

/**
 * 创建默认的重试处理器
 */
export function createDefaultRetryHandler(): RetryHandler {
  return new RetryHandler({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableErrors: [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'RateLimitError',
    ],
  });
}

/**
 * 创建OpenAI专用的重试处理器
 */
export function createOpenAIRetryHandler(config?: Partial<RetryConfig>): RetryHandler {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableErrors: [
      'APIError',
      'APIConnectionError',
      'RateLimitError',
      'InternalServerError',
      'BadGatewayError',
      'ServiceUnavailableError',
      'GatewayTimeoutError',
    ],
  };

  return new RetryHandler({ ...defaultConfig, ...config });
}

/**
 * 重试装饰器
 */
export function Retry(config?: Partial<RetryConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const retryHandler = new RetryHandler({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      ...config,
    });

    descriptor.value = async function (...args: any[]) {
      const result = await retryHandler.executeWithRetry(
        () => method.apply(this, args),
        `${target.constructor.name}.${propertyName}`
      );

      if (result.success) {
        return result.result;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}