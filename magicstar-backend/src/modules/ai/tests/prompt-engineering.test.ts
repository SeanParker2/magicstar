import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PromptEngineeringService, PromptCategory, PromptContext } from '../services/prompt-engineering.service';

describe('Prompt Engineering Tests', () => {
  let service: PromptEngineeringService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptEngineeringService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                AI_MAX_PROMPT_LENGTH: 4000,
                AI_DEFAULT_LANGUAGE: 'zh-CN',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PromptEngineeringService>(PromptEngineeringService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Template Management', () => {
    it('should get available templates', () => {
      const templates = service.getAvailableTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get templates by category', () => {
      const tarotTemplates = service.getAvailableTemplates(PromptCategory.TAROT);
      expect(Array.isArray(tarotTemplates)).toBe(true);
      
      tarotTemplates.forEach(template => {
        expect(template.category).toBe(PromptCategory.TAROT);
      });
    });

    it('should get specific template by id', () => {
      const template = service.getTemplate('tarot_general');
      expect(template).toBeDefined();
      expect(template?.id).toBe('tarot_general');
      expect(template?.category).toBe(PromptCategory.TAROT);
    });

    it('should return undefined for non-existent template', () => {
      const template = service.getTemplate('non_existent_template');
      expect(template).toBeUndefined();
    });
  });

  describe('Template Validation', () => {
    it('should validate template variables correctly', () => {
      const templateId = 'tarot_general';
      const variables = {
        question: '我的爱情运势如何？',
        cards: '愚者、恋人、太阳',
        spread_type: '三张牌',
        user_context: '单身，希望找到真爱',
        tone: 'mystical',
        language: 'zh-CN',
      };

      const validation = service.validateTemplateVariables(templateId, variables);
      
      expect(validation.valid).toBe(true);
      expect(validation.missingVariables).toHaveLength(0);
      expect(validation.extraVariables).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const templateId = 'tarot_general';
      const variables = {
        question: '我的爱情运势如何？',
        cards: '愚者、恋人、太阳',
        // 缺少其他必需变量
      };

      const validation = service.validateTemplateVariables(templateId, variables);
      
      expect(validation.valid).toBe(false);
      expect(validation.missingVariables.length).toBeGreaterThan(0);
    });

    it('should detect extra variables', () => {
      const templateId = 'tarot_general';
      const variables = {
        question: '我的爱情运势如何？',
        cards: '愚者、恋人、太阳',
        spread_type: '三张牌',
        user_context: '单身，希望找到真爱',
        tone: 'mystical',
        language: 'zh-CN',
        extra_variable: '额外变量', // 多余变量
      };

      const validation = service.validateTemplateVariables(templateId, variables);
      
      expect(validation.extraVariables).toContain('extra_variable');
    });
  });

  describe('Prompt Optimization', () => {
    it('should optimize tarot prompt', async () => {
      const context: PromptContext = {
        userInfo: {
          age: 25,
          gender: 'female',
          preferences: ['love', 'career'],
        },
        currentQuestion: '我的爱情运势如何？',
        divinationType: 'tarot',
        language: 'zh-CN',
        tone: 'mystical',
      };

      const variables = {
        question: '我的爱情运势如何？',
        cards: '愚者（正位）、恋人（正位）、太阳（正位）',
        spread_type: '三张牌爱情牌阵',
        user_context: '25岁女性，单身，希望了解爱情运势',
        tone: 'mystical',
        language: 'zh-CN',
      };

      const optimized = await service.optimizePrompt('tarot_general', context, variables);
      
      expect(optimized).toBeDefined();
      expect(optimized.finalPrompt).toBeDefined();
      expect(optimized.finalPrompt.length).toBeGreaterThan(0);
      expect(optimized.templateUsed).toBe('tarot_general');
      expect(optimized.variables).toEqual(variables);
      expect(optimized.estimatedTokens).toBeGreaterThan(0);
      expect(Array.isArray(optimized.optimizationNotes)).toBe(true);
    });

    it('should handle long prompts by truncation', async () => {
      const context: PromptContext = {
        currentQuestion: 'A'.repeat(5000), // 超长问题
        divinationType: 'tarot',
        language: 'zh-CN',
        tone: 'formal',
      };

      const variables = {
        question: context.currentQuestion,
        cards: '愚者、恋人、太阳',
        spread_type: '三张牌',
        user_context: '测试用户',
        tone: 'formal',
        language: 'zh-CN',
      };

      const optimized = await service.optimizePrompt('tarot_general', context, variables);
      
      expect(optimized.finalPrompt.length).toBeLessThanOrEqual(4000);
      expect(optimized.optimizationNotes).toContain('Prompt truncated due to length limit');
    });

    it('should include user context when available', async () => {
      const context: PromptContext = {
        userInfo: {
          age: 30,
          gender: 'male',
          location: 'Beijing',
          preferences: ['career', 'finance'],
        },
        sessionHistory: [
          '之前询问过事业运势',
          '关注财务状况',
        ],
        currentQuestion: '我的投资运势如何？',
        divinationType: 'tarot',
        language: 'zh-CN',
        tone: 'formal',
      };

      const variables = {
        question: context.currentQuestion,
        cards: '皇帝、金币十、宝剑二',
        spread_type: '财运三张牌',
        user_context: '30岁男性，北京，关注事业和财务',
        tone: 'formal',
        language: 'zh-CN',
      };

      const optimized = await service.optimizePrompt('tarot_general', context, variables);
      
      expect(optimized.finalPrompt).toContain('30岁');
      expect(optimized.finalPrompt).toContain('男性');
      expect(optimized.finalPrompt).toContain('北京');
      expect(optimized.finalPrompt).toContain('事业');
      expect(optimized.finalPrompt).toContain('财务');
    });
  });

  describe('Custom Templates', () => {
    it('should add custom template', () => {
      const customTemplate = {
        id: 'custom_test',
        name: '测试模板',
        description: '用于测试的自定义模板',
        template: '这是一个测试模板：{{test_variable}}',
        variables: ['test_variable'],
        category: PromptCategory.GENERAL,
        version: '1.0',
        isActive: true,
      };

      service.addCustomTemplate(customTemplate);
      
      const retrieved = service.getTemplate('custom_test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('测试模板');
    });

    it('should update existing template', () => {
      const customTemplate = {
        id: 'custom_update_test',
        name: '更新测试模板',
        description: '用于测试更新的模板',
        template: '原始模板：{{variable}}',
        variables: ['variable'],
        category: PromptCategory.GENERAL,
        version: '1.0',
        isActive: true,
      };

      service.addCustomTemplate(customTemplate);
      
      const updated = service.updateTemplate('custom_update_test', {
        name: '已更新的模板',
        template: '更新后的模板：{{variable}}',
      });
      
      expect(updated).toBe(true);
      
      const retrieved = service.getTemplate('custom_update_test');
      expect(retrieved?.name).toBe('已更新的模板');
      expect(retrieved?.template).toBe('更新后的模板：{{variable}}');
    });

    it('should delete custom template', () => {
      const customTemplate = {
        id: 'custom_delete_test',
        name: '删除测试模板',
        description: '用于测试删除的模板',
        template: '删除测试：{{variable}}',
        variables: ['variable'],
        category: PromptCategory.GENERAL,
        version: '1.0',
        isActive: true,
      };

      service.addCustomTemplate(customTemplate);
      
      const deleted = service.deleteTemplate('custom_delete_test');
      expect(deleted).toBe(true);
      
      const retrieved = service.getTemplate('custom_delete_test');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Prompt Suggestions', () => {
    it('should generate prompt suggestions', async () => {
      const context: PromptContext = {
        divinationType: 'tarot',
        language: 'zh-CN',
        tone: 'mystical',
      };

      const suggestions = await service.generatePromptSuggestions(
        'tarot',
        '我的爱情运势如何？',
        context
      );
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions.suggestedTemplates)).toBe(true);
      expect(suggestions.suggestedTemplates.length).toBeGreaterThan(0);
      expect(Array.isArray(suggestions.optimizationTips)).toBe(true);
      expect(typeof suggestions.estimatedQuality).toBe('number');
      expect(suggestions.estimatedQuality).toBeGreaterThanOrEqual(0);
      expect(suggestions.estimatedQuality).toBeLessThanOrEqual(1);
    });
  });
});