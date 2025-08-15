import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import type {
  DivinationData,
  InterpretationOptions,
  InterpretationResult,
} from '../services/interpretation.service';
import { InterpretationService } from '../services/interpretation.service';
import { InterpretationQualityService } from '../services/interpretation-quality.service';
import { InterpretationOptimizerService } from '../services/interpretation-optimizer.service';
import type { QualityAssessment } from '../services/interpretation-quality.service';
import type { OptimizationResult, OptimizationConfig } from '../services/interpretation-optimizer.service';
import { AiLoggerService } from '../services/ai-logger.service';

export class CreateInterpretationDto {
  divinationData: DivinationData;
  options?: InterpretationOptions;
}

export class BatchInterpretationDto {
  divinationDataList: DivinationData[];
  options?: InterpretationOptions;
}

export class RegenerateInterpretationDto {
  originalId: string;
  divinationData: DivinationData;
  newOptions: InterpretationOptions;
}

@ApiTags('AI解读服务')
@Controller('ai/interpretation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterpretationController {
  private readonly logger = new Logger(InterpretationController.name);

  constructor(
    private readonly interpretationService: InterpretationService,
    private readonly aiLoggerService: AiLoggerService,
    private readonly qualityService: InterpretationQualityService,
    private readonly optimizerService: InterpretationOptimizerService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: '生成个性化解读' })
  @ApiResponse({ status: 201, description: '解读生成成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求频率过高' })
  @ApiBody({ type: CreateInterpretationDto })
  async generateInterpretation(
    @Body() createDto: CreateInterpretationDto,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data: InterpretationResult;
    message: string;
  }> {
    const startTime = Date.now();
    const userId = req.user?.id;

    try {
      // 验证输入数据
      this.validateDivinationData(createDto.divinationData);

      // 记录请求日志
      await this.aiLoggerService.logAiRequest({
        requestId: `interpretation_${Date.now()}_${userId}`,
        userId,
        requestType: 'interpretation',
        inputData: createDto.divinationData,
        modelConfig: createDto.options,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // 生成解读
      const result = await this.interpretationService.generateInterpretation(
        createDto.divinationData,
        createDto.options || {},
      );

      this.logger.log(
        `Generated interpretation for user ${userId} in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        data: result,
        message: '解读生成成功',
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate interpretation for user ${userId}: ${error.message}`,
        error.stack,
      );

      await this.aiLoggerService.logError(
        error,
        'InterpretationGeneration',
        `interpretation_${Date.now()}_${userId}`,
        userId,
      );

      throw new HttpException(
        {
          success: false,
          message: '解读生成失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch')
  @ApiOperation({ summary: '批量生成解读' })
  @ApiResponse({ status: 201, description: '批量解读生成成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiBody({ type: BatchInterpretationDto })
  async generateBatchInterpretations(
    @Body() batchDto: BatchInterpretationDto,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data: InterpretationResult[];
    message: string;
    stats: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const startTime = Date.now();
    const userId = req.user?.id;

    try {
      // 验证批量数据
      if (!batchDto.divinationDataList || batchDto.divinationDataList.length === 0) {
        throw new HttpException('占卜数据列表不能为空', HttpStatus.BAD_REQUEST);
      }

      if (batchDto.divinationDataList.length > 10) {
        throw new HttpException('批量处理最多支持10个项目', HttpStatus.BAD_REQUEST);
      }

      // 验证每个数据项
      batchDto.divinationDataList.forEach((data, index) => {
        try {
          this.validateDivinationData(data);
        } catch (error) {
          throw new HttpException(
            `第${index + 1}个占卜数据验证失败: ${error.message}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      // 记录批量请求日志
      await this.aiLoggerService.logAiRequest({
        requestId: `batch_interpretation_${Date.now()}_${userId}`,
        userId,
        requestType: 'batch_interpretation',
        inputData: {
          count: batchDto.divinationDataList.length,
          types: batchDto.divinationDataList.map(d => d.type),
        },
        modelConfig: batchDto.options,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // 批量生成解读
      const results = await this.interpretationService.generateBatchInterpretations(
        batchDto.divinationDataList,
        batchDto.options || {},
      );

      const stats = {
        total: batchDto.divinationDataList.length,
        successful: results.length,
        failed: batchDto.divinationDataList.length - results.length,
      };

      this.logger.log(
        `Generated ${results.length}/${batchDto.divinationDataList.length} interpretations for user ${userId} in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        data: results,
        message: '批量解读生成完成',
        stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate batch interpretations for user ${userId}: ${error.message}`,
        error.stack,
      );

      await this.aiLoggerService.logError(
        error,
        'BatchInterpretationGeneration',
        `batch_interpretation_${Date.now()}_${userId}`,
        userId,
      );

      throw new HttpException(
        {
          success: false,
          message: '批量解读生成失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('regenerate')
  @ApiOperation({ summary: '重新生成解读' })
  @ApiResponse({ status: 201, description: '解读重新生成成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiBody({ type: RegenerateInterpretationDto })
  async regenerateInterpretation(
    @Body() regenerateDto: RegenerateInterpretationDto,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data: InterpretationResult;
    message: string;
  }> {
    const startTime = Date.now();
    const userId = req.user?.id;

    try {
      // 验证输入数据
      this.validateDivinationData(regenerateDto.divinationData);

      if (!regenerateDto.originalId) {
        throw new HttpException('原始解读ID不能为空', HttpStatus.BAD_REQUEST);
      }

      // 记录重新生成请求日志
      await this.aiLoggerService.logAiRequest({
        requestId: `regenerate_interpretation_${Date.now()}_${userId}`,
        userId,
        requestType: 'regenerate_interpretation',
        inputData: {
          originalId: regenerateDto.originalId,
          divinationData: regenerateDto.divinationData,
        },
        modelConfig: regenerateDto.newOptions,
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // 重新生成解读
      const result = await this.interpretationService.regenerateInterpretation(
        regenerateDto.originalId,
        regenerateDto.divinationData,
        regenerateDto.newOptions,
      );

      this.logger.log(
        `Regenerated interpretation ${regenerateDto.originalId} for user ${userId} in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        data: result,
        message: '解读重新生成成功',
      };
    } catch (error) {
      this.logger.error(
        `Failed to regenerate interpretation for user ${userId}: ${error.message}`,
        error.stack,
      );

      await this.aiLoggerService.logError(
        error,
        'InterpretationRegeneration',
        `regenerate_interpretation_${Date.now()}_${userId}`,
        userId,
      );

      throw new HttpException(
        {
          success: false,
          message: '解读重新生成失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '获取解读统计信息' })
  @ApiResponse({ status: 200, description: '统计信息获取成功' })
  async getInterpretationStats(
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const userId = req.user?.id;

    try {
      const stats = await this.interpretationService.getInterpretationStats();

      return {
        success: true,
        data: stats,
        message: '统计信息获取成功',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get interpretation stats for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          success: false,
          message: '统计信息获取失败',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('types')
  @ApiOperation({ summary: '获取支持的占卜类型' })
  @ApiResponse({ status: 200, description: '占卜类型获取成功' })
  async getSupportedTypes(): Promise<{
    success: boolean;
    data: {
      types: string[];
      descriptions: Record<string, string>;
    };
    message: string;
  }> {
    return {
      success: true,
      data: {
        types: ['tarot', 'astrology', 'numerology', 'iching'],
        descriptions: {
          tarot: '塔罗牌占卜',
          astrology: '星座占星',
          numerology: '数字命理',
          iching: '易经占卜',
        },
      },
      message: '占卜类型获取成功',
    };
  }

  @Get('options')
  @ApiOperation({ summary: '获取解读选项配置' })
  @ApiResponse({ status: 200, description: '解读选项获取成功' })
  async getInterpretationOptions(): Promise<{
    success: boolean;
    data: {
      languages: string[];
      tones: string[];
      detailLevels: string[];
      focusAreas: Record<string, string[]>;
    };
    message: string;
  }> {
    return {
      success: true,
      data: {
        languages: ['zh-CN', 'en-US', 'ja-JP'],
        tones: ['formal', 'casual', 'mystical', 'scientific'],
        detailLevels: ['brief', 'standard', 'detailed'],
        focusAreas: {
          tarot: ['爱情', '事业', '财运', '健康', '学业'],
          astrology: ['性格分析', '运势预测', '关系匹配', '职业指导'],
          numerology: ['生命轨迹', '性格特质', '天赋才能', '人生课题'],
          iching: ['决策指导', '时机把握', '变化趋势', '内心指引'],
        },
      },
      message: '解读选项获取成功',
    };
  }

  /**
   * 评估解读质量
   */
  @Post(':id/assess-quality')
  @ApiOperation({ summary: '评估解读质量' })
  @ApiResponse({ status: 200, description: '质量评估成功' })
  @ApiParam({ name: 'id', description: '解读ID' })
  async assessQuality(
    @Param('id') interpretationId: string,
    @Body() originalData: DivinationData,
  ): Promise<QualityAssessment> {
    const interpretation = await this.getInterpretationById(interpretationId);
    return await this.qualityService.assessQuality(interpretation, originalData);
  }

  /**
   * 优化解读结果
   */
  @Post(':id/optimize')
  @ApiOperation({ summary: '优化解读结果' })
  @ApiResponse({ status: 200, description: '解读优化成功' })
  @ApiParam({ name: 'id', description: '解读ID' })
  async optimizeInterpretation(
    @Param('id') interpretationId: string,
    @Body() body: { originalData: DivinationData; config?: Partial<OptimizationConfig> },
  ): Promise<OptimizationResult> {
    const interpretation = await this.getInterpretationById(interpretationId);
    return await this.optimizerService.optimizeInterpretation(
      interpretation,
      body.originalData,
      body.config,
    );
  }

  /**
   * 获取优化策略列表
   */
  @Get('optimization/strategies')
  @ApiOperation({ summary: '获取优化策略列表' })
  @ApiResponse({ status: 200, description: '优化策略获取成功' })
  async getOptimizationStrategies() {
    return this.optimizerService.getOptimizationStrategies();
  }

  /**
   * 获取优化统计信息
   */
  @Get('optimization/stats')
  @ApiOperation({ summary: '获取优化统计信息' })
  @ApiResponse({ status: 200, description: '优化统计信息获取成功' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  async getOptimizationStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };
    
    return await this.optimizerService.getOptimizationStats(timeRange);
  }

  /**
   * 批量质量评估
   */
  @Post('batch/assess-quality')
  @ApiOperation({ summary: '批量质量评估' })
  @ApiResponse({ status: 200, description: '批量质量评估成功' })
  async batchAssessQuality(
    @Body() body: {
      interpretations: { id: string; originalData: DivinationData }[];
    },
  ): Promise<QualityAssessment[]> {
    const interpretations = await Promise.all(
      body.interpretations.map(item => this.getInterpretationById(item.id))
    );
    const originalDataList = body.interpretations.map(item => item.originalData);
    
    return await this.qualityService.batchAssessQuality(interpretations, originalDataList);
  }

  /**
   * 批量优化解读
   */
  @Post('batch/optimize')
  @ApiOperation({ summary: '批量优化解读' })
  @ApiResponse({ status: 200, description: '批量优化成功' })
  async batchOptimizeInterpretations(
    @Body() body: {
      interpretations: { id: string; originalData: DivinationData }[];
      config?: Partial<OptimizationConfig>;
    },
  ): Promise<OptimizationResult[]> {
    const interpretations = await Promise.all(
      body.interpretations.map(item => this.getInterpretationById(item.id))
    );
    const originalDataList = body.interpretations.map(item => item.originalData);
    
    return await this.optimizerService.batchOptimizeInterpretations(
      interpretations,
      originalDataList,
      body.config,
    );
  }

  /**
   * 根据ID获取解读结果（辅助方法）
   */
  private async getInterpretationById(id: string): Promise<InterpretationResult> {
    // 这里应该从数据库获取解读结果
    // 目前返回模拟数据
    return {
       id,
       type: 'tarot',
       summary: '模拟解读摘要',
       detailedAnalysis: {
         overview: '模拟详细分析',
         keyInsights: ['洞察1', '洞察2'],
         strengths: ['优势1', '优势2'],
         challenges: ['挑战1', '挑战2'],
         advice: ['建议1', '建议2'],
         futureOutlook: '未来展望',
       },
       personalizedMessages: {
         immediate: '即时消息',
         shortTerm: '短期消息',
         longTerm: '长期消息',
       },
       confidence: 0.85,
       qualityScore: 0.8,
       metadata: {
         promptUsed: 'default_prompt',
         modelUsed: 'gpt-4',
         processingTime: 1000,
         tokenUsage: {
           promptTokens: 200,
           completionTokens: 300,
           totalTokens: 500,
         },
       },
       generatedAt: new Date(),
     };
  }

  /**
   * 验证占卜数据
   */
  private validateDivinationData(data: DivinationData): void {
    if (!data) {
      throw new HttpException('占卜数据不能为空', HttpStatus.BAD_REQUEST);
    }

    if (!data.type) {
      throw new HttpException('占卜类型不能为空', HttpStatus.BAD_REQUEST);
    }

    const supportedTypes = ['tarot', 'astrology', 'numerology', 'iching'];
    if (!supportedTypes.includes(data.type)) {
      throw new HttpException(
        `不支持的占卜类型: ${data.type}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!data.question || data.question.trim().length === 0) {
      throw new HttpException('占卜问题不能为空', HttpStatus.BAD_REQUEST);
    }

    if (data.question.length > 500) {
      throw new HttpException('占卜问题长度不能超过500字符', HttpStatus.BAD_REQUEST);
    }

    // 根据类型验证特定数据
    switch (data.type) {
      case 'tarot':
        if (!data.cards || data.cards.length === 0) {
          throw new HttpException('塔罗牌数据不能为空', HttpStatus.BAD_REQUEST);
        }
        break;

      case 'astrology':
        if (!data.birthInfo || !data.birthInfo.date) {
          throw new HttpException('出生信息不能为空', HttpStatus.BAD_REQUEST);
        }
        break;

      case 'numerology':
        if (!data.numbers || typeof data.numbers.lifePathNumber !== 'number') {
          throw new HttpException('数字命理数据不能为空', HttpStatus.BAD_REQUEST);
        }
        break;

      case 'iching':
        if (!data.hexagram || typeof data.hexagram.primaryHexagram !== 'number') {
          throw new HttpException('易经卦象数据不能为空', HttpStatus.BAD_REQUEST);
        }
        break;
    }
  }
}