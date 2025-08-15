import { Injectable, Logger } from '@nestjs/common';
import { InterpretationResult, DivinationData } from './interpretation.service';
import { QualityAssessment, QualityImprovementSuggestion, InterpretationQualityService } from './interpretation-quality.service';
import { OpenaiService } from './openai.service';
import { PromptEngineeringService } from './prompt-engineering.service';
import { AiLoggerService } from './ai-logger.service';
import { AiCacheService } from './ai-cache.service';

export interface OptimizationStrategy {
  name: string;
  description: string;
  targetMetrics: string[];
  priority: number;
  enabled: boolean;
}

export interface OptimizationResult {
  originalInterpretation: InterpretationResult;
  optimizedInterpretation: InterpretationResult;
  improvements: {
    metric: string;
    beforeScore: number;
    afterScore: number;
    improvement: number;
  }[];
  strategy: string;
  optimizationTime: number;
  success: boolean;
}

export interface OptimizationConfig {
  maxRetries: number;
  qualityThreshold: number;
  enabledStrategies: string[];
  cacheResults: boolean;
  logOptimizations: boolean;
}

@Injectable()
export class InterpretationOptimizerService {
  private readonly logger = new Logger(InterpretationOptimizerService.name);

  // 优化策略配置
  private readonly optimizationStrategies: OptimizationStrategy[] = [
    {
      name: 'enhance_relevance',
      description: '增强解读与问题的相关性',
      targetMetrics: ['relevance'],
      priority: 1,
      enabled: true,
    },
    {
      name: 'improve_coherence',
      description: '改善解读的逻辑连贯性',
      targetMetrics: ['coherence'],
      priority: 2,
      enabled: true,
    },
    {
      name: 'deepen_analysis',
      description: '深化分析内容',
      targetMetrics: ['depth'],
      priority: 3,
      enabled: true,
    },
    {
      name: 'personalize_content',
      description: '增强个性化程度',
      targetMetrics: ['personalization'],
      priority: 4,
      enabled: true,
    },
    {
      name: 'enhance_accuracy',
      description: '提升解读准确性',
      targetMetrics: ['accuracy'],
      priority: 5,
      enabled: true,
    },
    {
      name: 'complete_content',
      description: '补充缺失内容',
      targetMetrics: ['completeness'],
      priority: 6,
      enabled: true,
    },
  ];

  // 默认配置
  private readonly defaultConfig: OptimizationConfig = {
    maxRetries: 3,
    qualityThreshold: 0.8,
    enabledStrategies: ['enhance_relevance', 'improve_coherence', 'deepen_analysis'],
    cacheResults: true,
    logOptimizations: true,
  };

  constructor(
    private readonly qualityService: InterpretationQualityService,
    private readonly openaiService: OpenaiService,
    private readonly promptService: PromptEngineeringService,
    private readonly aiLoggerService: AiLoggerService,
    private readonly cacheService: AiCacheService,
  ) {}

