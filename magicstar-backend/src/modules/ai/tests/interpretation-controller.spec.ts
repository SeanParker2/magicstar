import { Test, TestingModule } from '@nestjs/testing';
import { InterpretationController, CreateInterpretationDto, BatchInterpretationDto, RegenerateInterpretationDto } from '../controllers/interpretation.controller';
import { InterpretationService, DivinationData, InterpretationOptions } from '../services/interpretation.service';
import { InterpretationQualityService } from '../services/interpretation-quality.service';
import { InterpretationOptimizerService } from '../services/interpretation-optimizer.service';
import { AiLoggerService } from '../services/ai-logger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InterpretationController', () => {
  let controller: InterpretationController;
  let interpretationService: jest.Mocked<InterpretationService>;

  beforeEach(async () => {
    const mockInterpretationService = {
      generateInterpretation: jest.fn(),
      generateBatchInterpretations: jest.fn(),
      regenerateInterpretation: jest.fn(),
      getInterpretationStats: jest.fn(),
    };

    const mockQualityService = {
      assessQuality: jest.fn(),
      batchAssessQuality: jest.fn(),
    };

    const mockOptimizerService = {
      optimizeInterpretation: jest.fn(),
      batchOptimizeInterpretations: jest.fn(),
      getOptimizationStrategies: jest.fn(),
      getOptimizationStats: jest.fn(),
    };

    const mockLoggerService = {
      logAiRequest: jest.fn(),
      logAiResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterpretationController],
      providers: [
        { provide: InterpretationService, useValue: mockInterpretationService },
        { provide: InterpretationQualityService, useValue: mockQualityService },
        { provide: InterpretationOptimizerService, useValue: mockOptimizerService },
        { provide: AiLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<InterpretationController>(InterpretationController);
    interpretationService = module.get(InterpretationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateInterpretation', () => {
    const mockRequest: CreateInterpretationDto = {
      divinationData: {
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
        ],
      },
      options: {
        language: 'zh-CN',
        tone: 'mystical',
        detailLevel: 'standard',
      },
    };

    const mockInterpretationResult = {
      id: 'interpretation_123',
      type: 'tarot',
      summary: '您的爱情运势整体向好',
      detailedAnalysis: {
        overview: '塔罗牌显示您的爱情之路充满正能量',
        keyInsights: ['过去的经历为您积累了宝贵的爱情智慧'],
        strengths: ['情感成熟'],
        challenges: ['需要保持耐心'],
        advice: ['保持开放的心态'],
        futureOutlook: '未来的爱情将带来真正的快乐',
      },
      personalizedMessages: {
        immediate: '近期可能会有新的感情机会',
        shortTerm: '未来几个月感情生活将更加稳定',
        longTerm: '长期来看，您将找到真正的灵魂伴侣',
      },
      qualityScore: 0.85,
      confidence: 0.9,
      generatedAt: new Date(),
      metadata: {
        promptUsed: 'tarot_general',
        modelUsed: 'gpt-4',
        processingTime: 5000,
        tokenUsage: {
          promptTokens: 500,
          completionTokens: 800,
          totalTokens: 1300,
        },
      },
    };

    it('should generate interpretation successfully', async () => {
      interpretationService.generateInterpretation.mockResolvedValue(mockInterpretationResult);
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      const result = await controller.generateInterpretation(mockRequest, mockReq);

      expect(result).toEqual({
        success: true,
        data: mockInterpretationResult,
        message: '解读生成成功',
      });
      expect(interpretationService.generateInterpretation).toHaveBeenCalledWith(
        mockRequest.divinationData,
        mockRequest.options,
      );
    });

    it('should handle missing required fields', async () => {
      const invalidRequest = {
        divinationData: {
          type: 'tarot',
          // missing question
          cards: [],
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(invalidRequest as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle service errors', async () => {
      interpretationService.generateInterpretation.mockRejectedValue(
        new Error('AI service unavailable'),
      );
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(mockRequest, mockReq))
        .rejects.toThrow('AI service unavailable');
    });

    it('should validate divination type', async () => {
      const invalidRequest = {
        divinationData: {
          ...mockRequest.divinationData,
          type: 'invalid_type',
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(invalidRequest as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('generateBatchInterpretations', () => {
    const mockBatchRequest: BatchInterpretationDto = {
      divinationDataList: [
        {
          type: 'tarot',
          question: '问题1',
          cards: [{
            name: '愚者',
            position: '现在',
            isReversed: false,
            meaning: '新开始',
            keywords: ['开始'],
          }],
        },
        {
          type: 'numerology',
          question: '问题2',
          numbers: {
            lifePathNumber: 5,
            birthDate: '1985-12-10',
          },
        },
      ],
      options: {
        language: 'zh-CN',
        tone: 'casual',
      },
    };

    it('should generate batch interpretations successfully', async () => {
      const mockResults = [
        { id: 'interp1', type: 'tarot', summary: '解读1' },
        { id: 'interp2', type: 'numerology', summary: '解读2' },
      ];

      interpretationService.generateBatchInterpretations.mockResolvedValue(mockResults as any);
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      const result = await controller.generateBatchInterpretations(mockBatchRequest, mockReq);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.stats.total).toBe(2);
    });

    it('should handle empty batch request', async () => {
      const emptyRequest = {
        divinationDataList: [],
        options: {},
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateBatchInterpretations(emptyRequest, mockReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle batch size limit', async () => {
      const largeBatchRequest = {
        divinationDataList: new Array(101).fill({
          type: 'tarot',
          question: '测试问题',
        }),
        options: {},
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateBatchInterpretations(largeBatchRequest, mockReq))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('regenerateInterpretation', () => {
    const mockRegenerateRequest: RegenerateInterpretationDto = {
      originalId: 'interpretation_123',
      divinationData: {
        type: 'tarot',
        question: '重新解读的问题',
        cards: [{
          name: '太阳',
          position: '现在',
          isReversed: false,
          meaning: '成功与快乐',
          keywords: ['成功', '快乐'],
        }],
      },
      newOptions: {
        tone: 'scientific',
        detailLevel: 'detailed',
      },
    };

    it('should regenerate interpretation successfully', async () => {
      const mockNewResult = {
        id: 'new_interpretation_456',
        type: 'tarot',
        summary: '重新生成的解读结果',
      };

      interpretationService.regenerateInterpretation.mockResolvedValue(mockNewResult as any);
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      const result = await controller.regenerateInterpretation(
        mockRegenerateRequest,
        mockReq,
      );

      expect(result).toEqual({
        success: true,
        data: mockNewResult,
        message: '解读重新生成成功',
      });
      expect(interpretationService.regenerateInterpretation).toHaveBeenCalledWith(
        mockRegenerateRequest.originalId,
        mockRegenerateRequest.divinationData,
        mockRegenerateRequest.newOptions,
      );
    });

    it('should handle invalid interpretation ID', async () => {
      interpretationService.regenerateInterpretation.mockRejectedValue(
        new NotFoundException('Interpretation not found'),
      );
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
      const invalidRequest = { ...mockRegenerateRequest, originalId: 'invalid_id' };

      await expect(
        controller.regenerateInterpretation(invalidRequest, mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInterpretationStats', () => {
    it('should return interpretation statistics', async () => {
      const mockStats = {
        totalGenerated: 150,
        averageQuality: 0.82,
        averageConfidence: 0.78,
        typeDistribution: {
          tarot: 80,
          astrology: 45,
          numerology: 25,
        },
        recentActivity: [
          {
            id: 'recent1',
            type: 'tarot',
            generatedAt: new Date(),
            qualityScore: 0.85,
          },
        ],
      };

      interpretationService.getInterpretationStats.mockResolvedValue(mockStats);
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      const result = await controller.getInterpretationStats(mockReq);

      expect(result).toEqual({
        success: true,
        data: mockStats,
        message: '统计信息获取成功',
      });
    });

    it('should handle stats service errors', async () => {
      interpretationService.getInterpretationStats.mockRejectedValue(
        new Error('Stats service unavailable'),
      );
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.getInterpretationStats(mockReq))
        .rejects.toThrow('Stats service unavailable');
    });
  });

  describe('input validation', () => {
    it('should validate tarot card data structure', async () => {
      const invalidTarotRequest = {
        divinationData: {
          type: 'tarot',
          question: '测试问题',
          cards: [
            {
              name: '恋人',
              // missing required fields
            },
          ],
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(invalidTarotRequest as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate astrology birth info', async () => {
      const invalidAstrologyRequest = {
        divinationData: {
          type: 'astrology',
          question: '测试问题',
          birthInfo: {
            // missing required date field
            sunSign: '双子座',
          },
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(invalidAstrologyRequest as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate numerology data', async () => {
      const invalidNumerologyRequest = {
        divinationData: {
          type: 'numerology',
          question: '测试问题',
          numbers: {
            // missing required lifePathNumber
            birthDate: '1990-01-01',
          },
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(invalidNumerologyRequest as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate interpretation options', async () => {
      const requestWithInvalidOptions = {
        divinationData: {
          type: 'tarot',
          question: '测试问题',
          cards: [{
            name: '愚者',
            position: '现在',
            isReversed: false,
            meaning: '新开始',
            keywords: ['开始'],
          }],
        },
        options: {
          tone: 'invalid_tone',
          detailLevel: 'invalid_level',
        },
      };
      const mockReq = { user: { id: 'user123' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

      await expect(controller.generateInterpretation(requestWithInvalidOptions as any, mockReq))
        .rejects.toThrow(BadRequestException);
    });
  });
});