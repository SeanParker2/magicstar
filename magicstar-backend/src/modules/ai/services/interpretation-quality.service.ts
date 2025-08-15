import { Injectable, Logger } from '@nestjs/common';
import { InterpretationResult, DivinationData } from './interpretation.service';
import { OpenaiService } from './openai.service';
import { AiLoggerService } from './ai-logger.service';

export interface QualityMetrics {
  relevance: number; // 相关性 (0-1)
  coherence: number; // 连贯性 (0-1)
  depth: number; // 深度 (0-1)
  personalization: number; // 个性化程度 (0-1)
  accuracy: number; // 准确性 (0-1)
  completeness: number; // 完整性 (0-1)
  overall: number; // 总体质量 (0-1)
}

export interface QualityAssessment {
  interpretationId: string;
  metrics: QualityMetrics;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  assessedAt: Date;
  assessmentMethod: 'ai' | 'rule-based' | 'hybrid';
}

export interface QualityImprovementSuggestion {
  category: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // 0-1
}

@Injectable()
export class InterpretationQualityService {
  private readonly logger = new Logger(InterpretationQualityService.name);

  // 质量评估权重配置
  private readonly qualityWeights = {
    relevance: 0.25,
    coherence: 0.20,
    depth: 0.15,
    personalization: 0.15,
    accuracy: 0.15,
    completeness: 0.10,
  };