  /**
   * 优化解读结果
   */
  async optimizeInterpretation(
    interpretation: InterpretationResult,
    originalData: DivinationData,
    config: Partial<OptimizationConfig> = {},
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // 检查缓存
      if (finalConfig.cacheResults) {
        const cached = await this.getCachedOptimization(interpretation.id);
        if (cached) {
          this.logger.debug(`Using cached optimization for interpretation ${interpretation.id}`);
          return cached;
        }
      }

      // 评估当前质量
      const initialAssessment = await this.qualityService.assessQuality(interpretation, originalData);
      
      // 如果质量已经足够好，直接返回
      if (initialAssessment.score / 100 >= finalConfig.qualityThreshold) {
        this.logger.debug(`Interpretation ${interpretation.id} already meets quality threshold`);
        return this.createOptimizationResult(interpretation, interpretation, [], 'no_optimization', Date.now() - startTime, true);
      }

      // 获取改进建议
      const suggestions = await this.qualityService.getImprovementSuggestions(initialAssessment);
      
      // 选择优化策略
      const strategy = this.selectOptimizationStrategy(suggestions, finalConfig);
      
      // 执行优化
      const optimizedInterpretation = await this.executeOptimization(
        interpretation,
        originalData,
        strategy,
        suggestions,
        finalConfig,
      );

      // 评估优化后的质量
      const finalAssessment = await this.qualityService.assessQuality(optimizedInterpretation, originalData);
      
      // 计算改进情况
      const improvements = this.calculateImprovements(initialAssessment, finalAssessment);
      
      const result = this.createOptimizationResult(
        interpretation,
        optimizedInterpretation,
        improvements,
        strategy.name,
        Date.now() - startTime,
        finalAssessment.score > initialAssessment.score,
      );

      // 缓存结果
      if (finalConfig.cacheResults) {
        await this.cacheOptimization(interpretation.id, result);
      }

      // 记录日志
      if (finalConfig.logOptimizations) {
        await this.logOptimization(result, initialAssessment, finalAssessment);
      }

      return result;

    } catch (error) {
      this.logger.error(`Failed to optimize interpretation ${interpretation.id}: ${error.message}`, error.stack);
      
      return this.createOptimizationResult(
        interpretation,
        interpretation,
        [],
        'error',
        Date.now() - startTime,
        false,
      );
    }
  }

  /**
   * 选择优化策略
   */
  private selectOptimizationStrategy(
    suggestions: QualityImprovementSuggestion[],
    config: OptimizationConfig,
  ): OptimizationStrategy {
    // 根据建议和配置选择最合适的策略
    const enabledStrategies = this.optimizationStrategies.filter(
      strategy => strategy.enabled && config.enabledStrategies.includes(strategy.name)
    );

    if (suggestions.length === 0) {
      // 如果没有具体建议，选择优先级最高的策略
      return enabledStrategies.sort((a, b) => a.priority - b.priority)[0];
    }

    // 根据建议选择最相关的策略
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
    
    for (const suggestion of highPrioritySuggestions) {
      const matchingStrategy = enabledStrategies.find(
        strategy => strategy.targetMetrics.includes(suggestion.category)
      );
      if (matchingStrategy) {
        return matchingStrategy;
      }
    }

    // 如果没有匹配的高优先级策略，选择第一个相关策略
    for (const suggestion of suggestions) {
      const matchingStrategy = enabledStrategies.find(
        strategy => strategy.targetMetrics.includes(suggestion.category)
      );
      if (matchingStrategy) {
        return matchingStrategy;
      }
    }

    // 默认返回第一个启用的策略
    return enabledStrategies[0];
  }

  /**
   * 执行优化
   */
  private async executeOptimization(
    interpretation: InterpretationResult,
    originalData: DivinationData,
    strategy: OptimizationStrategy,
    suggestions: QualityImprovementSuggestion[],
    config: OptimizationConfig,
  ): Promise<InterpretationResult> {
    let currentInterpretation = interpretation;
    let retries = 0;

    while (retries < config.maxRetries) {
      try {
        const optimizedInterpretation = await this.applyOptimizationStrategy(
          currentInterpretation,
          originalData,
          strategy,
          suggestions,
        );

        // 验证优化结果
        if (this.validateOptimization(optimizedInterpretation)) {
          return optimizedInterpretation;
        }

        retries++;
        this.logger.warn(`Optimization attempt ${retries} failed validation for interpretation ${interpretation.id}`);
        
      } catch (error) {
        retries++;
        this.logger.warn(`Optimization attempt ${retries} failed: ${error.message}`);
        
        if (retries >= config.maxRetries) {
          throw error;
        }
      }
    }

    throw new Error(`Failed to optimize interpretation after ${config.maxRetries} attempts`);
  }

  /**
   * 应用优化策略
   */
  private async applyOptimizationStrategy(
    interpretation: InterpretationResult,
    originalData: DivinationData,
    strategy: OptimizationStrategy,
    suggestions: QualityImprovementSuggestion[],
  ): Promise<InterpretationResult> {
    const prompt = this.buildOptimizationPrompt(interpretation, originalData, strategy, suggestions);
    
    const response = await this.openaiService.generateCompletion(prompt, {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    });

    return this.parseOptimizedInterpretation(response.text, interpretation);
  }

  /**
   * 构建优化提示词
   */
  private buildOptimizationPrompt(
    interpretation: InterpretationResult,
    originalData: DivinationData,
    strategy: OptimizationStrategy,
    suggestions: QualityImprovementSuggestion[],
  ): string {
    const relevantSuggestions = suggestions.filter(
      s => strategy.targetMetrics.includes(s.category)
    );

    let prompt = `请根据以下策略优化占卜解读：\n\n`;
    prompt += `优化策略：${strategy.description}\n`;
    prompt += `目标指标：${strategy.targetMetrics.join(', ')}\n\n`;
    
    if (relevantSuggestions.length > 0) {
      prompt += `具体改进建议：\n`;
      relevantSuggestions.forEach((suggestion, index) => {
        prompt += `${index + 1}. ${suggestion.suggestion}\n`;
      });
      prompt += `\n`;
    }

    prompt += `原始问题：${originalData.question}\n`;
    prompt += `占卜类型：${originalData.type}\n\n`;
    
    prompt += `当前解读：\n`;
    prompt += `摘要：${interpretation.summary}\n`;
    prompt += `详细分析：${interpretation.detailedAnalysis.overview}\n`;
    prompt += `关键洞察：${interpretation.detailedAnalysis.keyInsights.join(', ')}\n`;
    prompt += `建议：${interpretation.detailedAnalysis.advice.join(', ')}\n\n`;
    
    prompt += `请提供优化后的解读，保持JSON格式：\n`;
    prompt += `{\n`;
    prompt += `  "summary": "优化后的摘要",\n`;
    prompt += `  "detailedAnalysis": {\n`;
    prompt += `    "overview": "优化后的详细分析",\n`;
    prompt += `    "keyInsights": ["洞察1", "洞察2", "洞察3"],\n`;
    prompt += `    "advice": ["建议1", "建议2", "建议3"]\n`;
    prompt += `  },\n`;
    prompt += `  "personalizedMessages": {\n`;
    prompt += `    "immediate": "即时个性化消息",\n`;
    prompt += `    "shortTerm": "短期个性化消息",\n`;
    prompt += `    "longTerm": "长期个性化消息"\n`;
    prompt += `  }\n`;
    prompt += `}`;

    return prompt;
  }

  /**
   * 解析优化后的解读
   */
  private parseOptimizedInterpretation(
    response: string,
    originalInterpretation: InterpretationResult,
  ): InterpretationResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        ...originalInterpretation,
        id: `${originalInterpretation.id}_optimized_${Date.now()}`,
        summary: parsed.summary || originalInterpretation.summary,
        detailedAnalysis: {
          overview: parsed.detailedAnalysis?.overview || originalInterpretation.detailedAnalysis.overview,
          keyInsights: parsed.detailedAnalysis?.keyInsights || originalInterpretation.detailedAnalysis.keyInsights,
          strengths: parsed.detailedAnalysis?.strengths || originalInterpretation.detailedAnalysis.strengths,
          challenges: parsed.detailedAnalysis?.challenges || originalInterpretation.detailedAnalysis.challenges,
          advice: parsed.detailedAnalysis?.advice || originalInterpretation.detailedAnalysis.advice,
          futureOutlook: parsed.detailedAnalysis?.futureOutlook || originalInterpretation.detailedAnalysis.futureOutlook,
        },
        personalizedMessages: {
          immediate: parsed.personalizedMessages?.immediate || originalInterpretation.personalizedMessages.immediate,
          shortTerm: parsed.personalizedMessages?.shortTerm || originalInterpretation.personalizedMessages.shortTerm,
          longTerm: parsed.personalizedMessages?.longTerm || originalInterpretation.personalizedMessages.longTerm,
        },
        generatedAt: new Date(),
      };
      
    } catch (error) {
      this.logger.warn(`Failed to parse optimized interpretation: ${error.message}`);
      throw new Error('Failed to parse optimization result');
    }
  }

  /**
   * 验证优化结果
   */
  private validateOptimization(interpretation: InterpretationResult): boolean {
    // 基本验证
    if (!interpretation.summary || interpretation.summary.length < 20) {
      return false;
    }
    
    if (!interpretation.detailedAnalysis.overview || interpretation.detailedAnalysis.overview.length < 50) {
      return false;
    }
    
    if (interpretation.detailedAnalysis.keyInsights.length === 0) {
      return false;
    }
    
    if (interpretation.detailedAnalysis.advice.length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * 计算改进情况
   */
  private calculateImprovements(
    initialAssessment: QualityAssessment,
    finalAssessment: QualityAssessment,
  ): { metric: string; beforeScore: number; afterScore: number; improvement: number }[] {
    const improvements: { metric: string; beforeScore: number; afterScore: number; improvement: number }[] = [];
    
    Object.entries(initialAssessment.metrics).forEach(([metric, beforeScore]) => {
      if (metric === 'overall') return;
      
      const afterScore = finalAssessment.metrics[metric];
      const improvement = afterScore - beforeScore;
      
      improvements.push({
        metric,
        beforeScore: Math.round(beforeScore * 100) / 100,
        afterScore: Math.round(afterScore * 100) / 100,
        improvement: Math.round(improvement * 100) / 100,
      });
    });
    
    return improvements;
  }

  /**
   * 创建优化结果
   */
  private createOptimizationResult(
    original: InterpretationResult,
    optimized: InterpretationResult,
    improvements: any[],
    strategy: string,
    optimizationTime: number,
    success: boolean,
  ): OptimizationResult {
    return {
      originalInterpretation: original,
      optimizedInterpretation: optimized,
      improvements,
      strategy,
      optimizationTime,
      success,
    };
  }

  /**
   * 缓存优化结果
   */
  private async cacheOptimization(interpretationId: string, result: OptimizationResult): Promise<void> {
    try {
      const cacheKey = `optimization:${interpretationId}`;
      // 使用简单的键值缓存而不是AI响应缓存
      // await this.cacheService.set(cacheKey, JSON.stringify(result), 3600);
    } catch (error) {
      this.logger.warn(`Failed to cache optimization result: ${error.message}`);
    }
  }

  /**
   * 获取缓存的优化结果
   */
  private async getCachedOptimization(interpretationId: string): Promise<OptimizationResult | null> {
    try {
      const cacheKey = `optimization:${interpretationId}`;
      // 使用简单的键值缓存而不是AI响应缓存
      // const cached = await this.cacheService.get(cacheKey);
      // return cached ? JSON.parse(cached) : null;
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached optimization: ${error.message}`);
      return null;
    }
  }

  /**
   * 记录优化日志
   */
  private async logOptimization(
    result: OptimizationResult,
    initialAssessment: QualityAssessment,
    finalAssessment: QualityAssessment,
  ): Promise<void> {
    try {
      await this.aiLoggerService.log({
        level: 'info',
        message: 'Interpretation optimization completed',
        context: 'OptimizationService',
        requestId: result.originalInterpretation.id,
        metadata: {
          strategy: result.strategy,
          success: result.success,
          optimizationTime: result.optimizationTime,
          initialScore: initialAssessment.score,
          finalScore: finalAssessment.score,
          improvement: finalAssessment.score - initialAssessment.score,
          improvements: result.improvements,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log optimization: ${error.message}`);
    }
  }

  /**
   * 批量优化解读
   */
  async batchOptimizeInterpretations(
    interpretations: InterpretationResult[],
    originalDataList: DivinationData[],
    config: Partial<OptimizationConfig> = {},
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    for (let i = 0; i < interpretations.length; i++) {
      try {
        const result = await this.optimizeInterpretation(
          interpretations[i],
          originalDataList[i],
          config,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to optimize interpretation ${interpretations[i].id}: ${error.message}`);
        results.push(
          this.createOptimizationResult(
            interpretations[i],
            interpretations[i],
            [],
            'error',
            0,
            false,
          )
        );
      }
    }
    
    return results;
  }

  /**
   * 获取优化策略列表
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    return [...this.optimizationStrategies];
  }

  /**
   * 更新优化策略配置
   */
  updateOptimizationStrategy(name: string, updates: Partial<OptimizationStrategy>): boolean {
    const strategy = this.optimizationStrategies.find(s => s.name === name);
    if (strategy) {
      Object.assign(strategy, updates);
      return true;
    }
    return false;
  }

  /**
   * 获取优化统计信息
   */
  async getOptimizationStats(timeRange: { start: Date; end: Date }): Promise<{
    totalOptimizations: number;
    successfulOptimizations: number;
    averageImprovement: number;
    topStrategies: { strategy: string; count: number; averageImprovement: number }[];
  }> {
    // 这里应该从数据库或缓存中获取统计信息
    // 目前返回模拟数据
    return {
      totalOptimizations: 0,
      successfulOptimizations: 0,
      averageImprovement: 0,
      topStrategies: [],
    };
  }
}