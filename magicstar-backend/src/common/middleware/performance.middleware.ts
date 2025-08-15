import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisOptimizerService } from '../services/redis-optimizer.service';

export interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequests: PerformanceMetrics[];
  fastestRequests: PerformanceMetrics[];
  errorRate: number;
  requestsPerMinute: number;
  memoryTrend: number[];
  cpuTrend: number[];
}

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private readonly slowRequestThreshold = 1000; // 1秒
  private readonly metricsRetention = 24 * 60 * 60 * 1000; // 24小时
  private readonly maxMetricsCount = 10000;
  private cpuUsageStart: NodeJS.CpuUsage;

  constructor(private readonly redisOptimizer: RedisOptimizerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    this.cpuUsageStart = process.cpuUsage();

    // 监听响应完成事件
    res.on('finish', async () => {
      try {
        await this.recordMetrics(req, res, startTime, startMemory);
      } catch (error) {
        this.logger.error(`Failed to record performance metrics: ${error.message}`);
      }
    });

    next();
  }

  /**
   * 记录性能指标
   */
  private async recordMetrics(
    req: Request,
    res: Response,
    startTime: number,
    startMemory: NodeJS.MemoryUsage,
  ): Promise<void> {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    const cpuUsageEnd = process.cpuUsage(this.cpuUsageStart);

    const metrics: PerformanceMetrics = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: endTime,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIp(req),
      userId: (req as any).user?.id,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
      cpuUsage: cpuUsageEnd,
    };

    // 记录到Redis
    await this.storeMetrics(metrics);

    // 检查是否为慢请求
    if (responseTime > this.slowRequestThreshold) {
      this.logger.warn(
        `Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`,
        {
          metrics,
          query: req.query,
          body: this.sanitizeBody(req.body),
        },
      );
      
      // 记录慢请求
      await this.recordSlowRequest(metrics);
    }

    // 记录错误请求
    if (res.statusCode >= 400) {
      await this.recordErrorRequest(metrics);
    }

    // 更新实时统计
    await this.updateRealTimeStats(metrics);
  }

  /**
   * 存储性能指标到Redis
   */
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    const key = `performance:metrics:${Date.now()}`;
    await this.redisOptimizer.set(key, metrics, {
      ttl: this.metricsRetention / 1000,
      tags: ['performance', 'metrics'],
    });

    // 维护指标数量限制
    await this.cleanupOldMetrics();
  }

  /**
   * 记录慢请求
   */
  private async recordSlowRequest(metrics: PerformanceMetrics): Promise<void> {
    const key = 'performance:slow_requests';
    const slowRequests = await this.redisOptimizer.get<PerformanceMetrics[]>(key) || [];
    
    slowRequests.push(metrics);
    
    // 保持最新的100个慢请求
    if (slowRequests.length > 100) {
      slowRequests.sort((a, b) => b.responseTime - a.responseTime);
      slowRequests.splice(100);
    }
    
    await this.redisOptimizer.set(key, slowRequests, {
      ttl: this.metricsRetention / 1000,
      tags: ['performance', 'slow_requests'],
    });
  }

  /**
   * 记录错误请求
   */
  private async recordErrorRequest(metrics: PerformanceMetrics): Promise<void> {
    const key = 'performance:error_requests';
    const errorRequests = await this.redisOptimizer.get<PerformanceMetrics[]>(key) || [];
    
    errorRequests.push(metrics);
    
    // 保持最新的100个错误请求
    if (errorRequests.length > 100) {
      errorRequests.splice(0, errorRequests.length - 100);
    }
    
    await this.redisOptimizer.set(key, errorRequests, {
      ttl: this.metricsRetention / 1000,
      tags: ['performance', 'error_requests'],
    });
  }

  /**
   * 更新实时统计
   */
  private async updateRealTimeStats(metrics: PerformanceMetrics): Promise<void> {
    const now = Date.now();
    const minuteKey = `performance:stats:${Math.floor(now / 60000)}`; // 按分钟分组
    
    const currentStats = await this.redisOptimizer.get<any>(minuteKey) || {
      totalRequests: 0,
      totalResponseTime: 0,
      errorCount: 0,
      memoryUsage: [],
      cpuUsage: [],
    };
    
    currentStats.totalRequests++;
    currentStats.totalResponseTime += metrics.responseTime;
    
    if (metrics.statusCode >= 400) {
      currentStats.errorCount++;
    }
    
    if (metrics.memoryUsage) {
      currentStats.memoryUsage.push(metrics.memoryUsage.heapUsed);
    }
    
    if (metrics.cpuUsage) {
      currentStats.cpuUsage.push(metrics.cpuUsage.user + metrics.cpuUsage.system);
    }
    
    await this.redisOptimizer.set(minuteKey, currentStats, {
      ttl: 3600, // 1小时
      tags: ['performance', 'stats'],
    });
  }

  /**
   * 获取性能统计信息
   */
  async getPerformanceStats(timeRange: number = 3600000): Promise<PerformanceStats> {
    const now = Date.now();
    const startTime = now - timeRange;
    
    // 获取时间范围内的所有统计数据
    const statsKeys: string[] = [];
    for (let time = startTime; time <= now; time += 60000) {
      statsKeys.push(`performance:stats:${Math.floor(time / 60000)}`);
    }
    
    const statsData = await this.redisOptimizer.mget(statsKeys);
    
    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    const memoryTrend: number[] = [];
    const cpuTrend: number[] = [];
    
    for (const data of statsData) {
      if (data) {
        totalRequests += data.totalRequests || 0;
        totalResponseTime += data.totalResponseTime || 0;
        totalErrors += data.errorCount || 0;
        
        if (data.memoryUsage && data.memoryUsage.length > 0) {
          const avgMemory = data.memoryUsage.reduce((a: number, b: number) => a + b, 0) / data.memoryUsage.length;
          memoryTrend.push(avgMemory);
        }
        
        if (data.cpuUsage && data.cpuUsage.length > 0) {
          const avgCpu = data.cpuUsage.reduce((a: number, b: number) => a + b, 0) / data.cpuUsage.length;
          cpuTrend.push(avgCpu);
        }
      }
    }
    
    // 获取慢请求和快请求
    const slowRequests = await this.redisOptimizer.get<PerformanceMetrics[]>('performance:slow_requests') || [];
    const fastRequests = slowRequests
      .filter(req => req.responseTime < this.slowRequestThreshold)
      .sort((a, b) => a.responseTime - b.responseTime)
      .slice(0, 10);
    
    return {
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      slowestRequests: slowRequests.slice(0, 10),
      fastestRequests: fastRequests,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      requestsPerMinute: totalRequests / (timeRange / 60000),
      memoryTrend,
      cpuTrend,
    };
  }

  /**
   * 获取路径性能统计
   */
  async getPathPerformanceStats(path: string, timeRange: number = 3600000): Promise<{
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
    slowestRequest: PerformanceMetrics | null;
    fastestRequest: PerformanceMetrics | null;
  }> {
    const now = Date.now();
    const startTime = now - timeRange;
    
    // 这里可以实现更详细的路径级别统计
    // 为了简化，返回基本统计
    const slowRequests = await this.redisOptimizer.get<PerformanceMetrics[]>('performance:slow_requests') || [];
    const pathRequests = slowRequests.filter(req => req.path === path && req.timestamp >= startTime);
    
    if (pathRequests.length === 0) {
      return {
        averageResponseTime: 0,
        requestCount: 0,
        errorRate: 0,
        slowestRequest: null,
        fastestRequest: null,
      };
    }
    
    const totalResponseTime = pathRequests.reduce((sum, req) => sum + req.responseTime, 0);
    const errorCount = pathRequests.filter(req => req.statusCode >= 400).length;
    const slowestRequest = pathRequests.reduce((slowest, req) => 
      req.responseTime > slowest.responseTime ? req : slowest
    );
    const fastestRequest = pathRequests.reduce((fastest, req) => 
      req.responseTime < fastest.responseTime ? req : fastest
    );
    
    return {
      averageResponseTime: totalResponseTime / pathRequests.length,
      requestCount: pathRequests.length,
      errorRate: (errorCount / pathRequests.length) * 100,
      slowestRequest,
      fastestRequest,
    };
  }

  /**
   * 清理旧的性能指标
   */
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const pattern = 'performance:metrics:*';
      // 使用delByPattern方法来删除匹配的键
      const deletedCount = await this.redisOptimizer.delByPattern(pattern);
      
      if (deletedCount > this.maxMetricsCount) {
        this.logger.debug(`Cleaned up ${deletedCount} old performance metrics`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old metrics: ${error.message}`);
    }
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      req.get('X-Forwarded-For') ||
      req.get('X-Real-IP') ||
      'unknown'
    );
  }

  /**
   * 清理敏感的请求体数据
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * 重置性能统计
   */
  async resetStats(): Promise<void> {
    await this.redisOptimizer.delByTags(['performance']);
    this.logger.log('Performance statistics reset');
  }

  /**
   * 获取系统健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      averageResponseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
    recommendations: string[];
  }> {
    const stats = await this.getPerformanceStats(300000); // 5分钟
    const memoryUsage = process.memoryUsage();
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // 检查响应时间
    if (stats.averageResponseTime > 2000) {
      status = 'critical';
      recommendations.push('Average response time is too high (>2s)');
    } else if (stats.averageResponseTime > 1000) {
      status = 'warning';
      recommendations.push('Average response time is elevated (>1s)');
    }
    
    // 检查错误率
    if (stats.errorRate > 10) {
      status = 'critical';
      recommendations.push('Error rate is too high (>10%)');
    } else if (stats.errorRate > 5) {
      status = 'warning';
      recommendations.push('Error rate is elevated (>5%)');
    }
    
    // 检查内存使用
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      status = 'critical';
      recommendations.push('Memory usage is critical (>90%)');
    } else if (memoryUsagePercent > 80) {
      status = 'warning';
      recommendations.push('Memory usage is high (>80%)');
    }
    
    return {
      status,
      metrics: {
        averageResponseTime: stats.averageResponseTime,
        errorRate: stats.errorRate,
        memoryUsage: memoryUsagePercent,
        cpuUsage: 0, // 需要实现CPU使用率计算
      },
      recommendations,
    };
  }
}