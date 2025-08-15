import { Logger } from '@nestjs/common';
import { AiModelProvider } from '../entities/ai-response.entity';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface FormattedResponse {
  provider: AiModelProvider;
  model: string;
  version?: string;
  text: string;
  formatted?: any;
  raw: any;
  tokenUsage: TokenUsage;
  responseTime: number;
  metadata?: Record<string, any>;
}

export interface ResponseParseOptions {
  parseJson?: boolean;
  extractStructuredData?: boolean;
  validateResponse?: boolean;
  sanitizeOutput?: boolean;
}

export class ResponseFormatter {
  private readonly logger = new Logger(ResponseFormatter.name);

  /**
   * 格式化OpenAI响应
   */
  formatOpenAIResponse(
    response: any,
    model: string,
    responseTime: number,
    options: ResponseParseOptions = {}
  ): FormattedResponse {
    const choice = response.choices?.[0];
    const usage = response.usage;
    const content = choice?.message?.content || '';

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result: FormattedResponse = {
      provider: AiModelProvider.OPENAI,
      model,
      text: content,
      raw: response,
      tokenUsage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
      responseTime,
    };

    // 解析结构化响应
    if (options.parseJson !== false) {
      result.formatted = this.parseStructuredResponse(content);
    }

    // 提取元数据
    result.metadata = this.extractMetadata(response, choice);

    // 验证响应
    if (options.validateResponse) {
      this.validateResponse(result);
    }

    // 清理输出
    if (options.sanitizeOutput) {
      result.text = this.sanitizeText(result.text);
    }

    return result;
  }

  /**
   * 解析结构化响应（JSON、XML等）
   */
  private parseStructuredResponse(content: string): any {
    try {
      // 尝试解析JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // 尝试直接解析JSON
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return JSON.parse(content);
      }

      // 尝试提取结构化数据
      const structuredData = this.extractStructuredData(content);
      if (structuredData) {
        return structuredData;
      }

      // 如果无法解析，返回文本格式
      return { text: content };
    } catch (error) {
      this.logger.debug(`Failed to parse structured response: ${error.message}`);
      return { text: content };
    }
  }

  /**
   * 提取结构化数据
   */
  private extractStructuredData(content: string): any {
    const patterns = {
      // 提取键值对
      keyValue: /^([^:]+):\s*(.+)$/gm,
      // 提取列表项
      listItem: /^[-*]\s+(.+)$/gm,
      // 提取编号列表
      numberedList: /^\d+\.\s+(.+)$/gm,
    };

    const result: any = {};
    let hasStructuredData = false;

    // 提取键值对
    const keyValueMatches = Array.from(content.matchAll(patterns.keyValue));
    if (keyValueMatches.length > 0) {
      result.keyValuePairs = keyValueMatches.map(match => ({
        key: match[1].trim(),
        value: match[2].trim(),
      }));
      hasStructuredData = true;
    }

    // 提取列表项
    const listMatches = Array.from(content.matchAll(patterns.listItem));
    if (listMatches.length > 0) {
      result.listItems = listMatches.map(match => match[1].trim());
      hasStructuredData = true;
    }

    // 提取编号列表
    const numberedMatches = Array.from(content.matchAll(patterns.numberedList));
    if (numberedMatches.length > 0) {
      result.numberedList = numberedMatches.map(match => match[1].trim());
      hasStructuredData = true;
    }

    return hasStructuredData ? result : null;
  }

  /**
   * 提取响应元数据
   */
  private extractMetadata(response: any, choice: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    // 模型信息
    if (response.model) {
      metadata.model = response.model;
    }

    // 完成原因
    if (choice?.finish_reason) {
      metadata.finishReason = choice.finish_reason;
    }

    // 响应ID
    if (response.id) {
      metadata.responseId = response.id;
    }

    // 创建时间
    if (response.created) {
      metadata.created = new Date(response.created * 1000);
    }

    // 系统指纹
    if (response.system_fingerprint) {
      metadata.systemFingerprint = response.system_fingerprint;
    }

    return metadata;
  }

  /**
   * 验证响应格式
   */
  private validateResponse(response: FormattedResponse): void {
    const errors: string[] = [];

    // 检查必需字段
    if (!response.text || response.text.trim().length === 0) {
      errors.push('Response text is empty');
    }

    if (!response.tokenUsage || response.tokenUsage.totalTokens <= 0) {
      errors.push('Invalid token usage data');
    }

    if (response.responseTime <= 0) {
      errors.push('Invalid response time');
    }

    // 检查内容质量
    if (response.text.length < 10) {
      errors.push('Response text is too short');
    }

    if (response.text.includes('I cannot') || response.text.includes('I am unable')) {
      errors.push('Response indicates inability to complete request');
    }

    if (errors.length > 0) {
      this.logger.warn(`Response validation warnings: ${errors.join(', ')}`);
    }
  }

  /**
   * 清理文本内容
   */
  private sanitizeText(text: string): string {
    return text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除首尾空白
      .trim()
      // 移除潜在的有害内容标记
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      // 标准化换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * 计算响应质量分数
   */
  calculateQualityScore(response: FormattedResponse): number {
    let score = 1.0;
    const penalties = {
      tooShort: 0.2,
      tooLong: 0.1,
      lowTokenEfficiency: 0.1,
      slowResponse: 0.1,
      parseError: 0.15,
    };

    // 长度检查
    if (response.text.length < 50) {
      score -= penalties.tooShort;
    } else if (response.text.length > 5000) {
      score -= penalties.tooLong;
    }

    // Token效率检查
    const tokenEfficiency = response.text.length / response.tokenUsage.totalTokens;
    if (tokenEfficiency < 2) {
      score -= penalties.lowTokenEfficiency;
    }

    // 响应时间检查
    if (response.responseTime > 30000) { // 30秒
      score -= penalties.slowResponse;
    }

    // 解析错误检查
    if (response.formatted && typeof response.formatted === 'object' && 'text' in response.formatted) {
      // 如果只能解析为纯文本，说明结构化解析失败
      score -= penalties.parseError;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 格式化错误响应
   */
  formatErrorResponse(
    error: Error,
    model: string,
    responseTime: number
  ): FormattedResponse {
    return {
      provider: AiModelProvider.OPENAI,
      model,
      text: `Error: ${error.message}`,
      formatted: {
        error: true,
        message: error.message,
        type: error.constructor.name,
      },
      raw: { error: error.message },
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
      },
      responseTime,
      metadata: {
        error: true,
        errorType: error.constructor.name,
      },
    };
  }

  /**
   * 合并多个响应（用于流式响应）
   */
  mergeStreamResponses(responses: FormattedResponse[]): FormattedResponse {
    if (responses.length === 0) {
      throw new Error('No responses to merge');
    }

    const first = responses[0];
    const mergedText = responses.map(r => r.text).join('');
    const totalTokens = responses.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0);
    const totalTime = responses.reduce((sum, r) => sum + r.responseTime, 0);

    return {
      ...first,
      text: mergedText,
      formatted: this.parseStructuredResponse(mergedText),
      tokenUsage: {
        promptTokens: first.tokenUsage.promptTokens,
        completionTokens: totalTokens - first.tokenUsage.promptTokens,
        totalTokens,
        cost: responses.reduce((sum, r) => sum + (r.tokenUsage.cost || 0), 0),
      },
      responseTime: totalTime,
      metadata: {
        ...first.metadata,
        streamChunks: responses.length,
        merged: true,
      },
    };
  }
}

/**
 * 创建默认的响应格式化器
 */
export function createResponseFormatter(): ResponseFormatter {
  return new ResponseFormatter();
}