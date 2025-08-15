import { Injectable, Logger } from '@nestjs/common';
import { RedisOptimizerService } from './redis-optimizer.service';

export interface ConcurrencyConfig {
  maxConcurrent: number;
  timeWindow: number; // 时间窗口（毫秒）
  queueTimeout: number; // 队列超时（毫秒）
  priority?: number; // 优先级（数字越大优先级越高）
}

export interface QueueItem {
  id: string;
  timestamp: number;
  priority: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

export interface ConcurrencyStats {
  currentConcurrent: number;
  maxConcurrent: number;
  queueLength: number;
  totalProcessed: number;
  totalQueued: number;
  totalTimedOut: number;
  averageWaitTime: number;
  averageProcessTime: number;
}

@Injectable()
export class ConcurrencyControlService {
  private readonly logger = new Logger(ConcurrencyControlService.name);
  private readonly queues = new Map<string, QueueItem[]>();
  private readonly processing = new Map<string, Set<string>>();
  private readonly configs = new Map<string, ConcurrencyConfig>();
  private readonly stats = new Map<string, ConcurrencyStats>();

  constructor(private readonly redisOptimizer: RedisOptimizerService) {}

  /**
   * 注册并发控制配置
   */
  registerConfig(key: string, config: ConcurrencyConfig): void {
    this.configs.set(key, config);
    this.queues.set(key, []);
    this.processing.set(key, new Set());
    this.stats.set(key, {
      currentConcurrent: 0,
      maxConcurrent: config.maxConcurrent,
      queueLength: 0,
      totalProcessed: 0,
      totalQueued: 0,
      totalTimedOut: 0,
      averageWaitTime: 0,
      averageProcessTime: 0,
    });
    
    this.logger.log(`Registered concurrency config for ${key}: max=${config.maxConcurrent}`);
  }

  /**
   * 执行带并发控制的任务
   */
  async execute<T>(
    key: string,
    task: () => Promise<T>,
    priority: number = 0,
  ): Promise<T> {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`Concurrency config not found for key: ${key}`);
    }

    const taskId = this.generateTaskId();
    const startTime = Date.now();

    // 检查是否可以立即执行
    if (this.canExecuteImmediately(key)) {
      return this.executeTask(key, taskId, task, startTime);
    }

