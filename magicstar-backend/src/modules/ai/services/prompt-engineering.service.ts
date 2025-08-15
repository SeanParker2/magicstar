import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: PromptCategory;
  version: string;
  isActive: boolean;
}

export enum PromptCategory {
  TAROT = 'tarot',
  ASTROLOGY = 'astrology',
  NUMEROLOGY = 'numerology',
  GENERAL = 'general',
  PERSONALITY = 'personality',
  RELATIONSHIP = 'relationship',
  CAREER = 'career',
  HEALTH = 'health',
}

export interface PromptContext {
  userInfo?: {
    age?: number;
    gender?: string;
    location?: string;
    preferences?: string[];
  };
  sessionHistory?: string[];
  currentQuestion?: string;
  divinationType: string;
  language: string;
  tone: 'formal' | 'casual' | 'mystical' | 'scientific';
}

export interface OptimizedPrompt {
  finalPrompt: string;
  templateUsed: string;
  variables: Record<string, any>;
  estimatedTokens: number;
  optimizationNotes: string[];
}

@Injectable()
export class PromptEngineeringService {
  private readonly logger = new Logger(PromptEngineeringService.name);
  private readonly promptTemplates: Map<string, PromptTemplate> = new Map();
  private readonly maxPromptLength: number;
  private readonly defaultLanguage: string;

  constructor(private readonly configService: ConfigService) {
    this.maxPromptLength = this.configService.get<number>('AI_MAX_PROMPT_LENGTH', 4000);
    this.defaultLanguage = this.configService.get<string>('AI_DEFAULT_LANGUAGE', 'zh-CN');
    this.initializeTemplates();
  }

  /**
   * 初始化提示词模板
   */
  private initializeTemplates(): void {
    const templates: PromptTemplate[] = [
      {
        id: 'tarot_general',
        name: '塔罗牌通用解读',
        description: '通用塔罗牌解读模板',
        template: `你是一位专业的塔罗牌解读师，具有多年的占卜经验。请根据以下信息为用户提供准确、有洞察力的塔罗牌解读：

用户问题：{{question}}
抽取的牌：{{cards}}
牌阵类型：{{spread_type}}
用户背景：{{user_context}}

请提供：
1. 每张牌的基本含义
2. 牌与牌之间的关系
3. 针对用户问题的具体解读
4. 实用的建议和指导
5. 未来发展趋势

解读风格：{{tone}}
语言：{{language}}`,
        variables: ['question', 'cards', 'spread_type', 'user_context', 'tone', 'language'],
        category: PromptCategory.TAROT,
        version: '1.0',
        isActive: true,
      },
      {
        id: 'astrology_birth_chart',
        name: '星盘解读',
        description: '出生星盘解读模板',
        template: `你是一位资深的占星师，精通西方占星学。请根据以下星盘信息为用户提供详细的性格分析：

出生信息：
- 出生日期：{{birth_date}}
- 出生时间：{{birth_time}}
- 出生地点：{{birth_location}}

主要星座配置：
- 太阳星座：{{sun_sign}}
- 月亮星座：{{moon_sign}}
- 上升星座：{{rising_sign}}

重要相位：{{aspects}}

请分析：
1. 基本性格特征
2. 情感模式和内在需求
3. 人际关系倾向
4. 事业发展方向
5. 人生课题和成长建议

语言：{{language}}
详细程度：{{detail_level}}`,
        variables: ['birth_date', 'birth_time', 'birth_location', 'sun_sign', 'moon_sign', 'rising_sign', 'aspects', 'language', 'detail_level'],
        category: PromptCategory.ASTROLOGY,
        version: '1.0',
        isActive: true,
      },
      {
        id: 'numerology_life_path',
        name: '生命数字解读',
        description: '生命数字和命运数字解读',
        template: `你是一位数字命理学专家，请根据以下数字信息为用户提供深入的生命解读：

基本信息：
- 生命数字：{{life_path_number}}
- 命运数字：{{destiny_number}}
- 灵魂数字：{{soul_number}}
- 个性数字：{{personality_number}}

出生日期：{{birth_date}}
姓名：{{full_name}}

请解读：
1. 生命目的和使命
2. 天赋才能和潜力
3. 人生挑战和课题
4. 最佳发展方向
5. 与他人的兼容性
6. 重要的人生周期

解读风格：{{tone}}
语言：{{language}}`,
        variables: ['life_path_number', 'destiny_number', 'soul_number', 'personality_number', 'birth_date', 'full_name', 'tone', 'language'],
        category: PromptCategory.NUMEROLOGY,
        version: '1.0',
        isActive: true,
      },
      {
        id: 'relationship_compatibility',
        name: '关系兼容性分析',
        description: '两人关系兼容性分析模板',
        template: `你是一位关系咨询专家，精通多种占卜方法。请根据以下信息分析两人的关系兼容性：

第一人信息：
{{person1_info}}

第二人信息：
{{person2_info}}

关系类型：{{relationship_type}}
分析方法：{{analysis_method}}

请分析：
1. 性格互补性
2. 沟通模式匹配度
3. 价值观一致性
4. 潜在冲突点
5. 关系发展建议
6. 长期兼容性预测

特别关注：{{focus_areas}}
语言：{{language}}`,
        variables: ['person1_info', 'person2_info', 'relationship_type', 'analysis_method', 'focus_areas', 'language'],
        category: PromptCategory.RELATIONSHIP,
        version: '1.0',
        isActive: true,
      },
    ];

    templates.forEach(template => {
      this.promptTemplates.set(template.id, template);
    });

    this.logger.log(`Initialized ${templates.length} prompt templates`);
  }

