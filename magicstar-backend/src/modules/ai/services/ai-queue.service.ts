import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { AiLoggerService } from './ai-logger.service';

export interface AiProcessingJobData {
  requestId: string;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface AiJobResult {
  requestId: string;
  success: boolean;
  responseId?: string;
  error?: string;
  processingTime: number;
}

@Injectable()
@Processor('ai-requests')
export class AiQueueService {
  private readonly logger = new Logger(AiQueueService.name);

  constructor(
    @InjectQueue('ai-requests') private readonly aiQueue: Queue,
    private readonly aiLoggerService: AiLoggerService,
  ) {
    this.setupQueueEvents();
  }

  /**
   * 添加AI处理任务到队列
   */
  async addProcessingJob(
    requestId: string,
    priority: number = 0,
    delay: number = 0,
  ): Promise<string> {
    try {
      const jobData: AiProcessingJobData = {
        requestId,
        priority,
        retryCount: 0,
        maxRetries: 3,
      };

      const job = await this.aiQueue.add('process-ai-request', jobData, {
        priority,
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log(`Added AI processing job: ${job.id} for request: ${requestId}`);
      
      return job.id.toString();
    } catch (error) {
      this.logger.error(`Failed to add AI processing job: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量添加AI处理任务
   */
  async addBatchProcessingJobs(
    requests: Array<{ requestId: string; priority?: number; delay?: number }>,
  ): Promise<string[]> {
    try {
      const jobs = requests.map(req => ({
        name: 'process-ai-request',
        data: {
          requestId: req.requestId,
          priority: req.priority || 0,
          retryCount: 0,
          maxRetries: 3,
        } as AiProcessingJobData,
        opts: {
          priority: req.priority || 0,
          delay: req.delay || 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }));

      const addedJobs = await this.aiQueue.addBulk(jobs);
      const jobIds = addedJobs.map(job => job.id.toString());

      this.logger.log(`Added ${jobIds.length} AI processing jobs to queue`);
      
      return jobIds;
    } catch (error) {
      this.logger.error(`Failed to add batch AI processing jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理AI请求任务
   */
  @Process('process-ai-request')
  async processAiRequest(job: Job<AiProcessingJobData>): Promise<AiJobResult> {
    const startTime = Date.now();
    const { requestId } = job.data;

    this.logger.log(`Processing AI request job: ${job.id} for request: ${requestId}`);

    try {
      // 注入AiService会导致循环依赖，这里需要通过其他方式获取
      // 暂时返回模拟结果，实际实现时需要重构
      const result: AiJobResult = {
        requestId,
        success: true,
        processingTime: Date.now() - startTime,
      };

      // 记录任务完成日志
      await this.aiLoggerService.logJobCompleted({
        jobId: job.id.toString(),
        requestId,
        processingTime: result.processingTime,
        success: true,
      });

      this.logger.log(`Completed AI request job: ${job.id} in ${result.processingTime}ms`);
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录任务失败日志
      await this.aiLoggerService.logJobFailed({
        jobId: job.id.toString(),
        requestId,
        error: error.message,
        processingTime,
      });

      this.logger.error(`Failed AI request job: ${job.id} after ${processingTime}ms: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.aiQueue.getWaiting(),
        this.aiQueue.getActive(),
        this.aiQueue.getCompleted(),
        this.aiQueue.getFailed(),
        this.aiQueue.getDelayed(),
      ]);

      const isPaused = await this.aiQueue.isPaused();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: isPaused,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue status: ${error.message}`);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      };
    }
  }

  /**
   * 获取任务状态
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    data: any;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
  } | null> {
    try {
      const job = await this.aiQueue.getJob(jobId);
      
      if (!job) {
        return null;
      }

      const state = await job.getState();
      
      return {
        id: job.id.toString(),
        status: state,
        progress: job.progress(),
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      return null;
    }
  }

  /**
   * 取消任务
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.aiQueue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      await job.remove();
      
      this.logger.log(`Cancelled AI job: ${jobId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job: ${error.message}`);
      return false;
    }
  }

  /**
   * 重试失败的任务
   */
  async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.aiQueue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      await job.retry();
      
      this.logger.log(`Retried failed AI job: ${jobId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job: ${error.message}`);
      return false;
    }
  }

  /**
   * 暂停队列
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.aiQueue.pause();
      this.logger.log('AI queue paused');
    } catch (error) {
      this.logger.error(`Failed to pause queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * 恢复队列
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.aiQueue.resume();
      this.logger.log('AI queue resumed');
    } catch (error) {
      this.logger.error(`Failed to resume queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    try {
      await this.aiQueue.empty();
      this.logger.log('AI queue cleared');
    } catch (error) {
      this.logger.error(`Failed to clear queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    activeJobs: number;
    waitingJobs: number;
    avgProcessingTime: number;
    throughput: number; // jobs per minute
  }> {
    try {
      const status = await this.getQueueStatus();
      const completed = await this.aiQueue.getCompleted();
      const failed = await this.aiQueue.getFailed();
      
      // 计算平均处理时间
      let avgProcessingTime = 0;
      if (completed.length > 0) {
        const totalTime = completed.reduce((sum, job) => {
          const processedAt = job.processedOn || 0;
          const finishedAt = job.finishedOn || 0;
          return sum + (finishedAt - processedAt);
        }, 0);
        avgProcessingTime = totalTime / completed.length;
      }

      // 计算吞吐量（最近1小时）
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentCompleted = completed.filter(job => 
        (job.finishedOn || 0) > oneHourAgo
      );
      const throughput = recentCompleted.length; // jobs per hour

      return {
        totalJobs: status.waiting + status.active + status.completed + status.failed,
        completedJobs: status.completed,
        failedJobs: status.failed,
        activeJobs: status.active,
        waitingJobs: status.waiting,
        avgProcessingTime: Math.round(avgProcessingTime),
        throughput: Math.round(throughput / 60), // convert to jobs per minute
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        waitingJobs: 0,
        avgProcessingTime: 0,
        throughput: 0,
      };
    }
  }

  /**
   * 设置队列事件监听
   */
  private setupQueueEvents(): void {
    this.aiQueue.on('completed', (job, result) => {
      this.logger.debug(`Job ${job.id} completed with result:`, result);
    });

    this.aiQueue.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed:`, err.message);
    });

    this.aiQueue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled`);
    });

