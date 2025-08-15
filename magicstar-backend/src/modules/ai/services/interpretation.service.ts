import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { PromptEngineeringService, PromptContext, PromptCategory } from './prompt-engineering.service';
import { AiCacheService } from './ai-cache.service';
import { AiLoggerService } from './ai-logger.service';

export interface DivinationData {
  type: 'tarot' | 'astrology' | 'numerology' | 'iching';
  cards?: TarotCard[];
  spread?: string;
  birthInfo?: BirthInfo;
  numbers?: NumberData;
  hexagram?: HexagramData;
  question: string;
  context?: string;
}

export interface TarotCard {
  name: string;
  suit?: string;
  number?: number;
  position: string;
  isReversed: boolean;
  meaning: string;
  keywords: string[];
}

export interface BirthInfo {
  date: string;
  time?: string;
  location?: string;
  sunSign: string;
  moonSign?: string;
  risingSign?: string;
  aspects?: string[];
}

export interface NumberData {
  lifePathNumber: number;
  destinyNumber?: number;
  soulNumber?: number;
  personalityNumber?: number;
  birthDate: string;
  fullName?: string;
}

export interface HexagramData {
  primaryHexagram: number;
  changingLines?: number[];
  resultHexagram?: number;
  interpretation: string;
}

export interface InterpretationResult {
  id: string;
  type: string;
  summary: string;
  detailedAnalysis: {
    overview: string;
    keyInsights: string[];
    strengths: string[];
    challenges: string[];
    advice: string[];
    futureOutlook: string;
  };
  personalizedMessages: {
    immediate: string;
    shortTerm: string;
    longTerm: string;
  };
  qualityScore: number;
  confidence: number;
  generatedAt: Date;
  metadata: {
    promptUsed: string;
    modelUsed: string;
    processingTime: number;
    tokenUsage: any;
  };
}

