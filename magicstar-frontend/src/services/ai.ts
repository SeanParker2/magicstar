import { request } from './api';

// AI解读相关接口类型定义
export interface InterpretationRequest {
  type: 'tarot' | 'astrology' | 'numerology';
  data: any;
  userId?: number;
  options?: {
    style?: 'professional' | 'casual' | 'mystical';
    length?: 'brief' | 'detailed' | 'comprehensive';
    language?: 'zh' | 'en';
  };
}

export interface InterpretationResult {
  id: string;
  type: string;
  content: string;
  summary: string;
  advice: string;
  qualityScore: number;
  metadata: {
    promptUsed: string;
    modelUsed: string;
    processingTime: number;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  createdAt: string;
}

export interface QualityAssessment {
  score: number;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  feedback: string;
  suggestions: string[];
  metrics: {
    relevance: number;
    clarity: number;
    depth: number;
    accuracy: number;
    helpfulness: number;
  };
}

export interface OptimizationResult {
  originalId: string;
  optimizedContent: string;
  improvements: string[];
  qualityImprovement: number;
  strategy: string;
}

export interface InterpretationStats {
  totalGenerated: number;
  averageQuality: number;
  popularTypes: Array<{
    type: string;
    count: number;
  }>;
  userSatisfaction: number;
}

export interface BatchInterpretationRequest {
  requests: InterpretationRequest[];
  options?: {
    priority?: 'high' | 'normal' | 'low';
    maxConcurrency?: number;
  };
}

export interface BatchInterpretationResult {
  results: InterpretationResult[];
  failed: Array<{
    index: number;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
  };
}

// AI解读服务类
class AiService {
  /**
   * 生成AI解读
   */
  async generateInterpretation(data: InterpretationRequest): Promise<InterpretationResult> {
    try {
      const response = await request({
        url: '/api/ai/interpretation/generate',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('生成AI解读失败:', error);
      throw error;
    }
  }

  /**
   * 批量生成AI解读
   */
  async batchGenerateInterpretation(
    data: BatchInterpretationRequest
  ): Promise<BatchInterpretationResult> {
    try {
      const response = await request({
        url: '/api/ai/interpretation/batch-generate',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('批量生成AI解读失败:', error);
      throw error;
    }
  }

  /**
   * 重新生成解读
   */
  async regenerateInterpretation(
    interpretationId: string,
    options?: InterpretationRequest['options']
  ): Promise<InterpretationResult> {
    try {
      const response = await request({
        url: `/api/ai/interpretation/${interpretationId}/regenerate`,
        method: 'POST',
        data: { options },
      });
      return response.data;
    } catch (error) {
      console.error('重新生成解读失败:', error);
      throw error;
    }
  }

  /**
   * 评估解读质量
   */
  async assessQuality(interpretationId: string): Promise<QualityAssessment> {
    try {
      const response = await request({
        url: `/api/ai/interpretation/${interpretationId}/assess`,
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('评估解读质量失败:', error);
      throw error;
    }
  }

  /**
   * 优化解读结果
   */
  async optimizeInterpretation(
    interpretationId: string,
    strategy?: string
  ): Promise<OptimizationResult> {
    try {
      const response = await request({
        url: `/api/ai/interpretation/${interpretationId}/optimize`,
        method: 'POST',
        data: { strategy },
      });
      return response.data;
    } catch (error) {
      console.error('优化解读失败:', error);
      throw error;
    }
  }

  /**
   * 获取解读统计信息
   */
  async getStats(params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<InterpretationStats> {
    try {
      const response = await request({
        url: '/api/ai/interpretation/stats',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取支持的占卜类型
   */
  async getSupportedTypes(): Promise<
    Array<{
      type: string;
      name: string;
      description: string;
      enabled: boolean;
    }>
  > {
    try {
      const response = await request({
        url: '/api/ai/interpretation/types',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取支持类型失败:', error);
      throw error;
    }
  }

  /**
   * 获取解读选项配置
   */
  async getOptions(): Promise<{
    styles: Array<{ value: string; label: string; description: string }>;
    lengths: Array<{ value: string; label: string; description: string }>;
    languages: Array<{ value: string; label: string; description: string }>;
  }> {
    try {
      const response = await request({
        url: '/api/ai/interpretation/options',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取选项配置失败:', error);
      throw error;
    }
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(
    interpretationId: string,
    feedback: {
      rating: number;
      comment?: string;
      helpful: boolean;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      await request({
        url: `/api/ai/interpretation/${interpretationId}/feedback`,
        method: 'POST',
        data: feedback,
      });
    } catch (error) {
      console.error('提交反馈失败:', error);
      throw error;
    }
  }

  /**
   * 获取解读历史
   */
  async getHistory(
    params: {
      page?: number;
      limit?: number;
      type?: string;
      userId?: number;
    } = {}
  ): Promise<{
    interpretations: InterpretationResult[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/ai/interpretation/history',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取解读历史失败:', error);
      throw error;
    }
  }
}

export const aiService = new AiService();
export default aiService;