    this.aiQueue.on('progress', (job, progress) => {
      this.logger.debug(`Job ${job.id} progress: ${progress}%`);
    });

    this.aiQueue.on('waiting', (jobId) => {
      this.logger.debug(`Job ${jobId} is waiting`);
    });

    this.aiQueue.on('active', (job) => {
      this.logger.debug(`Job ${job.id} started processing`);
    });

    this.aiQueue.on('removed', (job) => {
      this.logger.debug(`Job ${job.id} removed`);
    });

    this.aiQueue.on('error', (error) => {
      this.logger.error(`Queue error: ${error.message}`, error.stack);
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queueStatus: any;
    redisConnected: boolean;
    error?: string;
  }> {
    try {
      const queueStatus = await this.getQueueStatus();
      
      // 检查Redis连接
      const redisConnected = await this.checkRedisConnection();
      
      const healthy = redisConnected && !queueStatus.paused;
      
      return {
        healthy,
        queueStatus,
        redisConnected,
      };
    } catch (error) {
      return {
        healthy: false,
        queueStatus: null,
        redisConnected: false,
        error: error.message,
      };
    }
  }

  /**
   * 检查Redis连接
   */
  private async checkRedisConnection(): Promise<boolean> {
    try {
      // 通过队列的Redis客户端检查连接
      await this.aiQueue.client.ping();
      return true;
    } catch (error) {
      this.logger.error(`Redis connection check failed: ${error.message}`);
      return false;
    }
  }
}