import { Test, TestingModule } from '@nestjs/testing';
import { InterpretationService, DivinationData, InterpretationOptions, TarotCard } from '../services/interpretation.service';
import { OpenaiService } from '../services/openai.service';
import { PromptEngineeringService } from '../services/prompt-engineering.service';
import { AiCacheService } from '../services/ai-cache.service';
import { AiLoggerService } from '../services/ai-logger.service';

describe('InterpretationService', () => {
  let service: InterpretationService;
  let openaiService: jest.Mocked<OpenaiService>;
  let promptService: jest.Mocked<PromptEngineeringService>;
  let cacheService: jest.Mocked<AiCacheService>;
  let loggerService: jest.Mocked<AiLoggerService>;

  beforeEach(async () => {
    const mockOpenaiService = {
      generateCompletion: jest.fn(),
    };

    const mockPromptService = {
      optimizePrompt: jest.fn(),
    };

    const mockCacheService = {
      cacheResponse: jest.fn(),
      getCachedResponse: jest.fn(),
      deleteCacheByPattern: jest.fn(),
    };

    const mockLoggerService = {
      logAiResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterpretationService,
        { provide: OpenaiService, useValue: mockOpenaiService },
        { provide: PromptEngineeringService, useValue: mockPromptService },
        { provide: AiCacheService, useValue: mockCacheService },
        { provide: AiLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<InterpretationService>(InterpretationService);
    openaiService = module.get(OpenaiService);
    promptService = module.get(PromptEngineeringService);
    cacheService = module.get(AiCacheService);
    loggerService = module.get(AiLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInterpretation', () => {
    const mockTarotData: DivinationData = {
      type: 'tarot',
      question: '我的爱情运势如何？',
      cards: [
        {
          name: '恋人',
          position: '过去',
          isReversed: false,
          meaning: '和谐的关系',
          keywords: ['爱情', '选择', '和谐'],
        },
        {
          name: '星星',
          position: '现在',
          isReversed: false,
          meaning: '希望与指引',
          keywords: ['希望', '灵感', '指引'],
        },
        {
          name: '太阳',
          position: '未来',
          isReversed: false,
          meaning: '成功与快乐',
          keywords: ['成功', '快乐', '活力'],
        },
      ] as TarotCard[],
      spread: '三张牌',
    };

    const mockOptions: InterpretationOptions = {
      language: 'zh-CN',
      tone: 'mystical',
      detailLevel: 'standard',
      personalizeFor: {
        age: 25,
        gender: 'female',
        interests: ['爱情', '事业'],
      },
    };

    it('should generate tarot interpretation successfully', async () => {
      // Mock dependencies
      cacheService.getCachedResponse.mockResolvedValue(null);
      promptService.optimizePrompt.mockResolvedValue({
        finalPrompt: '优化后的提示词',
        templateUsed: 'tarot_general',
        variables: {},
        estimatedTokens: 1000,
        optimizationNotes: [],
      });
      openaiService.generateCompletion.mockResolvedValue({
        provider: 'openai' as any,
        text: JSON.stringify({
          summary: '您的爱情运势整体向好，过去的和谐为现在的希望奠定基础，未来将迎来美好的结果。',
          overview: '塔罗牌显示您的爱情之路充满正能量...',
          keyInsights: ['过去的经历为您积累了宝贵的爱情智慧', '当前正处于充满希望的阶段'],
          strengths: ['情感成熟', '懂得珍惜'],
          challenges: ['需要保持耐心', '避免过度期待'],
          advice: ['保持开放的心态', '相信自己的直觉'],
          futureOutlook: '未来的爱情将带来真正的快乐和满足',
          immediate: '近期可能会有新的感情机会出现',
          shortTerm: '未来几个月感情生活将更加稳定',
          longTerm: '长期来看，您将找到真正的灵魂伴侣',
        }),
        model: 'gpt-4',
        raw: {},
        tokenUsage: {
          promptTokens: 500,
          completionTokens: 800,
          totalTokens: 1300,
        },
        responseTime: 5000,
      });

      const result = await service.generateInterpretation(mockTarotData, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('tarot');
      expect(result.summary).toContain('爱情运势');
      expect(result.detailedAnalysis.keyInsights).toHaveLength(2);
      expect(result.personalizedMessages.immediate).toBeTruthy();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.modelUsed).toBe('gpt-4');

      // Verify service calls
      expect(promptService.optimizePrompt).toHaveBeenCalled();
      expect(openaiService.generateCompletion).toHaveBeenCalled();
      expect(cacheService.cacheResponse).toHaveBeenCalled();
      expect(loggerService.logAiResponse).toHaveBeenCalled();
    });

    it('should return cached interpretation when available', async () => {
      const cachedResult = {
        id: 'cached_interpretation',
        type: 'tarot',
        summary: '缓存的解读结果',
        detailedAnalysis: {
          overview: '缓存的详细分析',
          keyInsights: ['缓存的洞察'],
          strengths: [],
          challenges: [],
          advice: [],
          futureOutlook: '',
        },
        personalizedMessages: {
          immediate: '',
          shortTerm: '',
          longTerm: '',
        },
        qualityScore: 0.8,
        confidence: 0.9,
        generatedAt: new Date(),
        metadata: {
          promptUsed: 'tarot_general',
          modelUsed: 'gpt-4',
          processingTime: 3000,
          tokenUsage: {},
        },
      };

      cacheService.getCachedResponse.mockResolvedValue({
        formattedResponse: cachedResult,
      } as any);

      const result = await service.generateInterpretation(mockTarotData, mockOptions);

      expect(result).toEqual(cachedResult);
      expect(openaiService.generateCompletion).not.toHaveBeenCalled();
    });

    it('should handle astrology data correctly', async () => {
      const astrologyData: DivinationData = {
        type: 'astrology',
        question: '我的性格特点是什么？',
        birthInfo: {
          date: '1995-06-15',
          time: '14:30',
          location: '北京',
          sunSign: '双子座',
          moonSign: '天蝎座',
          risingSign: '处女座',
          aspects: ['太阳合水星', '月亮刑火星'],
        },
      };

      cacheService.getCachedResponse.mockResolvedValue(null);
      promptService.optimizePrompt.mockResolvedValue({
        finalPrompt: '星盘分析提示词',
        templateUsed: 'astrology_birth_chart',
        variables: {},
        estimatedTokens: 800,
        optimizationNotes: [],
      });
      openaiService.generateCompletion.mockResolvedValue({
        provider: 'openai' as any,
        text: '您的星盘显示出复杂而有趣的性格特征...',
        model: 'gpt-4',
        raw: {},
        tokenUsage: { promptTokens: 400, completionTokens: 600, totalTokens: 1000 },
        responseTime: 4000,
      });

      const result = await service.generateInterpretation(astrologyData, mockOptions);

      expect(result.type).toBe('astrology');
      expect(promptService.optimizePrompt).toHaveBeenCalledWith(
        'astrology_birth_chart',
        expect.objectContaining({
          divinationType: 'astrology',
        }),
        expect.objectContaining({
          sun_sign: '双子座',
          moon_sign: '天蝎座',
          rising_sign: '处女座',
        }),
      );
    });

    it('should handle numerology data correctly', async () => {
      const numerologyData: DivinationData = {
        type: 'numerology',
        question: '我的生命数字说明了什么？',
        numbers: {
          lifePathNumber: 7,
          destinyNumber: 3,
          soulNumber: 9,
          personalityNumber: 6,
          birthDate: '1990-03-21',
          fullName: '张三',
        },
      };

      cacheService.getCachedResponse.mockResolvedValue(null);
      promptService.optimizePrompt.mockResolvedValue({
        finalPrompt: '数字命理分析提示词',
        templateUsed: 'numerology_life_path',
        variables: {},
        estimatedTokens: 600,
        optimizationNotes: [],
      });
      openaiService.generateCompletion.mockResolvedValue({
        provider: 'openai' as any,
        text: '您的生命路径数字7表明您是一个深思熟虑的人...',
        model: 'gpt-4',
        raw: {},
        tokenUsage: { promptTokens: 350, completionTokens: 550, totalTokens: 900 },
        responseTime: 3500,
      });

      const result = await service.generateInterpretation(numerologyData, mockOptions);

      expect(result.type).toBe('numerology');
      expect(promptService.optimizePrompt).toHaveBeenCalledWith(
        'numerology_life_path',
        expect.any(Object),
        expect.objectContaining({
          life_path_number: 7,
          destiny_number: 3,
          soul_number: 9,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      cacheService.getCachedResponse.mockResolvedValue(null);
      promptService.optimizePrompt.mockRejectedValue(new Error('Prompt optimization failed'));

      await expect(service.generateInterpretation(mockTarotData, mockOptions))
        .rejects.toThrow('Prompt optimization failed');
    });
  });

  describe('generateBatchInterpretations', () => {
    it('should generate multiple interpretations', async () => {
      const dataList: DivinationData[] = [
        {
          type: 'tarot',
          question: '问题1',
          cards: [{
            name: '愚者',
            position: '现在',
            isReversed: false,
            meaning: '新开始',
            keywords: ['开始'],
          }] as TarotCard[],
        },
        {
          type: 'numerology',
          question: '问题2',
          numbers: {
            lifePathNumber: 5,
            birthDate: '1985-12-10',
          },
        },
      ];

      // Mock successful generation for both items
      jest.spyOn(service, 'generateInterpretation')
        .mockResolvedValueOnce({
          id: 'interp1',
          type: 'tarot',
          summary: '解读1',
        } as any)
        .mockResolvedValueOnce({
          id: 'interp2',
          type: 'numerology',
          summary: '解读2',
        } as any);

      const results = await service.generateBatchInterpretations(dataList);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('tarot');
      expect(results[1].type).toBe('numerology');
    });

    it('should continue processing even if one interpretation fails', async () => {
      const dataList: DivinationData[] = [
        { type: 'tarot', question: '问题1' },
        { type: 'astrology', question: '问题2' },
      ];

      jest.spyOn(service, 'generateInterpretation')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          id: 'interp2',
          type: 'astrology',
          summary: '解读2',
        } as any);

      const results = await service.generateBatchInterpretations(dataList);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('astrology');
    });
  });

  describe('regenerateInterpretation', () => {
    it('should clear cache and generate new interpretation', async () => {
      const originalId = 'original_interpretation_id';
      const data: DivinationData = {
        type: 'tarot',
        question: '重新解读的问题',
      };
      const newOptions: InterpretationOptions = {
        tone: 'scientific',
        detailLevel: 'detailed',
      };

      const newInterpretation = {
        id: 'new_interpretation_id',
        type: 'tarot',
        summary: '新的解读结果',
      } as any;

      cacheService.deleteCacheByPattern.mockResolvedValue(1);
      jest.spyOn(service, 'generateInterpretation').mockResolvedValue(newInterpretation);

      const result = await service.regenerateInterpretation(originalId, data, newOptions);

      expect(cacheService.deleteCacheByPattern).toHaveBeenCalledWith(`interpretation:${originalId}:*`);
      expect(service.generateInterpretation).toHaveBeenCalledWith(data, newOptions);
      expect(result).toEqual(newInterpretation);
    });
  });

  describe('getInterpretationStats', () => {
    it('should return interpretation statistics', async () => {
      const stats = await service.getInterpretationStats();

      expect(stats).toHaveProperty('totalGenerated');
      expect(stats).toHaveProperty('averageQuality');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('typeDistribution');
      expect(stats).toHaveProperty('recentActivity');
    });
  });
});