  // 质量阈值配置
  private readonly qualityThresholds = {
    excellent: 0.9,
    good: 0.8,
    acceptable: 0.7,
    poor: 0.6,
  };

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly aiLoggerService: AiLoggerService,
  ) {}

  /**
   * 评估解读质量
   */
  async assessQuality(
    interpretation: InterpretationResult,
    originalData: DivinationData,
  ): Promise<QualityAssessment> {
    const startTime = Date.now();

    try {
      // 使用混合方法评估质量
      const ruleBasedMetrics = await this.assessByRules(interpretation, originalData);
      const aiBasedMetrics = await this.assessByAI(interpretation, originalData);

      // 合并评估结果
      const metrics = this.combineMetrics(ruleBasedMetrics, aiBasedMetrics);
      
      // 计算总体分数
      const score = this.calculateOverallScore(metrics);
      
      // 确定等级
      const grade = this.determineGrade(score);
      
      // 生成反馈
      const feedback = await this.generateFeedback(interpretation, metrics, originalData);

      const assessment: QualityAssessment = {
        interpretationId: interpretation.id,
        metrics,
        feedback,
        score: Math.round(score * 100),
        grade,
        assessedAt: new Date(),
        assessmentMethod: 'hybrid',
      };

      // 记录评估日志
      await this.aiLoggerService.log({
        level: 'info',
        message: 'Quality assessment completed',
        context: 'QualityAssessment',
        requestId: interpretation.id,
        metadata: {
          score: assessment.score,
          grade: assessment.grade,
          processingTime: Date.now() - startTime,
          method: 'hybrid',
        },
      });

      return assessment;

    } catch (error) {
      this.logger.error(`Failed to assess quality for interpretation ${interpretation.id}: ${error.message}`, error.stack);
      
      // 返回默认评估
      return this.getDefaultAssessment(interpretation.id);
    }
  }

  /**
   * 基于规则的质量评估
   */
  private async assessByRules(
    interpretation: InterpretationResult,
    originalData: DivinationData,
  ): Promise<QualityMetrics> {
    const metrics: QualityMetrics = {
      relevance: 0,
      coherence: 0,
      depth: 0,
      personalization: 0,
      accuracy: 0,
      completeness: 0,
      overall: 0,
    };

    // 相关性评估
    metrics.relevance = this.assessRelevance(interpretation, originalData);
    
    // 连贯性评估
    metrics.coherence = this.assessCoherence(interpretation);
    
    // 深度评估
    metrics.depth = this.assessDepth(interpretation);
    
    // 个性化评估
    metrics.personalization = this.assessPersonalization(interpretation);
    
    // 准确性评估（基于规则）
    metrics.accuracy = this.assessAccuracy(interpretation, originalData);
    
    // 完整性评估
    metrics.completeness = this.assessCompleteness(interpretation);
    
    // 计算总体分数
    metrics.overall = this.calculateWeightedScore(metrics);

    return metrics;
  }

  /**
   * 基于AI的质量评估
   */
  private async assessByAI(
    interpretation: InterpretationResult,
    originalData: DivinationData,
  ): Promise<QualityMetrics> {
    try {
      const prompt = this.buildQualityAssessmentPrompt(interpretation, originalData);
      
      const response = await this.openaiService.generateCompletion(prompt, {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1000,
      });

      // 解析AI评估结果
      return this.parseAIAssessment(response.text);

    } catch (error) {
      this.logger.warn(`AI assessment failed, using rule-based fallback: ${error.message}`);
      
      // 如果AI评估失败，返回中等分数
      return {
        relevance: 0.7,
        coherence: 0.7,
        depth: 0.7,
        personalization: 0.7,
        accuracy: 0.7,
        completeness: 0.7,
        overall: 0.7,
      };
    }
  }

  /**
   * 评估相关性
   */
  private assessRelevance(interpretation: InterpretationResult, originalData: DivinationData): number {
    let score = 0.5; // 基础分数

    // 检查是否包含问题关键词
    const questionKeywords = this.extractKeywords(originalData.question);
    const interpretationText = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    
    const matchedKeywords = questionKeywords.filter(keyword => 
      interpretationText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    score += (matchedKeywords.length / questionKeywords.length) * 0.3;

    // 检查占卜类型相关性
    const typeRelevant = this.checkTypeRelevance(interpretation, originalData.type);
    score += typeRelevant ? 0.2 : 0;

    return Math.min(score, 1.0);
  }

  /**
   * 评估连贯性
   */
  private assessCoherence(interpretation: InterpretationResult): number {
    let score = 0.5;

    // 检查文本长度合理性
    const summaryLength = interpretation.summary.length;
    const overviewLength = interpretation.detailedAnalysis.overview.length;
    
    if (summaryLength >= 50 && summaryLength <= 300) score += 0.1;
    if (overviewLength >= 100 && overviewLength <= 1000) score += 0.1;

    // 检查结构完整性
    if (interpretation.detailedAnalysis.keyInsights.length > 0) score += 0.1;
    if (interpretation.detailedAnalysis.advice.length > 0) score += 0.1;
    if (interpretation.personalizedMessages.immediate) score += 0.1;

    // 检查逻辑一致性（简单检查）
    const hasContradictions = this.checkContradictions(interpretation);
    if (!hasContradictions) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * 评估深度
   */
  private assessDepth(interpretation: InterpretationResult): number {
    let score = 0.3;

    // 检查洞察数量和质量
    const insightCount = interpretation.detailedAnalysis.keyInsights.length;
    score += Math.min(insightCount * 0.1, 0.3);

    // 检查建议数量和质量
    const adviceCount = interpretation.detailedAnalysis.advice.length;
    score += Math.min(adviceCount * 0.08, 0.2);

    // 检查分析的详细程度
    const analysisDepth = this.assessAnalysisDepth(interpretation.detailedAnalysis.overview);
    score += analysisDepth * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * 评估个性化程度
   */
  private assessPersonalization(interpretation: InterpretationResult): number {
    let score = 0.4;

    // 检查个性化消息
    if (interpretation.personalizedMessages.immediate) score += 0.2;
    if (interpretation.personalizedMessages.shortTerm) score += 0.2;
    if (interpretation.personalizedMessages.longTerm) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * 评估准确性（基于规则）
   */
  private assessAccuracy(interpretation: InterpretationResult, originalData: DivinationData): number {
    let score = 0.6; // 基础分数

    // 根据占卜类型检查特定准确性
    switch (originalData.type) {
      case 'tarot':
        score += this.assessTarotAccuracy(interpretation, originalData) * 0.4;
        break;
      case 'astrology':
        score += this.assessAstrologyAccuracy(interpretation, originalData) * 0.4;
        break;
      case 'numerology':
        score += this.assessNumerologyAccuracy(interpretation, originalData) * 0.4;
        break;
      default:
        score += 0.2; // 默认加分
    }

    return Math.min(score, 1.0);
  }

  /**
   * 评估完整性
   */
  private assessCompleteness(interpretation: InterpretationResult): number {
    let score = 0;
    const requiredFields = [
      interpretation.summary,
      interpretation.detailedAnalysis.overview,
      interpretation.detailedAnalysis.keyInsights.length > 0,
      interpretation.detailedAnalysis.advice.length > 0,
      interpretation.personalizedMessages.immediate,
    ];

    const completedFields = requiredFields.filter(field => !!field).length;
    score = completedFields / requiredFields.length;

    return score;
  }

  /**
   * 合并评估指标
   */
  private combineMetrics(ruleBasedMetrics: QualityMetrics, aiBasedMetrics: QualityMetrics): QualityMetrics {
    const combined: QualityMetrics = {
      relevance: (ruleBasedMetrics.relevance * 0.6) + (aiBasedMetrics.relevance * 0.4),
      coherence: (ruleBasedMetrics.coherence * 0.7) + (aiBasedMetrics.coherence * 0.3),
      depth: (ruleBasedMetrics.depth * 0.5) + (aiBasedMetrics.depth * 0.5),
      personalization: (ruleBasedMetrics.personalization * 0.8) + (aiBasedMetrics.personalization * 0.2),
      accuracy: (ruleBasedMetrics.accuracy * 0.6) + (aiBasedMetrics.accuracy * 0.4),
      completeness: (ruleBasedMetrics.completeness * 0.9) + (aiBasedMetrics.completeness * 0.1),
      overall: 0,
    };

    combined.overall = this.calculateWeightedScore(combined);
    return combined;
  }

  /**
   * 计算加权分数
   */
  private calculateWeightedScore(metrics: QualityMetrics): number {
    return (
      metrics.relevance * this.qualityWeights.relevance +
      metrics.coherence * this.qualityWeights.coherence +
      metrics.depth * this.qualityWeights.depth +
      metrics.personalization * this.qualityWeights.personalization +
      metrics.accuracy * this.qualityWeights.accuracy +
      metrics.completeness * this.qualityWeights.completeness
    );
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    return metrics.overall;
  }

  /**
   * 确定等级
   */
  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= this.qualityThresholds.excellent) return 'A';
    if (score >= this.qualityThresholds.good) return 'B';
    if (score >= this.qualityThresholds.acceptable) return 'C';
    if (score >= this.qualityThresholds.poor) return 'D';
    return 'F';
  }

  /**
   * 生成反馈
   */
  private async generateFeedback(
    interpretation: InterpretationResult,
    metrics: QualityMetrics,
    originalData: DivinationData,
  ): Promise<{ strengths: string[]; weaknesses: string[]; suggestions: string[] }> {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // 分析各项指标
    Object.entries(metrics).forEach(([key, value]) => {
      if (key === 'overall') return;
      
      if (value >= 0.8) {
        strengths.push(this.getStrengthMessage(key, value));
      } else if (value < 0.6) {
        weaknesses.push(this.getWeaknessMessage(key, value));
        suggestions.push(this.getSuggestionMessage(key));
      }
    });

    return { strengths, weaknesses, suggestions };
  }

  /**
   * 获取优势消息
   */
  private getStrengthMessage(metric: string, value: number): string {
    const messages = {
      relevance: '解读内容与问题高度相关',
      coherence: '解读逻辑清晰，结构完整',
      depth: '分析深入，洞察丰富',
      personalization: '个性化程度高，针对性强',
      accuracy: '解读准确，符合占卜原理',
      completeness: '内容完整，覆盖全面',
    };
    return messages[metric] || `${metric}表现优秀`;
  }

  /**
   * 获取弱点消息
   */
  private getWeaknessMessage(metric: string, value: number): string {
    const messages = {
      relevance: '解读内容与问题相关性不足',
      coherence: '解读逻辑不够清晰',
      depth: '分析深度有待提升',
      personalization: '个性化程度不够',
      accuracy: '解读准确性需要改进',
      completeness: '内容不够完整',
    };
    return messages[metric] || `${metric}需要改进`;
  }

  /**
   * 获取建议消息
   */
  private getSuggestionMessage(metric: string): string {
    const suggestions = {
      relevance: '建议在解读中更多地回应用户的具体问题',
      coherence: '建议优化解读的逻辑结构和表达方式',
      depth: '建议提供更深入的分析和更多的洞察',
      personalization: '建议增加更多个性化的建议和指导',
      accuracy: '建议检查解读是否符合相应的占卜原理',
      completeness: '建议补充缺失的解读内容',
    };
    return suggestions[metric] || `建议改进${metric}`;
  }

  /**
   * 构建质量评估提示词
   */
  private buildQualityAssessmentPrompt(interpretation: InterpretationResult, originalData: DivinationData): string {
    return `请评估以下占卜解读的质量，从相关性、连贯性、深度、个性化、准确性、完整性六个维度给出0-1的分数。

原始问题：${originalData.question}
占卜类型：${originalData.type}

解读内容：
摘要：${interpretation.summary}
详细分析：${interpretation.detailedAnalysis.overview}
关键洞察：${interpretation.detailedAnalysis.keyInsights.join(', ')}
建议：${interpretation.detailedAnalysis.advice.join(', ')}

请以JSON格式返回评估结果：
{
  "relevance": 0.8,
  "coherence": 0.9,
  "depth": 0.7,
  "personalization": 0.8,
  "accuracy": 0.8,
  "completeness": 0.9
}`;
  }

  /**
   * 解析AI评估结果
   */
  private parseAIAssessment(response: string): QualityMetrics {
    try {
      const parsed = JSON.parse(response);
      return {
        relevance: parsed.relevance || 0.7,
        coherence: parsed.coherence || 0.7,
        depth: parsed.depth || 0.7,
        personalization: parsed.personalization || 0.7,
        accuracy: parsed.accuracy || 0.7,
        completeness: parsed.completeness || 0.7,
        overall: 0, // 将在后续计算
      };
    } catch (error) {
      this.logger.warn(`Failed to parse AI assessment: ${error.message}`);
      return {
        relevance: 0.7,
        coherence: 0.7,
        depth: 0.7,
        personalization: 0.7,
        accuracy: 0.7,
        completeness: 0.7,
        overall: 0.7,
      };
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 简单的关键词提取，实际应用中可以使用更复杂的NLP技术
    const words = text.split(/\s+/);
    return words.filter(word => word.length > 2 && !/^[的了是在有和与或但]$/.test(word));
  }

  /**
   * 检查类型相关性
   */
  private checkTypeRelevance(interpretation: InterpretationResult, type: string): boolean {
    const typeKeywords = {
      tarot: ['牌', '塔罗', '卡片', '牌面'],
      astrology: ['星座', '星盘', '行星', '宫位'],
      numerology: ['数字', '生命', '命理', '数'],
      iching: ['卦', '易经', '爻', '变卦'],
    };

    const keywords = typeKeywords[type] || [];
    const text = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 检查矛盾
   */
  private checkContradictions(interpretation: InterpretationResult): boolean {
    // 简单的矛盾检查，实际应用中可以使用更复杂的逻辑
    const text = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    const contradictionPairs = [
      ['好', '坏'],
      ['成功', '失败'],
      ['积极', '消极'],
      ['顺利', '困难'],
    ];

    return contradictionPairs.some(([positive, negative]) => 
      text.includes(positive) && text.includes(negative)
    );
  }

  /**
   * 评估分析深度
   */
  private assessAnalysisDepth(text: string): number {
    let score = 0;
    
    // 检查分析词汇
    const analysisWords = ['因为', '所以', '导致', '影响', '原因', '结果', '表明', '说明'];
    const foundWords = analysisWords.filter(word => text.includes(word));
    score += Math.min(foundWords.length * 0.1, 0.5);
    
    // 检查文本长度
    if (text.length > 200) score += 0.3;
    if (text.length > 500) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * 评估塔罗准确性
   */
  private assessTarotAccuracy(interpretation: InterpretationResult, originalData: DivinationData): number {
    // 检查是否提到了具体的牌名
    const cards = originalData.cards || [];
    const text = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    
    const mentionedCards = cards.filter(card => text.includes(card.name));
    return mentionedCards.length / Math.max(cards.length, 1);
  }

  /**
   * 评估星座准确性
   */
  private assessAstrologyAccuracy(interpretation: InterpretationResult, originalData: DivinationData): number {
    const birthInfo = originalData.birthInfo;
    if (!birthInfo) return 0.5;
    
    const text = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    let score = 0;
    
    if (text.includes(birthInfo.sunSign)) score += 0.4;
    if (birthInfo.moonSign && text.includes(birthInfo.moonSign)) score += 0.3;
    if (birthInfo.risingSign && text.includes(birthInfo.risingSign)) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * 评估数字命理准确性
   */
  private assessNumerologyAccuracy(interpretation: InterpretationResult, originalData: DivinationData): number {
    const numbers = originalData.numbers;
    if (!numbers) return 0.5;
    
    const text = interpretation.summary + ' ' + interpretation.detailedAnalysis.overview;
    let score = 0;
    
    if (text.includes(numbers.lifePathNumber.toString())) score += 0.5;
    if (numbers.destinyNumber && text.includes(numbers.destinyNumber.toString())) score += 0.25;
    if (numbers.soulNumber && text.includes(numbers.soulNumber.toString())) score += 0.25;
    
    return Math.min(score, 1.0);
  }

  /**
   * 获取默认评估
   */
  private getDefaultAssessment(interpretationId: string): QualityAssessment {
    return {
      interpretationId,
      metrics: {
        relevance: 0.7,
        coherence: 0.7,
        depth: 0.7,
        personalization: 0.7,
        accuracy: 0.7,
        completeness: 0.7,
        overall: 0.7,
      },
      feedback: {
        strengths: ['基础解读完成'],
        weaknesses: ['质量评估失败'],
        suggestions: ['建议重新评估'],
      },
      score: 70,
      grade: 'C',
      assessedAt: new Date(),
      assessmentMethod: 'rule-based',
    };
  }

  /**
   * 批量质量评估
   */
  async batchAssessQuality(
    interpretations: InterpretationResult[],
    originalDataList: DivinationData[],
  ): Promise<QualityAssessment[]> {
    const assessments: QualityAssessment[] = [];
    
    for (let i = 0; i < interpretations.length; i++) {
      try {
        const assessment = await this.assessQuality(interpretations[i], originalDataList[i]);
        assessments.push(assessment);
      } catch (error) {
        this.logger.error(`Failed to assess interpretation ${interpretations[i].id}: ${error.message}`);
        assessments.push(this.getDefaultAssessment(interpretations[i].id));
      }
    }
    
    return assessments;
  }

  /**
   * 获取质量改进建议
   */
  async getImprovementSuggestions(
    assessment: QualityAssessment,
  ): Promise<QualityImprovementSuggestion[]> {
    const suggestions: QualityImprovementSuggestion[] = [];
    
    // 基于评估结果生成改进建议
    Object.entries(assessment.metrics).forEach(([metric, score]) => {
      if (metric === 'overall') return;
      
      if (score < 0.7) {
        suggestions.push({
          category: metric,
          issue: this.getWeaknessMessage(metric, score),
          suggestion: this.getSuggestionMessage(metric),
          priority: score < 0.5 ? 'high' : 'medium',
          estimatedImpact: (0.8 - score) * 0.5, // 估算改进影响
        });
      }
    });
    
    return suggestions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }
}