import { BadRequestException, Logger } from '@nestjs/common';
import { AiModelProvider } from '../entities/ai-response.entity';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean | string;
}

export interface RequestValidationOptions {
  sanitizeInput?: boolean;
  strictMode?: boolean;
  allowExtraFields?: boolean;
  maxPromptLength?: number;
  maxTokens?: number;
}

export interface ValidatedRequest {
  prompt: string;
  model?: string;
  provider?: AiModelProvider;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemMessage?: string;
  context?: any;
  metadata?: Record<string, any>;
}

export class RequestValidator {
  private readonly logger = new Logger(RequestValidator.name);
  private readonly defaultOptions: RequestValidationOptions = {
    sanitizeInput: true,
    strictMode: false,
    allowExtraFields: true,
    maxPromptLength: 8000,
    maxTokens: 4000,
  };

  /**
   * 验证AI请求参数
   */
  validateRequest(
    request: any,
    options: RequestValidationOptions = {}
  ): ValidatedRequest {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];

    // 基础验证规则
    const rules: ValidationRule[] = [
      {
        field: 'prompt',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: opts.maxPromptLength,
      },
      {
        field: 'model',
        type: 'string',
        allowedValues: [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
          'gpt-4o',
          'gpt-4o-mini',
        ],
      },
      {
        field: 'provider',
        type: 'string',
        allowedValues: Object.values(AiModelProvider),
      },
      {
        field: 'maxTokens',
        type: 'number',
        min: 1,
        max: opts.maxTokens,
      },
      {
        field: 'temperature',
        type: 'number',
        min: 0,
        max: 2,
      },
      {
        field: 'topP',
        type: 'number',
        min: 0,
        max: 1,
      },
      {
        field: 'frequencyPenalty',
        type: 'number',
        min: -2,
        max: 2,
      },
      {
        field: 'presencePenalty',
        type: 'number',
        min: -2,
        max: 2,
      },
      {
        field: 'systemMessage',
        type: 'string',
        maxLength: 2000,
      },
    ];

    // 执行验证
    for (const rule of rules) {
      const error = this.validateField(request, rule);
      if (error) {
        errors.push(error);
      }
    }

    // 严格模式下检查额外字段
    if (opts.strictMode && !opts.allowExtraFields) {
      const allowedFields = rules.map(r => r.field);
      const extraFields = Object.keys(request).filter(
        key => !allowedFields.includes(key)
      );
      if (extraFields.length > 0) {
        errors.push(`Unexpected fields: ${extraFields.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join('; ')}`);
    }

    // 构建验证后的请求
    const validatedRequest: ValidatedRequest = {
      prompt: opts.sanitizeInput ? this.sanitizePrompt(request.prompt) : request.prompt,
    };

    // 添加可选字段
    if (request.model) validatedRequest.model = request.model;
    if (request.provider) validatedRequest.provider = request.provider;
    if (request.maxTokens) validatedRequest.maxTokens = request.maxTokens;
    if (request.temperature !== undefined) validatedRequest.temperature = request.temperature;
    if (request.topP !== undefined) validatedRequest.topP = request.topP;
    if (request.frequencyPenalty !== undefined) validatedRequest.frequencyPenalty = request.frequencyPenalty;
    if (request.presencePenalty !== undefined) validatedRequest.presencePenalty = request.presencePenalty;
    if (request.systemMessage) validatedRequest.systemMessage = opts.sanitizeInput ? this.sanitizePrompt(request.systemMessage) : request.systemMessage;
    if (request.context) validatedRequest.context = request.context;
    if (request.metadata) validatedRequest.metadata = request.metadata;

    return validatedRequest;
  }