  /**
   * 根据上下文优化提示词
   */
  async optimizePrompt(
    templateId: string,
    context: PromptContext,
    variables: Record<string, any> = {},
  ): Promise<OptimizedPrompt> {
    const template = this.promptTemplates.get(templateId);
    if (!template) {
      throw new Error(`Prompt template not found: ${templateId}`);
    }

    // 合并默认上下文
    const mergedContext = {
      ...context,
      language: context.language || this.defaultLanguage,
      tone: context.tone || 'mystical' as const,
    };

    // 准备变量
    const processedVariables: Record<string, any> = {
      ...variables,
      user_context: this.buildUserContext(mergedContext),
    };

    // 设置语言和语调（避免重复）
    if (!processedVariables.language) {
      processedVariables.language = mergedContext.language;
    }
    if (!processedVariables.tone) {
      processedVariables.tone = mergedContext.tone;
    }

    // 替换模板变量
    let finalPrompt = template.template;
    const optimizationNotes: string[] = [];

    // 替换所有变量
    for (const [key, value] of Object.entries(processedVariables)) {
      const placeholder = `{{${key}}}`;
      if (finalPrompt.includes(placeholder)) {
        finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), String(value || ''));
      }
    }

    // 清理未替换的变量
    finalPrompt = finalPrompt.replace(/\{\{[^}]+\}\}/g, '');

    // 优化长度
    if (finalPrompt.length > this.maxPromptLength) {
      finalPrompt = this.truncatePrompt(finalPrompt);
      optimizationNotes.push('Prompt truncated due to length limit');
    }

    // 添加上下文增强
    if (mergedContext.sessionHistory && mergedContext.sessionHistory.length > 0) {
      const historyContext = this.buildHistoryContext(mergedContext.sessionHistory);
      finalPrompt = `${historyContext}\n\n${finalPrompt}`;
      optimizationNotes.push('Added session history context');
    }

    // 估算token数量
    const estimatedTokens = this.estimateTokenCount(finalPrompt);

    return {
      finalPrompt,
      templateUsed: templateId,
      variables: processedVariables,
      estimatedTokens,
      optimizationNotes,
    };
  }

  /**
   * 构建用户上下文
   */
  private buildUserContext(context: PromptContext): string {
    const parts: string[] = [];

    if (context.userInfo) {
      const { age, gender, location, preferences } = context.userInfo;
      if (age) parts.push(`年龄：${age}岁`);
      if (gender) parts.push(`性别：${gender}`);
      if (location) parts.push(`地区：${location}`);
      if (preferences && preferences.length > 0) {
        parts.push(`兴趣偏好：${preferences.join('、')}`);
      }
    }

    return parts.length > 0 ? parts.join('，') : '无特殊背景信息';
  }

  /**
   * 构建历史上下文
   */
  private buildHistoryContext(history: string[]): string {
    const recentHistory = history.slice(-3); // 只取最近3条
    return `历史对话上下文：\n${recentHistory.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
  }

  /**
   * 截断过长的提示词
   */
  private truncatePrompt(prompt: string): string {
    if (prompt.length <= this.maxPromptLength) {
      return prompt;
    }

    // 尝试在句子边界截断
    const sentences = prompt.split(/[。！？.!?]/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > this.maxPromptLength - 100) {
        break;
      }
      truncated += sentence + '。';
    }

    return truncated || prompt.substring(0, this.maxPromptLength - 100) + '...';
  }

  /**
   * 估算token数量
   */
  private estimateTokenCount(text: string): number {
    // 简单估算：中文字符约1.5个token，英文单词约1个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const otherChars = text.length - chineseChars - englishWords;
    
    return Math.ceil(chineseChars * 1.5 + englishWords + otherChars * 0.5);
  }

  /**
   * 获取所有可用模板
   */
  getAvailableTemplates(category?: PromptCategory): PromptTemplate[] {
    const templates = Array.from(this.promptTemplates.values())
      .filter(template => template.isActive);
    
    if (category) {
      return templates.filter(template => template.category === category);
    }
    
    return templates;
  }

  /**
   * 获取特定模板
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.promptTemplates.get(templateId);
  }

  /**
   * 添加自定义模板
   */
  addCustomTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.id, template);
    this.logger.log(`Added custom template: ${template.id}`);
  }

  /**
   * 更新模板
   */
  updateTemplate(templateId: string, updates: Partial<PromptTemplate>): boolean {
    const template = this.promptTemplates.get(templateId);
    if (!template) {
      return false;
    }

    const updatedTemplate = { ...template, ...updates };
    this.promptTemplates.set(templateId, updatedTemplate);
    this.logger.log(`Updated template: ${templateId}`);
    return true;
  }

  /**
   * 删除模板
   */
  deleteTemplate(templateId: string): boolean {
    const deleted = this.promptTemplates.delete(templateId);
    if (deleted) {
      this.logger.log(`Deleted template: ${templateId}`);
    }
    return deleted;
  }

  /**
   * 验证模板变量
   */
  validateTemplateVariables(templateId: string, variables: Record<string, any>): {
    valid: boolean;
    missingVariables: string[];
    extraVariables: string[];
  } {
    const template = this.promptTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const requiredVariables = template.variables;
    const providedVariables = Object.keys(variables);

    const missingVariables = requiredVariables.filter(
      variable => !providedVariables.includes(variable)
    );

    const extraVariables = providedVariables.filter(
      variable => !requiredVariables.includes(variable)
    );

    return {
      valid: missingVariables.length === 0,
      missingVariables,
      extraVariables,
    };
  }

  /**
   * 生成智能提示词建议
   */
  async generatePromptSuggestions(
    divinationType: string,
    userQuestion: string,
    context: PromptContext,
  ): Promise<{
    suggestedTemplates: string[];
    optimizationTips: string[];
    estimatedQuality: number;
  }> {
    const suggestions: string[] = [];
    const tips: string[] = [];

    // 根据占卜类型推荐模板
    switch (divinationType.toLowerCase()) {
      case 'tarot':
        suggestions.push('tarot_general');
        break;
      case 'astrology':
        suggestions.push('astrology_birth_chart');
        break;
      case 'numerology':
        suggestions.push('numerology_life_path');
        break;
      default:
        suggestions.push('tarot_general');
    }

    // 根据问题内容推荐
    if (userQuestion.includes('感情') || userQuestion.includes('关系')) {
      suggestions.push('relationship_compatibility');
      tips.push('建议提供更多关系背景信息以获得更准确的解读');
    }

    // 质量评估
    let qualityScore = 0.7; // 基础分数
    
    if (context.userInfo && Object.keys(context.userInfo).length > 0) {
      qualityScore += 0.1;
    }
    
    if (context.sessionHistory && context.sessionHistory.length > 0) {
      qualityScore += 0.1;
    }
    
    if (userQuestion.length > 10) {
      qualityScore += 0.1;
    }

    return {
      suggestedTemplates: Array.from(new Set(suggestions)),
      optimizationTips: tips,
      estimatedQuality: Math.min(qualityScore, 1.0),
    };
  }
}