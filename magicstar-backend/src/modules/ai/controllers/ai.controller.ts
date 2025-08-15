import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { AiService } from '../services/ai.service';
import { AiLoggerService } from '../services/ai-logger.service';
import type {
  CreateAiRequestDto,
  AiRequestQueryDto,
  SubmitFeedbackDto,
} from '../dto/ai-request.dto';
import { AiRequestType, AiRequestPriority } from '../entities/ai-request.entity';

@ApiTags('AI服务')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiLoggerService: AiLoggerService,
  ) {}

  @Post('request')
  @ApiOperation({ summary: '创建AI请求' })
  @ApiResponse({ status: 201, description: 'AI请求创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求频率过高' })
  async createRequest(
    @Body() createAiRequestDto: CreateAiRequestDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // 记录请求日志
      await this.aiLoggerService.logAiRequest({
        requestId: '', // 将在服务中生成
        userId,
        requestType: createAiRequestDto.requestType,
        inputData: createAiRequestDto.inputData,
        modelConfig: createAiRequestDto.modelConfig,
        priority: createAiRequestDto.priority,
        sessionId: createAiRequestDto.sessionId,
        clientIp,
        userAgent,
      });

      const result = await this.aiService.createRequest({
        ...createAiRequestDto,
        userId,
        clientIp,
        userAgent,
      });

      return {
        success: true,
        data: result,
        message: 'AI请求创建成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'CreateAiRequest', '', req.user?.['id']);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'AI请求创建失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('request/:id/process')
  @ApiOperation({ summary: '处理AI请求' })
  @ApiResponse({ status: 200, description: 'AI请求处理成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  async processRequest(
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const result = await this.aiService.processRequest(requestId);

      return {
        success: true,
        data: result,
        message: 'AI请求处理成功',
      };
    } catch (error) {
      await this.aiLoggerService.logError(error, 'ProcessAiRequest', requestId);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'AI请求处理失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('request/:id')
  @ApiOperation({ summary: '获取AI请求详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  async getRequest(
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const result = await this.aiService.getRequest(requestId, userId);

      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: 'AI请求不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: result,
        message: '获取成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetAiRequest', requestId, req.user?.['id']);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取AI请求失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('request/:id/response')
  @ApiOperation({ summary: '获取AI响应' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '响应不存在' })
  async getResponse(
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const result = await this.aiService.getResponse(requestId, userId);

      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: 'AI响应不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: result,
        message: '获取成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetAiResponse', requestId, req.user?.['id']);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取AI响应失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('requests')
  @ApiOperation({ summary: '获取AI请求列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRequests(
    @Query() query: AiRequestQueryDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const result = await this.aiService.getRequests({
        ...query,
        userId,
      });

      return {
        success: true,
        data: result,
        message: '获取成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetAiRequests', undefined, req.user?.['id']);
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取AI请求列表失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('request/:id/feedback')
  @ApiOperation({ summary: '提交用户反馈' })
  @ApiResponse({ status: 200, description: '反馈提交成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  async submitFeedback(
    @Param('id') requestId: string,
    @Body() feedbackDto: SubmitFeedbackDto,
    @Req() req: Request,
  ) {
    try {
      const userId = req.user?.['id'];
      const result = await this.aiService.submitFeedback(
        requestId,
        feedbackDto.rating,
        feedbackDto.feedback,
      );

      return {
        success: true,
        data: result,
        message: '反馈提交成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'SubmitFeedback', requestId, req.user?.['id']);
      throw new HttpException(
        {
          success: false,
          message: error.message || '反馈提交失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '获取AI服务统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats(
    @Req() req: Request,
    @Query('timeRange') timeRange?: string,
  ) {
    try {
      const userId = req.user?.['id'];
      let parsedTimeRange;
      
      if (timeRange) {
        try {
          parsedTimeRange = JSON.parse(timeRange);
          if (parsedTimeRange.start) {
            parsedTimeRange.start = new Date(parsedTimeRange.start);
          }
          if (parsedTimeRange.end) {
            parsedTimeRange.end = new Date(parsedTimeRange.end);
          }
        } catch (e) {
          // 忽略时间范围解析错误
        }
      }

      const [requestStats, responseStats] = await Promise.all([
        this.aiLoggerService.getRequestStats(parsedTimeRange),
        this.aiLoggerService.getResponseStats(parsedTimeRange),
      ]);

      return {
        success: true,
        data: {
          requests: requestStats,
          responses: responseStats,
        },
        message: '获取成功',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetAiStats', undefined, req.user?.['id']);
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取统计信息失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常' })
  async healthCheck() {
    try {
      const health = await this.aiService.healthCheck();
      return {
        success: true,
        data: health,
        message: '服务正常',
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'HealthCheck');
      throw new HttpException(
        {
          success: false,
          message: '服务异常',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}