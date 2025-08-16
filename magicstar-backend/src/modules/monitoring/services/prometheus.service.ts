import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  // HTTP请求指标
  public readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  public readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  // 业务指标
  public readonly paymentRequestsTotal = new Counter({
    name: 'payment_requests_total',
    help: 'Total number of payment requests',
    labelNames: ['payment_method', 'status'],
  });

  public readonly aiRequestsTotal = new Counter({
    name: 'ai_requests_total',
    help: 'Total number of AI requests',
    labelNames: ['provider', 'model', 'status'],
  });

  public readonly aiRequestDuration = new Histogram({
    name: 'ai_request_duration_seconds',
    help: 'Duration of AI requests in seconds',
    labelNames: ['provider', 'model'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60],
  });

  public readonly divinationRequestsTotal = new Counter({
    name: 'divination_requests_total',
    help: 'Total number of divination requests',
    labelNames: ['type', 'status'],
  });

  // 系统指标
  public readonly activeUsers = new Gauge({
    name: 'active_users_total',
    help: 'Number of currently active users',
  });

  public readonly databaseConnections = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
  });

  public readonly redisConnections = new Gauge({
    name: 'redis_connections_active',
    help: 'Number of active Redis connections',
  });

  // 错误指标
  public readonly errorsTotal = new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'module'],
  });

  onModuleInit() {
    // 启用默认指标收集（CPU、内存等）
    collectDefaultMetrics({ register });
    
    // 注册自定义指标
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.paymentRequestsTotal);
    register.registerMetric(this.aiRequestsTotal);
    register.registerMetric(this.aiRequestDuration);
    register.registerMetric(this.divinationRequestsTotal);
    register.registerMetric(this.activeUsers);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.redisConnections);
    register.registerMetric(this.errorsTotal);
  }

  /**
   * 获取所有指标
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * 记录HTTP请求
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration / 1000 // 转换为秒
    );
  }

  /**
   * 记录支付请求
   */
  recordPaymentRequest(paymentMethod: string, status: string) {
    this.paymentRequestsTotal.inc({ payment_method: paymentMethod, status });
  }

  /**
   * 记录AI请求
   */
  recordAiRequest(provider: string, model: string, status: string, duration?: number) {
    this.aiRequestsTotal.inc({ provider, model, status });
    if (duration !== undefined) {
      this.aiRequestDuration.observe({ provider, model }, duration / 1000);
    }
  }

  /**
   * 记录占卜请求
   */
  recordDivinationRequest(type: string, status: string) {
    this.divinationRequestsTotal.inc({ type, status });
  }

  /**
   * 更新活跃用户数
   */
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  /**
   * 更新数据库连接数
   */
  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  /**
   * 更新Redis连接数
   */
  setRedisConnections(count: number) {
    this.redisConnections.set(count);
  }

  /**
   * 记录错误
   */
  recordError(type: string, module: string) {
    this.errorsTotal.inc({ type, module });
  }

  /**
   * 清除所有指标
   */
  clearMetrics() {
    register.clear();
  }
}