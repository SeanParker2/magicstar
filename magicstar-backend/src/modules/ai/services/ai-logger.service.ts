import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRequest, AiRequestPriority } from '../entities/ai-request.entity';
import { AiResponse } from '../entities/ai-response.entity';

export interface AiLogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  requestId?: string;
  responseId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface AiRequestLogData {
  requestId: string;
  userId?: string;
  requestType: string;
  inputData: any;
  modelConfig?: any;
  priority?: AiRequestPriority;
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface AiResponseLogData {
  requestId: string;
  responseId: string;
  modelProvider: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  processingTimeMs: number;
  responseQuality?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AiPerformanceLogData {
  operation: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AiLoggerService {
  private readonly logger = new Logger(AiLoggerService.name);

  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    @InjectRepository(AiResponse)
    private readonly aiResponseRepository: Repository<AiResponse>,
  ) {}

  /**
   * 记录通用日志
   */
  log(entry: AiLogEntry): void {
    const { level, message, context, requestId, userId, metadata, timestamp } = entry;
    const logMessage = this.formatLogMessage(message, {
      requestId,
      userId,
      metadata,
      timestamp: timestamp || new Date(),
    });

    switch (level) {
      case 'debug':
        this.logger.debug(logMessage, context);
        break;
      case 'info':
        this.logger.log(logMessage, context);
        break;
      case 'warn':
        this.logger.warn(logMessage, context);
        break;
      case 'error':
        this.logger.error(logMessage, context);
        break;
      default:
        this.logger.log(logMessage, context);
    }
  }

  /**
   * 记录AI请求日志
   */
  async logAiRequest(data: AiRequestLogData): Promise<void> {
    try {
      this.log({
        level: 'info',
        message: 'AI request initiated',
        context: 'AiRequest',
        requestId: data.requestId,
        userId: data.userId,
        metadata: {
          requestType: data.requestType,
          priority: data.priority,
          sessionId: data.sessionId,
          clientIp: data.clientIp,
          userAgent: data.userAgent,
          inputDataSize: JSON.stringify(data.inputData).length,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log AI request: ${error.message}`, 'AiRequest');
    }
  }

  /**
   * 记录AI响应日志
   */
  async logAiResponse(data: AiResponseLogData): Promise<void> {
    try {
      this.log({
        level: data.success ? 'info' : 'error',
        message: data.success ? 'AI response completed' : 'AI response failed',
        context: 'AiResponse',
        requestId: data.requestId,
        metadata: {
          responseId: data.responseId,
          modelProvider: data.modelProvider,
          modelName: data.modelName,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          processingTimeMs: data.processingTimeMs,
          responseQuality: data.responseQuality,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log AI response: ${error.message}`, 'AiResponse');
    }
  }

  /**
   * 记录性能日志
   */
  logPerformance(data: AiPerformanceLogData): void {
    this.log({
      level: data.success ? 'info' : 'warn',
      message: `Operation ${data.operation} ${data.success ? 'completed' : 'failed'} in ${data.duration}ms`,
      context: 'Performance',
      metadata: {
        operation: data.operation,
        duration: data.duration,
        success: data.success,
        errorMessage: data.errorMessage,
        ...data.metadata,
      },
    });
  }

  /**
   * 记录错误日志
   */
  logError(error: Error, context?: string, requestId?: string, userId?: string): void {
    this.log({
      level: 'error',
      message: error.message,
      context: context || 'AiError',
      requestId,
      userId,
      metadata: {
        stack: error.stack,
        name: error.name,
      },
    });
  }

  /**
   * 记录队列事件日志
   */
  logQueueEvent(
    event: string,
    jobId: string,
    data?: any,
    error?: Error,
  ): void {
    this.log({
      level: error ? 'error' : 'info',
      message: `Queue event: ${event}`,
      context: 'AiQueue',
      metadata: {
        event,
        jobId,
        data: data ? JSON.stringify(data).substring(0, 500) : undefined,
        error: error ? error.message : undefined,
      },
    });
  }

  /**
   * 记录任务完成日志
   */
  async logJobCompleted(data: {
    jobId: string;
    requestId: string;
    processingTime: number;
    success: boolean;
  }): Promise<void> {
    this.log({
      level: 'info',
      message: `Job completed: ${data.jobId}`,
      context: 'AiQueue',
      requestId: data.requestId,
      metadata: {
        jobId: data.jobId,
        processingTime: data.processingTime,
        success: data.success,
      },
    });
  }

  /**
   * 记录任务失败日志
   */
  async logJobFailed(data: {
    jobId: string;
    requestId: string;
    error: string;
    processingTime: number;
  }): Promise<void> {
    this.log({
      level: 'error',
      message: `Job failed: ${data.jobId}`,
      context: 'AiQueue',
      requestId: data.requestId,
      metadata: {
        jobId: data.jobId,
        error: data.error,
        processingTime: data.processingTime,
      },
    });
  }

  /**
   * 记录缓存操作日志
   */
  logCacheOperation(
    operation: string,
    key: string,
    hit?: boolean,
    ttl?: number,
  ): void {
    this.log({
      level: 'debug',
      message: `Cache ${operation}: ${key}`,
      context: 'AiCache',
      metadata: {
        operation,
        key,
        hit,
        ttl,
      },
    });
  }

  /**
   * 获取请求统计信息
   */
  async getRequestStats(timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const query = this.aiRequestRepository.createQueryBuilder('request');
      
      if (timeRange) {
        query.where('request.createdAt BETWEEN :start AND :end', {
          start: timeRange.start,
          end: timeRange.end,
        });
      }

      const [total, completed, failed, pending] = await Promise.all([
        query.getCount(),
        query.clone().andWhere('request.status = :status', { status: 'completed' }).getCount(),
        query.clone().andWhere('request.status = :status', { status: 'failed' }).getCount(),
        query.clone().andWhere('request.status IN (:...statuses)', { statuses: ['pending', 'processing'] }).getCount(),
      ]);

      return {
        total,
        completed,
        failed,
        pending,
        successRate: total > 0 ? (completed / total) * 100 : 0,
      };
    } catch (error) {
      this.logError(error, 'GetRequestStats');
      return {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        successRate: 0,
      };
    }
  }

  /**
   * 获取响应统计信息
   */
  async getResponseStats(timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const query = this.aiResponseRepository.createQueryBuilder('response');
      
      if (timeRange) {
        query.where('response.createdAt BETWEEN :start AND :end', {
          start: timeRange.start,
          end: timeRange.end,
        });
      }

      const responses = await query.getMany();
      
      if (responses.length === 0) {
        return {
          totalResponses: 0,
          averageProcessingTime: 0,
          averageTokenUsage: 0,
          averageQuality: 0,
        };
      }

      const totalProcessingTime = responses.reduce((sum, r) => sum + (r.processingTime || 0), 0);
      const totalTokens = responses.reduce((sum, r) => sum + (r.tokenUsage?.totalTokens || 0), 0);
      const qualityResponses = responses.filter(r => r.qualityScore !== null);
      const totalQuality = qualityResponses.reduce((sum, r) => sum + (r.qualityScore || 0), 0);

      return {
        totalResponses: responses.length,
        averageProcessingTime: totalProcessingTime / responses.length,
        averageTokenUsage: totalTokens / responses.length,
        averageQuality: qualityResponses.length > 0 ? totalQuality / qualityResponses.length : 0,
      };
    } catch (error) {
      this.logError(error, 'GetResponseStats');
      return {
        totalResponses: 0,
        averageProcessingTime: 0,
        averageTokenUsage: 0,
        averageQuality: 0,
      };
    }
  }

  /**
   * 格式化日志消息
   */
  private formatLogMessage(message: string, metadata: Record<string, any>): string {
    const parts = [message];
    
    if (metadata.requestId) {
      parts.push(`[RequestId: ${metadata.requestId}]`);
    }
    
    if (metadata.userId) {
      parts.push(`[UserId: ${metadata.userId}]`);
    }
    
    if (metadata.metadata && Object.keys(metadata.metadata).length > 0) {
      parts.push(`[Metadata: ${JSON.stringify(metadata.metadata)}]`);
    }
    
    return parts.join(' ');
  }
}