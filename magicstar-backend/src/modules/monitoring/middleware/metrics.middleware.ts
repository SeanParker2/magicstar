import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from '../services/prometheus.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsMiddleware.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const method = req.method;
    const originalUrl = req.originalUrl;
    
    // 获取路由模式（去除查询参数和动态参数）
    const route = this.normalizeRoute(originalUrl);

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      try {
        // 记录HTTP请求指标
        this.prometheusService.recordHttpRequest(method, route, statusCode, duration);
        
        // 记录慢请求
        if (duration > 1000) {
          this.logger.warn(`Slow request detected: ${method} ${route} - ${duration}ms`);
        }
        
        // 记录错误请求
        if (statusCode >= 400) {
          this.prometheusService.recordError(
            statusCode >= 500 ? 'server_error' : 'client_error',
            this.getModuleFromRoute(route)
          );
        }
      } catch (error) {
        this.logger.error(`Failed to record metrics: ${error.message}`);
      }
    });

    next();
  }

  /**
   * 标准化路由，将动态参数替换为占位符
   */
  private normalizeRoute(url: string): string {
    // 移除查询参数
    const path = url.split('?')[0];
    
    // 替换常见的动态参数模式
    return path
      .replace(/\/\d+/g, '/:id') // 数字ID
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid') // UUID
      .replace(/\/[a-f0-9]{24}/g, '/:objectId') // MongoDB ObjectId
      .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:token'); // 长字符串token
  }

  /**
   * 从路由中提取模块名
   */
  private getModuleFromRoute(route: string): string {
    const parts = route.split('/').filter(part => part && part !== 'api');
    return parts[0] || 'unknown';
  }
}