  /**
   * 验证单个字段
   */
  private validateField(request: any, rule: ValidationRule): string | null {
    const value = request[rule.field];

    // 检查必需字段
    if (rule.required && (value === undefined || value === null)) {
      return `Field '${rule.field}' is required`;
    }

    // 如果字段不存在且不是必需的，跳过验证
    if (value === undefined || value === null) {
      return null;
    }

    // 类型验证
    if (rule.type && !this.validateType(value, rule.type)) {
      return `Field '${rule.field}' must be of type ${rule.type}`;
    }

    // 字符串长度验证
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `Field '${rule.field}' must be at least ${rule.minLength} characters long`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `Field '${rule.field}' must be at most ${rule.maxLength} characters long`;
      }
    }

    // 数值范围验证
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `Field '${rule.field}' must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `Field '${rule.field}' must be at most ${rule.max}`;
      }
    }

    // 正则表达式验证
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return `Field '${rule.field}' does not match required pattern`;
    }

    // 允许值验证
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      return `Field '${rule.field}' must be one of: ${rule.allowedValues.join(', ')}`;
    }

    // 自定义验证器
    if (rule.customValidator) {
      const result = rule.customValidator(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `Field '${rule.field}' failed custom validation`;
      }
    }

    return null;
  }

  /**
   * 验证数据类型
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 清理提示词内容
   */
  private sanitizePrompt(prompt: string): string {
    if (typeof prompt !== 'string') {
      return '';
    }

    return prompt
      // 移除潜在的注入攻击
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      // 移除控制字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 标准化空白字符
      .replace(/\s+/g, ' ')
      // 移除首尾空白
      .trim()
      // 限制连续的特殊字符
      .replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{10,}/g, (match) => match.slice(0, 10))
      // 移除过长的重复字符
      .replace(/(.)\1{20,}/g, (match, char) => char.repeat(20));
  }

  /**
   * 验证提示词安全性
   */
  validatePromptSafety(prompt: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // 检查潜在的提示词注入
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything\s+above/i,
      /system\s*:\s*you\s+are\s+now/i,
      /\[\s*system\s*\]/i,
      /\{\s*system\s*\}/i,
      /act\s+as\s+if\s+you\s+are/i,
      /pretend\s+to\s+be/i,
      /roleplay\s+as/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(prompt)) {
        issues.push('Potential prompt injection detected');
        break;
      }
    }

    // 检查敏感内容
    const sensitivePatterns = [
      /password/i,
      /api[_\s]*key/i,
      /secret/i,
      /token/i,
      /credential/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(prompt)) {
        issues.push('Potential sensitive information detected');
        break;
      }
    }

    // 检查过度重复
    const words = prompt.split(/\s+/);
    const wordCount = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) {
        wordCount.set(word.toLowerCase(), (wordCount.get(word.toLowerCase()) || 0) + 1);
      }
    }

    for (const [word, count] of wordCount) {
      if (count > words.length * 0.3) {
        issues.push('Excessive repetition detected');
        break;
      }
    }

    // 检查长度异常
    if (prompt.length > 10000) {
      issues.push('Prompt is unusually long');
    }

    if (words.length < 3) {
      issues.push('Prompt is too short to be meaningful');
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }

  /**
   * 验证模型兼容性
   */
  validateModelCompatibility(
    model: string,
    provider: AiModelProvider,
    features: string[] = []
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // OpenAI模型兼容性检查
    if (provider === AiModelProvider.OPENAI) {
      const supportedModels = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5-turbo',
      ];

      if (!supportedModels.includes(model)) {
        issues.push(`Model '${model}' is not supported for OpenAI provider`);
      }

      // 功能兼容性检查
      if (features.includes('function_calling') && model === 'gpt-3.5-turbo') {
        issues.push('Function calling may have limited support on gpt-3.5-turbo');
      }

      if (features.includes('vision') && !['gpt-4o', 'gpt-4-turbo'].includes(model)) {
        issues.push(`Vision features are not supported on model '${model}'`);
      }
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }

  /**
   * 估算请求成本
   */
  estimateRequestCost(
    request: ValidatedRequest,
    model: string = 'gpt-4o-mini'
  ): { estimatedCost: number; tokenEstimate: number } {
    // 简单的token估算（实际应该使用tokenizer）
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const systemTokens = request.systemMessage ? Math.ceil(request.systemMessage.length / 4) : 0;
    const maxCompletionTokens = request.maxTokens || 1000;

    const totalTokens = promptTokens + systemTokens + maxCompletionTokens;

    // 简化的价格模型（实际价格应该从配置中获取）
    const pricePerToken = this.getModelPricing(model);
    const estimatedCost = totalTokens * pricePerToken;

    return {
      estimatedCost,
      tokenEstimate: totalTokens,
    };
  }

  /**
   * 获取模型定价
   */
  private getModelPricing(model: string): number {
    const pricing: Record<string, number> = {
      'gpt-4': 0.00003, // $0.03 per 1K tokens
      'gpt-4-turbo': 0.00001, // $0.01 per 1K tokens
      'gpt-4o': 0.000005, // $0.005 per 1K tokens
      'gpt-4o-mini': 0.00000015, // $0.00015 per 1K tokens
      'gpt-3.5-turbo': 0.000001, // $0.001 per 1K tokens
    };

    return pricing[model] || pricing['gpt-4o-mini'];
  }
}

/**
 * 创建默认的请求验证器
 */
export function createRequestValidator(): RequestValidator {
  return new RequestValidator();
}

/**
 * 验证装饰器
 */
export function ValidateAiRequest(options?: RequestValidationOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const validator = new RequestValidator();

    descriptor.value = async function (...args: any[]) {
      // 假设第一个参数是请求对象
      if (args.length > 0 && typeof args[0] === 'object') {
        args[0] = validator.validateRequest(args[0], options);
      }
      return method.apply(this, args);
    };

    return descriptor;
  };
}