export interface InterpretationOptions {
  language?: string;
  tone?: 'formal' | 'casual' | 'mystical' | 'scientific';
  detailLevel?: 'brief' | 'standard' | 'detailed';
  focusAreas?: string[];
  includeAdvice?: boolean;
  includePredictions?: boolean;
  personalizeFor?: {
    age?: number;
    gender?: string;
    interests?: string[];
    concerns?: string[];
  };
}

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly promptService: PromptEngineeringService,
    private readonly cacheService: AiCacheService,
    private readonly loggerService: AiLoggerService,
  ) {}

  /**
   * 生成个性化解读
   */
  async generateInterpretation(
    data: DivinationData,
    options: InterpretationOptions = {},
  ): Promise<InterpretationResult> {
    const startTime = Date.now();
    const interpretationId = this.generateInterpretationId(data);

    try {
      // 检查缓存
      const cached = await this.getCachedInterpretation(interpretationId, options);
      if (cached) {
        this.logger.debug(`Using cached interpretation: ${interpretationId}`);
        return cached;
      }

      // 构建提示词上下文
      const promptContext = this.buildPromptContext(data, options);
      
      // 选择合适的模板
      const templateId = this.selectTemplate(data.type);
      
      // 准备模板变量
      const variables = this.prepareTemplateVariables(data, options);
      
      // 优化提示词
      const optimizedPrompt = await this.promptService.optimizePrompt(
        templateId,
        promptContext,
        variables,
      );

      // 调用AI生成解读
      const aiResponse = await this.openaiService.generateCompletion(
        optimizedPrompt.finalPrompt,
        {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        },
      );

      // 解析和结构化响应
      const interpretation = await this.parseAiResponse(
        aiResponse,
        data,
        options,
        interpretationId,
        optimizedPrompt,
      );

      // 评估解读质量
      interpretation.qualityScore = await this.evaluateQuality(interpretation, data);
      interpretation.confidence = this.calculateConfidence(aiResponse, interpretation);

      // 缓存结果
      await this.cacheInterpretation(interpretationId, interpretation, options);

      // 记录日志
      await this.loggerService.logAiResponse({
        requestId: interpretationId,
        responseId: interpretationId,
        modelProvider: 'openai',
        modelName: aiResponse.model,
        promptTokens: aiResponse.tokenUsage?.promptTokens || 0,
        completionTokens: aiResponse.tokenUsage?.completionTokens || 0,
        totalTokens: aiResponse.tokenUsage?.totalTokens || 0,
        processingTimeMs: Date.now() - startTime,
        responseQuality: interpretation.qualityScore,
        success: true,
      });

      this.logger.log(`Generated interpretation ${interpretationId} in ${Date.now() - startTime}ms`);
      return interpretation;

    } catch (error) {
      this.logger.error(`Failed to generate interpretation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量生成解读
   */
  async generateBatchInterpretations(
    dataList: DivinationData[],
    options: InterpretationOptions = {},
  ): Promise<InterpretationResult[]> {
    const results: InterpretationResult[] = [];
    
    for (const data of dataList) {
      try {
        const interpretation = await this.generateInterpretation(data, options);
        results.push(interpretation);
      } catch (error) {
        this.logger.error(`Failed to generate interpretation for ${data.type}: ${error.message}`);
        // 继续处理其他项目
      }
    }
    
    return results;
  }

  /**
   * 重新生成解读（使用不同参数）
   */
  async regenerateInterpretation(
    originalId: string,
    data: DivinationData,
    newOptions: InterpretationOptions,
  ): Promise<InterpretationResult> {
    // 清除原有缓存
    await this.clearCachedInterpretation(originalId);
    
    // 生成新解读
    return this.generateInterpretation(data, newOptions);
  }

  /**
   * 构建提示词上下文
   */
  private buildPromptContext(data: DivinationData, options: InterpretationOptions): PromptContext {
    return {
      userInfo: options.personalizeFor,
      currentQuestion: data.question,
      divinationType: data.type,
      language: options.language || 'zh-CN',
      tone: options.tone || 'mystical',
    };
  }

  /**
   * 选择合适的模板
   */
  private selectTemplate(type: string): string {
    const templateMap: Record<string, string> = {
      tarot: 'tarot_general',
      astrology: 'astrology_birth_chart',
      numerology: 'numerology_life_path',
      iching: 'tarot_general', // 暂时使用通用模板
    };
    
    return templateMap[type] || 'tarot_general';
  }

  /**
   * 准备模板变量
   */
  private prepareTemplateVariables(data: DivinationData, options: InterpretationOptions): Record<string, any> {
    const variables: Record<string, any> = {
      question: data.question,
      detail_level: options.detailLevel || 'standard',
    };

    switch (data.type) {
      case 'tarot':
        variables.cards = this.formatTarotCards(data.cards || []);
        variables.spread_type = data.spread || '单张牌';
        break;
        
      case 'astrology':
        if (data.birthInfo) {
          variables.birth_date = data.birthInfo.date;
          variables.birth_time = data.birthInfo.time || '未知';
          variables.birth_location = data.birthInfo.location || '未知';
          variables.sun_sign = data.birthInfo.sunSign;
          variables.moon_sign = data.birthInfo.moonSign || '未知';
          variables.rising_sign = data.birthInfo.risingSign || '未知';
          variables.aspects = data.birthInfo.aspects?.join('、') || '无特殊相位';
        }
        break;
        
      case 'numerology':
        if (data.numbers) {
          variables.life_path_number = data.numbers.lifePathNumber;
          variables.destiny_number = data.numbers.destinyNumber || '未计算';
          variables.soul_number = data.numbers.soulNumber || '未计算';
          variables.personality_number = data.numbers.personalityNumber || '未计算';
          variables.birth_date = data.numbers.birthDate;
          variables.full_name = data.numbers.fullName || '未提供';
        }
        break;
    }

    return variables;
  }

  /**
   * 格式化塔罗牌信息
   */
  private formatTarotCards(cards: TarotCard[]): string {
    return cards.map(card => {
      const reversed = card.isReversed ? '（逆位）' : '';
      return `${card.position}: ${card.name}${reversed} - ${card.meaning}`;
    }).join('\n');
  }

  /**
   * 解析AI响应
   */
  private async parseAiResponse(
    aiResponse: any,
    data: DivinationData,
    options: InterpretationOptions,
    interpretationId: string,
    promptInfo: any,
  ): Promise<InterpretationResult> {
    let parsedContent: any;
    
    try {
      // 尝试解析JSON格式的响应
      parsedContent = JSON.parse(aiResponse.text);
    } catch {
      // 如果不是JSON，则解析文本格式
      parsedContent = this.parseTextResponse(aiResponse.text);
    }

    return {
      id: interpretationId,
      type: data.type,
      summary: parsedContent.summary || this.extractSummary(aiResponse.text),
      detailedAnalysis: {
        overview: parsedContent.overview || aiResponse.text.substring(0, 200),
        keyInsights: parsedContent.keyInsights || this.extractKeyInsights(aiResponse.text),
        strengths: parsedContent.strengths || [],
        challenges: parsedContent.challenges || [],
        advice: parsedContent.advice || this.extractAdvice(aiResponse.text),
        futureOutlook: parsedContent.futureOutlook || '',
      },
      personalizedMessages: {
        immediate: parsedContent.immediate || '',
        shortTerm: parsedContent.shortTerm || '',
        longTerm: parsedContent.longTerm || '',
      },
      qualityScore: 0, // 将在后续计算
      confidence: 0, // 将在后续计算
      generatedAt: new Date(),
      metadata: {
        promptUsed: promptInfo.templateUsed,
        modelUsed: aiResponse.model,
        processingTime: aiResponse.responseTime,
        tokenUsage: aiResponse.tokenUsage,
      },
    };
  }

  /**
   * 解析文本格式的响应
   */
  private parseTextResponse(text: string): any {
    const sections = text.split(/\n\s*\n/);
    
    return {
      summary: sections[0] || '',
      overview: sections[1] || '',
      keyInsights: this.extractKeyInsights(text),
      advice: this.extractAdvice(text),
    };
  }

  /**
   * 提取摘要
   */
  private extractSummary(text: string): string {
    const lines = text.split('\n');
    return lines[0] || text.substring(0, 100);
  }

  /**
   * 提取关键洞察
   */
  private extractKeyInsights(text: string): string[] {
    const insights: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('洞察') || line.includes('关键') || line.includes('重要')) {
        insights.push(line.trim());
      }
    }
    
    return insights.slice(0, 5); // 最多5个洞察
  }

  /**
   * 提取建议
   */
  private extractAdvice(text: string): string[] {
    const advice: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('建议') || line.includes('应该') || line.includes('可以')) {
        advice.push(line.trim());
      }
    }
    
    return advice.slice(0, 5); // 最多5个建议
  }

  /**
   * 评估解读质量
   */
  private async evaluateQuality(interpretation: InterpretationResult, data: DivinationData): Promise<number> {
    let score = 0.5; // 基础分数
    
    // 内容完整性
    if (interpretation.summary && interpretation.summary.length > 50) score += 0.1;
    if (interpretation.detailedAnalysis.overview && interpretation.detailedAnalysis.overview.length > 100) score += 0.1;
    if (interpretation.detailedAnalysis.keyInsights.length > 0) score += 0.1;
    if (interpretation.detailedAnalysis.advice.length > 0) score += 0.1;
    
    // 个性化程度
    if (interpretation.personalizedMessages.immediate) score += 0.05;
    if (interpretation.personalizedMessages.shortTerm) score += 0.05;
    if (interpretation.personalizedMessages.longTerm) score += 0.05;
    
    // 相关性
    if (interpretation.summary.includes(data.question.substring(0, 10))) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(aiResponse: any, interpretation: InterpretationResult): number {
    let confidence = 0.7; // 基础置信度
    
    // 基于token使用情况
    if (aiResponse.tokenUsage.completionTokens > 500) confidence += 0.1;
    
    // 基于响应时间（合理的响应时间表示模型有充分思考）
    if (aiResponse.responseTime > 3000 && aiResponse.responseTime < 30000) confidence += 0.1;
    
    // 基于内容结构化程度
    if (interpretation.detailedAnalysis.keyInsights.length >= 3) confidence += 0.05;
    if (interpretation.detailedAnalysis.advice.length >= 3) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 生成解读ID
   */
  private generateInterpretationId(data: DivinationData): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(JSON.stringify(data));
    return `interpretation_${data.type}_${hash}_${timestamp}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 缓存解读结果
   */
  private async cacheInterpretation(
    id: string,
    interpretation: InterpretationResult,
    options: InterpretationOptions,
  ): Promise<void> {
    const cacheKey = `interpretation:${id}:${this.simpleHash(JSON.stringify(options))}`;
    // 创建一个模拟的AiResponse对象用于缓存
    const mockResponse = {
      modelProvider: 'openai',
      modelName: interpretation.metadata.modelUsed,
      modelVersion: '1.0',
      responseText: interpretation.summary,
      formattedResponse: interpretation,
      tokenUsage: interpretation.metadata.tokenUsage,
      quality: null,
      qualityScore: interpretation.qualityScore,
    };
    await this.cacheService.cacheResponse(cacheKey, mockResponse as any, 3600); // 缓存1小时
  }

  /**
   * 获取缓存的解读
   */
  private async getCachedInterpretation(
    id: string,
    options: InterpretationOptions,
  ): Promise<InterpretationResult | null> {
    const cacheKey = `interpretation:${id}:${this.simpleHash(JSON.stringify(options))}`;
    const cached = await this.cacheService.getCachedResponse(cacheKey);
    return cached?.formattedResponse || null;
  }

  /**
   * 清除缓存的解读
   */
  private async clearCachedInterpretation(id: string): Promise<void> {
    const pattern = `interpretation:${id}:*`;
    await this.cacheService.deleteCacheByPattern(pattern);
  }

  /**
   * 获取解读统计信息
   */
  async getInterpretationStats(): Promise<{
    totalGenerated: number;
    averageQuality: number;
    averageConfidence: number;
    typeDistribution: Record<string, number>;
    recentActivity: any[];
  }> {
    // 这里应该从数据库或缓存中获取统计信息
    // 暂时返回模拟数据
    return {
      totalGenerated: 0,
      averageQuality: 0,
      averageConfidence: 0,
      typeDistribution: {},
      recentActivity: [],
    };
  }
}