    // 需要排队
    return this.queueTask(key, taskId, task, priority, startTime, config.queueTimeout);
  }

  /**
   * 批量执行任务
   */
  async executeBatch<T>(
    key: string,
    tasks: (() => Promise<T>)[],
    batchSize?: number,
  ): Promise<T[]> {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`Concurrency config not found for key: ${key}`);
    }

    const effectiveBatchSize = batchSize || config.maxConcurrent;
    const results: T[] = [];
    
    for (let i = 0; i < tasks.length; i += effectiveBatchSize) {
      const batch = tasks.slice(i, i + effectiveBatchSize);
      const batchPromises = batch.map(task => this.execute(key, task));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error(`Batch task failed: ${result.reason}`);
          throw result.reason;
        }
      }
    }
    
    return results;
  }

  /**
   * 获取并发统计信息
   */
  getStats(key: string): ConcurrencyStats | null {
    return this.stats.get(key) || null;
  }

  /**
   * 获取所有并发统计信息
   */
  getAllStats(): Record<string, ConcurrencyStats> {
    const allStats: Record<string, ConcurrencyStats> = {};
    for (const [key, stats] of this.stats.entries()) {
      allStats[key] = { ...stats };
    }
    return allStats;
  }

  /**
   * 清空队列
   */
  clearQueue(key: string): void {
    const queue = this.queues.get(key);
    if (queue) {
      // 拒绝所有排队的任务
      for (const item of queue) {
        if (item.timeoutId) {
          clearTimeout(item.timeoutId);
        }
        item.reject(new Error('Queue cleared'));
      }
      queue.length = 0;
      
      const stats = this.stats.get(key);
      if (stats) {
        stats.queueLength = 0;
      }
    }
  }

  /**
   * 更新并发配置
   */
  updateConfig(key: string, config: Partial<ConcurrencyConfig>): void {
    const currentConfig = this.configs.get(key);
    if (currentConfig) {
      const newConfig = { ...currentConfig, ...config };
      this.configs.set(key, newConfig);
      
      const stats = this.stats.get(key);
      if (stats) {
        stats.maxConcurrent = newConfig.maxConcurrent;
      }
      
      this.logger.log(`Updated concurrency config for ${key}`);
      
      // 如果增加了并发数，尝试处理队列
      if (config.maxConcurrent && config.maxConcurrent > currentConfig.maxConcurrent) {
        this.processQueue(key);
      }
    }
  }

  /**
   * 获取分布式锁
   */
  async acquireDistributedLock(
    lockKey: string,
    ttl: number = 30000,
    retryDelay: number = 100,
    maxRetries: number = 50,
  ): Promise<string | null> {
    const lockValue = this.generateTaskId();
    const key = `lock:${lockKey}`;
    
    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.redisOptimizer.set(key, lockValue, { ttl: ttl / 1000 });
      
      if (acquired) {
        // 验证锁是否真的被我们获取
        const currentValue = await this.redisOptimizer.get(key);
        if (currentValue === lockValue) {
          return lockValue;
        }
      }
      
      // 等待后重试
      await this.sleep(retryDelay);
    }
    
    return null;
  }

  /**
   * 释放分布式锁
   */
  async releaseDistributedLock(lockKey: string, lockValue: string): Promise<boolean> {
    const key = `lock:${lockKey}`;
    const currentValue = await this.redisOptimizer.get(key);
    
    if (currentValue === lockValue) {
      await this.redisOptimizer.del(key);
      return true;
    }
    
    return false;
  }

  /**
   * 使用分布式锁执行任务
   */
  async executeWithDistributedLock<T>(
    lockKey: string,
    task: () => Promise<T>,
    ttl: number = 30000,
  ): Promise<T> {
    const lockValue = await this.acquireDistributedLock(lockKey, ttl);
    
    if (!lockValue) {
      throw new Error(`Failed to acquire distributed lock: ${lockKey}`);
    }
    
    try {
      return await task();
    } finally {
      await this.releaseDistributedLock(lockKey, lockValue);
    }
  }

  /**
   * 检查是否可以立即执行
   */
  private canExecuteImmediately(key: string): boolean {
    const config = this.configs.get(key);
    const processing = this.processing.get(key);
    
    if (!config || !processing) {
      return false;
    }
    
    return processing.size < config.maxConcurrent;
  }

  /**
   * 执行任务
   */
  private async executeTask<T>(
    key: string,
    taskId: string,
    task: () => Promise<T>,
    startTime: number,
  ): Promise<T> {
    const processing = this.processing.get(key)!;
    const stats = this.stats.get(key)!;
    
    processing.add(taskId);
    stats.currentConcurrent = processing.size;
    stats.totalProcessed++;
    
    const executeStartTime = Date.now();
    const waitTime = executeStartTime - startTime;
    
    try {
      const result = await task();
      
      const processTime = Date.now() - executeStartTime;
      this.updateAverageTime(stats, 'averageWaitTime', waitTime);
      this.updateAverageTime(stats, 'averageProcessTime', processTime);
      
      return result;
    } finally {
      processing.delete(taskId);
      stats.currentConcurrent = processing.size;
      
      // 处理队列中的下一个任务
      this.processQueue(key);
    }
  }

  /**
   * 将任务加入队列
   */
  private queueTask<T>(
    key: string,
    taskId: string,
    task: () => Promise<T>,
    priority: number,
    startTime: number,
    timeout: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queue = this.queues.get(key)!;
      const stats = this.stats.get(key)!;
      
      const queueItem: QueueItem = {
        id: taskId,
        timestamp: startTime,
        priority,
        resolve: async () => {
          try {
            const result = await this.executeTask(key, taskId, task, startTime);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject,
      };
      
      // 设置超时
      queueItem.timeoutId = setTimeout(() => {
        const index = queue.findIndex(item => item.id === taskId);
        if (index !== -1) {
          queue.splice(index, 1);
          stats.queueLength = queue.length;
          stats.totalTimedOut++;
          reject(new Error(`Task timeout after ${timeout}ms`));
        }
      }, timeout);
      
      // 按优先级插入队列
      const insertIndex = queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        queue.push(queueItem);
      } else {
        queue.splice(insertIndex, 0, queueItem);
      }
      
      stats.queueLength = queue.length;
      stats.totalQueued++;
    });
  }

  /**
   * 处理队列
   */
  private processQueue(key: string): void {
    const queue = this.queues.get(key);
    const stats = this.stats.get(key);
    
    if (!queue || !stats || queue.length === 0) {
      return;
    }
    
    while (queue.length > 0 && this.canExecuteImmediately(key)) {
      const item = queue.shift()!;
      
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }
      
      stats.queueLength = queue.length;
      
      // 异步执行，不阻塞队列处理
      setImmediate(() => item.resolve(undefined));
    }
  }

  /**
   * 更新平均时间
   */
  private updateAverageTime(
    stats: ConcurrencyStats,
    field: 'averageWaitTime' | 'averageProcessTime',
    newTime: number,
  ): void {
    const currentAverage = stats[field];
    const totalProcessed = stats.totalProcessed;
    
    // 使用移动平均算法
    stats[field] = (currentAverage * (totalProcessed - 1) + newTime) / totalProcessed;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(key: string): {
    queueLength: number;
    processing: number;
    maxConcurrent: number;
    canExecute: boolean;
  } | null {
    const queue = this.queues.get(key);
    const processing = this.processing.get(key);
    const config = this.configs.get(key);
    
    if (!queue || !processing || !config) {
      return null;
    }
    
    return {
      queueLength: queue.length,
      processing: processing.size,
      maxConcurrent: config.maxConcurrent,
      canExecute: this.canExecuteImmediately(key),
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(key: string): void {
    const stats = this.stats.get(key);
    const config = this.configs.get(key);
    
    if (stats && config) {
      stats.totalProcessed = 0;
      stats.totalQueued = 0;
      stats.totalTimedOut = 0;
      stats.averageWaitTime = 0;
      stats.averageProcessTime = 0;
      
      this.logger.log(`Reset stats for ${key}`);
    }
  }
}