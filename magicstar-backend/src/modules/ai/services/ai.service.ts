import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { AiRequest, AiRequestType, AiRequestStatus, AiRequestPriority } from '../entities/ai-request.entity';
import { AiResponse, AiResponseQuality } from '../entities/ai-response.entity';
import { PromptTemplate } from '../entities/prompt-template.entity';

import { OpenaiService } from './openai.service';
import { BaiduService } from './baidu.service';
import { PromptService } from './prompt.service';
import { AiCacheService } from './ai-cache.service';
import { AiQueueService } from './ai-queue.service';
import { AiLoggerService } from './ai-logger.service';

export interface CreateAiRequestDto {
  userId?: string;
  sessionId?: string;
  requestType: AiRequestType;
  inputData: any;
  contextData?: any;
  priority?: AiRequestPriority;
  promptTemplateId?: string;
  modelConfig?: any;
  clientIp?: string;
  userAgent?: string;
}

export interface AiProcessingResult {
  requestId: string;
  responseId?: string;
  status: AiRequestStatus;
  responseText?: string;
  formattedResponse?: any;
  processingTime?: number;
  tokenUsage?: any;
  error?: string;
  cached?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    @InjectRepository(AiResponse)
    private readonly aiResponseRepository: Repository<AiResponse>,
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
    private readonly baiduService: BaiduService,
    private readonly promptService: PromptService,
    private readonly aiCacheService: AiCacheService,
    private readonly aiQueueService: AiQueueService,
    private readonly aiLoggerService: AiLoggerService,
  ) {}

  /**
   * 创建AI请求
   */
  async createRequest(createDto: CreateAiRequestDto): Promise<AiRequest> {
    const startTime = Date.now();

    try {
      // 验证输入数据
      await this.validateRequestInput(createDto);

      // 创建请求记录
      const request = this.aiRequestRepository.create({
        ...createDto,
        status: AiRequestStatus.PENDING,
        priority: createDto.priority || AiRequestPriority.NORMAL,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟过期
      });

      const savedRequest = await this.aiRequestRepository.save(request);

      // 记录日志
      await this.aiLoggerService.logAiRequest({
        requestId: savedRequest.id,
        userId: savedRequest.userId,
        requestType: savedRequest.requestType,
        inputData: savedRequest.inputData,
        modelConfig: savedRequest.modelConfig,
        priority: savedRequest.priority,
        sessionId: savedRequest.sessionId,
        clientIp: savedRequest.clientIp,
        userAgent: savedRequest.userAgent,
      });

      this.logger.log(`AI request created: ${savedRequest.id}`);
      return savedRequest;
    } catch (error) {
      this.logger.error(`Failed to create AI request: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create AI request');
    }
  }

  /**
   * 处理AI请求（同步）
   */
  async processRequest(requestId: string): Promise<AiProcessingResult> {
    const startTime = Date.now();
    let request: AiRequest | null = null;

    try {
      // 获取请求
      const foundRequest = await this.aiRequestRepository.findOne({
        where: { id: requestId },
      });

      if (!foundRequest) {
        throw new BadRequestException('AI request not found');
      }
      
      request = foundRequest;

      if (request.isExpired) {
        throw new BadRequestException('AI request has expired');
      }

      // 更新状态为处理中
      await this.updateRequestStatus(requestId, AiRequestStatus.PROCESSING, {
        startedAt: new Date(),
      });

      // 检查缓存
      const cacheKey = await this.aiCacheService.generateCacheKey(
        request.requestType,
        request.inputData,
        request.promptTemplateId,
      );

      const cachedResponse = await this.aiCacheService.getCachedResponse(cacheKey);
      if (cachedResponse) {
        return await this.handleCachedResponse(request, cachedResponse, startTime);
      }

      // 获取Prompt模板
      const promptTemplate = await this.promptService.getTemplate(
        request.promptTemplateId,
        request.requestType,
      );

      // 生成Prompt
      const prompt = await this.promptService.generatePrompt(
        promptTemplate,
        request.inputData,
        request.contextData,
      );

      // 调用AI服务
      const aiResult = await this.callAiService(prompt, request.modelConfig || promptTemplate.modelConfig);

      // 保存响应
      const response = await this.saveResponse(request, aiResult, prompt, startTime);

      // 缓存响应
      await this.aiCacheService.cacheResponse(cacheKey, response, 3600); // 1小时缓存

      // 更新请求状态
      await this.updateRequestStatus(requestId, AiRequestStatus.COMPLETED, {
        completedAt: new Date(),
        processingTime: Date.now() - startTime,
        tokenUsage: aiResult.tokenUsage,
      });

      // 记录成功日志
      await this.aiLoggerService.logAiResponse({
        requestId: request.id,
        responseId: response.id,
        modelProvider: response.modelProvider,
        modelName: response.modelName,
        promptTokens: aiResult.tokenUsage?.promptTokens || 0,
        completionTokens: aiResult.tokenUsage?.completionTokens || 0,
        totalTokens: aiResult.tokenUsage?.totalTokens || 0,
        processingTimeMs: Date.now() - startTime,
        success: true,
      });

      return {
        requestId: request.id,
        responseId: response.id,
        status: AiRequestStatus.COMPLETED,
        responseText: response.responseText,
        formattedResponse: response.formattedResponse,
        processingTime: Date.now() - startTime,
        tokenUsage: aiResult.tokenUsage,
        cached: false,
      };
    } catch (error) {
      this.logger.error(`Failed to process AI request ${requestId}: ${error.message}`, error.stack);

      // 更新请求状态为失败
      if (request) {
        await this.updateRequestStatus(requestId, AiRequestStatus.FAILED, {
          errorMessage: error.message,
          completedAt: new Date(),
          processingTime: Date.now() - startTime,
        });

        // 记录错误日志
        await this.aiLoggerService.logAiResponse({
          requestId: request.id,
          responseId: '',
          modelProvider: 'unknown',
          modelName: 'unknown',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          processingTimeMs: Date.now() - startTime,
          success: false,
          errorMessage: error.message,
        });
      }

      return {
        requestId: requestId,
        status: AiRequestStatus.FAILED,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 异步处理AI请求（加入队列）
   */
  async processRequestAsync(requestId: string): Promise<{ jobId: string }> {
    try {
      const jobId = await this.aiQueueService.addProcessingJob(requestId);
      
      this.logger.log(`AI request ${requestId} added to queue with job ID: ${jobId}`);
      
      return { jobId };
    } catch (error) {
      this.logger.error(`Failed to add AI request to queue: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to queue AI request');
    }
  }

  /**
   * 获取请求状态
   */
  async getRequestStatus(requestId: string): Promise<AiRequest> {
    const request = await this.aiRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new BadRequestException('AI request not found');
    }

    return request;
  }

  /**
   * 获取AI请求详情
   */
  async getRequest(requestId: string, userId?: string): Promise<AiRequest | null> {
    try {
      const whereCondition: any = { id: requestId };
      if (userId) {
        whereCondition.userId = userId;
      }

      const request = await this.aiRequestRepository.findOne({
        where: whereCondition,
        relations: ['response'],
      });

      return request;
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetRequest', requestId, userId);
      throw error;
    }
  }

  /**
   * 获取AI响应
   */
  async getResponse(requestId: string, userId?: string): Promise<AiResponse | null> {
    try {
      const request = await this.getRequest(requestId, userId);
      if (!request) {
        return null;
      }

      const response = await this.aiResponseRepository.findOne({
        where: { requestId },
        relations: ['request'],
      });

      if (response && response.isCached) {
        this.aiLoggerService.logCacheOperation('hit', response.cacheKey, true, response.cacheTtl);
      }

      return response;
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetResponse', requestId, userId);
      throw error;
    }
  }

  /**
   * 获取AI请求列表
   */
  async getRequests(query: {
    userId?: string;
    requestType?: string;
    status?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<{
    items: AiRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        userId,
        requestType,
        status,
        sessionId,
        page = 1,
        limit = 10,
        startTime,
        endTime,
      } = query;

      const queryBuilder = this.aiRequestRepository.createQueryBuilder('request')
        .leftJoinAndSelect('request.response', 'response')
        .orderBy('request.createdAt', 'DESC');

      if (userId) {
        queryBuilder.andWhere('request.userId = :userId', { userId });
      }

      if (requestType) {
        queryBuilder.andWhere('request.requestType = :requestType', { requestType });
      }

      if (status) {
        queryBuilder.andWhere('request.status = :status', { status });
      }

      if (sessionId) {
        queryBuilder.andWhere('request.sessionId = :sessionId', { sessionId });
      }

      if (startTime) {
        queryBuilder.andWhere('request.createdAt >= :startTime', { startTime: new Date(startTime) });
      }

      if (endTime) {
        queryBuilder.andWhere('request.createdAt <= :endTime', { endTime: new Date(endTime) });
      }

      const total = await queryBuilder.getCount();
      const items = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'GetRequests', undefined, query.userId);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    services: {
      database: string;
      cache: string;
      queue: string;
      openai: string;
      baidu: string;
    };
  }> {
    try {
      const timestamp = new Date().toISOString();
      const services = {
        database: 'unknown',
        cache: 'unknown',
        queue: 'unknown',
        openai: 'unknown',
        baidu: 'unknown',
      };

      // 检查数据库连接
      try {
        await this.aiRequestRepository.count();
        services.database = 'healthy';
      } catch (error) {
        services.database = 'unhealthy';
      }

      // 检查缓存连接
      try {
        await this.aiCacheService.checkConnection();
        services.cache = 'healthy';
      } catch (error) {
        services.cache = 'unhealthy';
      }

      // 检查队列连接
      try {
        const queueStats = await this.aiQueueService.getQueueStats();
        if (!queueStats) throw new Error('Queue unavailable');
        services.queue = 'healthy';
      } catch (error) {
        services.queue = 'unhealthy';
      }

      // 检查OpenAI连接
      try {
        await this.openaiService.checkConnection();
        services.openai = 'healthy';
      } catch (error) {
        services.openai = 'unhealthy';
      }

      // 检查百度服务连接
      try {
        await this.baiduService.checkConnection();
        services.baidu = 'healthy';
      } catch (error) {
        services.baidu = 'unhealthy';
      }

      const allHealthy = Object.values(services).every(status => status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp,
        services,
      };
    } catch (error) {
      this.aiLoggerService.logError(error, 'HealthCheck');
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          cache: 'unknown',
          queue: 'unknown',
          openai: 'unknown',
          baidu: 'unknown',
        },
      };
    }
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(
    responseId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    const response = await this.aiResponseRepository.findOne({
      where: { id: responseId },
    });

    if (!response) {
      throw new BadRequestException('AI response not found');
    }

    await this.aiResponseRepository.update(responseId, {
      userRating: rating,
      userFeedback: feedback,
      quality: this.calculateQualityFromRating(rating),
    });

    // 记录反馈日志
    this.aiLoggerService.log({
      level: 'info',
      message: 'User feedback submitted',
      context: 'UserFeedback',
      responseId,
      metadata: {
        rating,
        feedback,
      },
    });

    this.logger.log(`User feedback submitted for response: ${responseId}`);
  }

  /**
   * 私有方法：验证请求输入
   */
  private async validateRequestInput(createDto: CreateAiRequestDto): Promise<void> {
    if (!createDto.inputData) {
      throw new BadRequestException('Input data is required');
    }

    if (!Object.values(AiRequestType).includes(createDto.requestType)) {
      throw new BadRequestException('Invalid request type');
    }

    // 如果指定了模板ID，验证模板是否存在
    if (createDto.promptTemplateId) {
      const template = await this.promptTemplateRepository.findOne({
        where: { id: createDto.promptTemplateId },
      });

      if (!template || !template.isAvailable) {
        throw new BadRequestException('Invalid or unavailable prompt template');
      }

      // 验证输入数据是否符合模板要求
      const validation = template.validateInput(createDto.inputData);
      if (!validation.valid) {
        throw new BadRequestException(`Input validation failed: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * 私有方法：调用AI服务
   */
  private async callAiService(prompt: string, modelConfig: any): Promise<any> {
    const provider = modelConfig?.provider || this.getDefaultProvider();
    
    try {
      switch (provider) {
        case 'baidu':
          this.logger.log('Using Baidu AI service');
          return await this.baiduService.generateCompletion(prompt, modelConfig);
        case 'openai':
        default:
          this.logger.log('Using OpenAI service');
          return await this.openaiService.generateCompletion(prompt, modelConfig);
      }
    } catch (error) {
      this.logger.error(`AI service call failed with provider ${provider}: ${error.message}`);
      
      // 降级机制：如果主要服务失败，尝试备用服务
      if (provider === 'baidu') {
        this.logger.log('Falling back to OpenAI service');
        try {
          return await this.openaiService.generateCompletion(prompt, modelConfig);
        } catch (fallbackError) {
          this.logger.error(`Fallback service also failed: ${fallbackError.message}`);
          throw error; // 抛出原始错误
        }
      } else if (provider === 'openai') {
        this.logger.log('Falling back to Baidu service');
        try {
          return await this.baiduService.generateCompletion(prompt, modelConfig);
        } catch (fallbackError) {
          this.logger.error(`Fallback service also failed: ${fallbackError.message}`);
          throw error; // 抛出原始错误
        }
      }
      
      throw error;
    }
  }

  /**
   * 获取默认AI服务提供商
   */
  private getDefaultProvider(): string {
    return this.configService.get<string>('ai.defaultProvider', 'baidu');
  }

  /**
   * 私有方法：保存响应
   */
  private async saveResponse(
    request: AiRequest,
    aiResult: any,
    prompt: string,
    startTime: number,
  ): Promise<AiResponse> {
    const response = this.aiResponseRepository.create({
      requestId: request.id,
      modelProvider: aiResult.provider,
      modelName: aiResult.model,
      modelVersion: aiResult.version,
      promptText: prompt,
      responseText: aiResult.text,
      formattedResponse: aiResult.formatted,
      rawResponse: aiResult.raw,
      tokenUsage: aiResult.tokenUsage,
      processingTime: Date.now() - startTime,
      responseTime: aiResult.responseTime,
      isCached: false,
    });

    return await this.aiResponseRepository.save(response);
  }

  /**
   * 私有方法：处理缓存响应
   */
  private async handleCachedResponse(
    request: AiRequest,
    cachedResponse: any,
    startTime: number,
  ): Promise<AiProcessingResult> {
    // 创建缓存响应记录
    const response = this.aiResponseRepository.create({
      ...cachedResponse,
      requestId: request.id,
      isCached: true,
      processingTime: Date.now() - startTime,
    });

    const savedResponse = await this.aiResponseRepository.save(response) as unknown as AiResponse;

    // 更新请求状态
    await this.updateRequestStatus(request.id, AiRequestStatus.COMPLETED, {
      completedAt: new Date(),
      processingTime: Date.now() - startTime,
    });

    // 记录缓存命中日志
    await this.aiLoggerService.logAiResponse({
      requestId: request.id,
      responseId: savedResponse.id,
      modelProvider: savedResponse.modelProvider,
      modelName: savedResponse.modelName,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      processingTimeMs: Date.now() - startTime,
      success: true,
    });

    return {
      requestId: request.id,
      responseId: savedResponse.id,
      status: AiRequestStatus.COMPLETED,
      responseText: savedResponse.responseText,
      formattedResponse: savedResponse.formattedResponse,
      processingTime: Date.now() - startTime,
      cached: true,
    };
  }

  /**
   * 私有方法：更新请求状态
   */
  private async updateRequestStatus(
    requestId: string,
    status: AiRequestStatus,
    updates: Partial<AiRequest> = {},
  ): Promise<void> {
    await this.aiRequestRepository.update(requestId, {
      status,
      ...updates,
    });
  }

  /**
   * 私有方法：根据评分计算质量等级
   */
  private calculateQualityFromRating(rating: number): AiResponseQuality {
    if (rating >= 5) return AiResponseQuality.EXCELLENT;
    if (rating >= 4) return AiResponseQuality.GOOD;
    if (rating >= 3) return AiResponseQuality.AVERAGE;
    return AiResponseQuality.POOR;
  }
}