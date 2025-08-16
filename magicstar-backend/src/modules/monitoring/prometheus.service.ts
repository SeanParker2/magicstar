import { Injectable } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private paymentRequestsTotal: Counter<string>;
  private aiRequestsTotal: Counter<string>;
  private divinationRequestsTotal: Counter<string>;
  private activeUsers: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private redisConnections: Gauge<string>;
  private errorTotal: Counter<string>;

  constructor() {
    // 启用默认指标收集
    collectDefaultMetrics({ register });

    // HTTP请求指标
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'module'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'module'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    // 业务指标
    this.paymentRequestsTotal = new Counter({
      name: 'payment_requests_total',
      help: 'Total number of payment requests',
      labelNames: ['payment_method', 'status'],
      registers: [register],
    });

    this.aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['service', 'status'],
      registers: [register],
    });

    this.divinationRequestsTotal = new Counter({
      name: 'divination_requests_total',
      help: 'Total number of divination requests',
      labelNames: ['type', 'status'],
      registers: [register],
    });

    // 系统指标
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [register],
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of database connections',
      registers: [register],
    });

    this.redisConnections = new Gauge({
      name: 'redis_connections',
      help: 'Number of Redis connections',
      registers: [register],
    });

    this.errorTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'module'],
      registers: [register],
    });
  }

  // HTTP请求指标记录
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, module: string) {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      module,
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  // 支付请求指标记录
  recordPaymentRequest(paymentMethod: string, status: string) {
    this.paymentRequestsTotal.inc({ payment_method: paymentMethod, status });
  }

  // AI请求指标记录
  recordAiRequest(service: string, status: string) {
    this.aiRequestsTotal.inc({ service, status });
  }

  // 占卜请求指标记录
  recordDivinationRequest(type: string, status: string) {
    this.divinationRequestsTotal.inc({ type, status });
  }

  // 活跃用户数设置
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  // 数据库连接数设置
  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  // Redis连接数设置
  setRedisConnections(count: number) {
    this.redisConnections.set(count);
  }

  // 错误记录
  recordError(type: string, module: string) {
    this.errorTotal.inc({ type, module });
  }

  // 获取所有指标
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // 健康检查
  getHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };
  }
}