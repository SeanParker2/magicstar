import { registerAs } from '@nestjs/config';

export interface AiConfig {
  openai: {
    apiKey: string;
    organization?: string;
    baseUrl?: string;
    defaultModel: string;
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    maxPromptLength: number;
    timeout: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    keyPrefix: string;
  };
  queue: {
    enabled: boolean;
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
    skipSuccessfulRequests: boolean;
  };
  monitoring: {
    enabled: boolean;
    logLevel: string;
    metricsEnabled: boolean;
    tracingEnabled: boolean;
  };
}

export default registerAs('ai', (): AiConfig => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORGANIZATION,
    baseUrl: process.env.OPENAI_BASE_URL,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
    baseDelay: parseInt(process.env.OPENAI_BASE_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.OPENAI_MAX_DELAY || '30000', 10),
    backoffMultiplier: parseFloat(process.env.OPENAI_BACKOFF_MULTIPLIER || '2'),
    maxPromptLength: parseInt(process.env.AI_MAX_PROMPT_LENGTH || '4000', 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000', 10),
  },
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL || '3600', 10), // 1小时
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '1000', 10),
    keyPrefix: process.env.AI_CACHE_KEY_PREFIX || 'ai:cache:',
  },
  queue: {
    enabled: process.env.AI_QUEUE_ENABLED === 'true',
    concurrency: parseInt(process.env.AI_QUEUE_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.AI_QUEUE_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.AI_QUEUE_RETRY_DELAY || '5000', 10),
    timeout: parseInt(process.env.AI_QUEUE_TIMEOUT || '300000', 10), // 5分钟
  },
  rateLimit: {
    enabled: process.env.AI_RATE_LIMIT_ENABLED === 'true',
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || '100', 10),
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1分钟
    skipSuccessfulRequests: process.env.AI_RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },
  monitoring: {
    enabled: process.env.AI_MONITORING_ENABLED === 'true',
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    metricsEnabled: process.env.AI_METRICS_ENABLED === 'true',
    tracingEnabled: process.env.AI_TRACING_ENABLED === 'true',
  },
}));

/**
 * AI服务配置验证
 */
export function validateAiConfig(config: AiConfig): string[] {
  const errors: string[] = [];

  // OpenAI配置验证
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (config.openai.maxRetries < 0 || config.openai.maxRetries > 10) {
    errors.push('OPENAI_MAX_RETRIES must be between 0 and 10');
  }

  if (config.openai.baseDelay < 100 || config.openai.baseDelay > 10000) {
    errors.push('OPENAI_BASE_DELAY must be between 100 and 10000 ms');
  }

  if (config.openai.maxDelay < config.openai.baseDelay) {
    errors.push('OPENAI_MAX_DELAY must be greater than OPENAI_BASE_DELAY');
  }

  if (config.openai.backoffMultiplier < 1 || config.openai.backoffMultiplier > 5) {
    errors.push('OPENAI_BACKOFF_MULTIPLIER must be between 1 and 5');
  }

  if (config.openai.maxPromptLength < 100 || config.openai.maxPromptLength > 10000) {
    errors.push('AI_MAX_PROMPT_LENGTH must be between 100 and 10000 characters');
  }

  // 缓存配置验证
  if (config.cache.enabled) {
    if (config.cache.ttl < 60 || config.cache.ttl > 86400) {
      errors.push('AI_CACHE_TTL must be between 60 and 86400 seconds');
    }

    if (config.cache.maxSize < 10 || config.cache.maxSize > 10000) {
      errors.push('AI_CACHE_MAX_SIZE must be between 10 and 10000');
    }
  }

  // 队列配置验证
  if (config.queue.enabled) {
    if (config.queue.concurrency < 1 || config.queue.concurrency > 20) {
      errors.push('AI_QUEUE_CONCURRENCY must be between 1 and 20');
    }

    if (config.queue.maxRetries < 0 || config.queue.maxRetries > 10) {
      errors.push('AI_QUEUE_MAX_RETRIES must be between 0 and 10');
    }

    if (config.queue.retryDelay < 1000 || config.queue.retryDelay > 60000) {
      errors.push('AI_QUEUE_RETRY_DELAY must be between 1000 and 60000 ms');
    }
  }

  // 限流配置验证
  if (config.rateLimit.enabled) {
    if (config.rateLimit.maxRequests < 1 || config.rateLimit.maxRequests > 1000) {
      errors.push('AI_RATE_LIMIT_MAX_REQUESTS must be between 1 and 1000');
    }

    if (config.rateLimit.windowMs < 1000 || config.rateLimit.windowMs > 3600000) {
      errors.push('AI_RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000 ms');
    }
  }

  return errors;
}

/**
 * 获取AI配置的环境变量示例
 */
export function getAiConfigExample(): Record<string, string> {
  return {
    // OpenAI配置
    OPENAI_API_KEY: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    OPENAI_ORGANIZATION: 'org-xxxxxxxxxxxxxxxxxxxxxxxx',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_DEFAULT_MODEL: 'gpt-3.5-turbo',
    OPENAI_MAX_RETRIES: '3',
    OPENAI_BASE_DELAY: '1000',
    OPENAI_MAX_DELAY: '30000',
    OPENAI_BACKOFF_MULTIPLIER: '2',
    OPENAI_TIMEOUT: '60000',
    AI_MAX_PROMPT_LENGTH: '4000',
    
    // 缓存配置
    AI_CACHE_ENABLED: 'true',
    AI_CACHE_TTL: '3600',
    AI_CACHE_MAX_SIZE: '1000',
    AI_CACHE_KEY_PREFIX: 'ai:cache:',
    
    // 队列配置
    AI_QUEUE_ENABLED: 'true',
    AI_QUEUE_CONCURRENCY: '5',
    AI_QUEUE_MAX_RETRIES: '3',
    AI_QUEUE_RETRY_DELAY: '5000',
    AI_QUEUE_TIMEOUT: '300000',
    
    // 限流配置
    AI_RATE_LIMIT_ENABLED: 'true',
    AI_RATE_LIMIT_MAX_REQUESTS: '100',
    AI_RATE_LIMIT_WINDOW_MS: '60000',
    AI_RATE_LIMIT_SKIP_SUCCESSFUL: 'true',
    
    // 监控配置
    AI_MONITORING_ENABLED: 'true',
    AI_LOG_LEVEL: 'info',
    AI_METRICS_ENABLED: 'true',
    AI_TRACING_ENABLED: 'false',
  };
}