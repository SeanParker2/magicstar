import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrometheusService } from '../../modules/monitoring/services/prometheus.service';

@Injectable()
export class ConnectionPoolOptimizerService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionPoolOptimizerService.name);
  private monitoringInterval: NodeJS.Timeout;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly prometheusService: PrometheusService,
  ) {}

  async onModuleInit() {
    // 启动连接池监控
    this.startConnectionPoolMonitoring();
    this.logger.log('Connection pool optimizer initialized');
  }

  /**
   * 启动连接池监控
   */
  private startConnectionPoolMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.monitorConnectionPool();
    }, 30000); // 每30秒监控一次
  }

  /**
   * 监控连接池状态
   */
  private async monitorConnectionPool() {
    try {
      const driver = this.dataSource.driver as any;
      
      if (driver && driver.pool) {
        const pool = driver.pool;
        
        // 获取连接池统计信息
        const stats = {
          totalConnections: pool.totalCount || 0,
          idleConnections: pool.idleCount || 0,
          activeConnections: pool.acquiredCount || 0,
          waitingClients: pool.waitingCount || 0,
          maxConnections: pool.max || 0,
          minConnections: pool.min || 0,
        };

        // 记录到Prometheus
        this.prometheusService.setDatabaseConnections(stats.activeConnections);

        // 检查连接池健康状态
        this.checkConnectionPoolHealth(stats);

        this.logger.debug(`Connection pool stats: ${JSON.stringify(stats)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to monitor connection pool: ${error.message}`);
    }
  }

  /**
   * 检查连接池健康状态
   */
  private checkConnectionPoolHealth(stats: any) {
    const utilizationRate = stats.activeConnections / stats.maxConnections;
    const waitingRate = stats.waitingClients / stats.maxConnections;

    // 连接池使用率过高警告
    if (utilizationRate > 0.8) {
      this.logger.warn(
        `High connection pool utilization: ${(utilizationRate * 100).toFixed(1)}%`
      );
    }

    // 等待连接的客户端过多警告
    if (waitingRate > 0.1) {
      this.logger.warn(
        `Too many waiting clients: ${stats.waitingClients} (${(waitingRate * 100).toFixed(1)}%)`
      );
    }

    // 空闲连接过多建议
    if (stats.idleConnections > stats.maxConnections * 0.5 && stats.activeConnections < stats.maxConnections * 0.2) {
      this.logger.debug(
        `Consider reducing max connections. Idle: ${stats.idleConnections}, Active: ${stats.activeConnections}`
      );
    }
  }

  /**
   * 获取连接池统计信息
   */
  async getConnectionPoolStats() {
    try {
      const driver = this.dataSource.driver as any;
      
      if (driver && driver.pool) {
        const pool = driver.pool;
        
        return {
          totalConnections: pool.totalCount || 0,
          idleConnections: pool.idleCount || 0,
          activeConnections: pool.acquiredCount || 0,
          waitingClients: pool.waitingCount || 0,
          maxConnections: pool.max || 0,
          minConnections: pool.min || 0,
          utilizationRate: ((pool.acquiredCount || 0) / (pool.max || 1)) * 100,
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get connection pool stats: ${error.message}`);
      return null;
    }
  }

  /**
   * 优化连接池配置建议
   */
  async getOptimizationRecommendations() {
    const stats = await this.getConnectionPoolStats();
    
    if (!stats) {
      return [];
    }

    const recommendations: Array<{
      type: string;
      message: string;
      currentValue: number;
      suggestedValue?: number;
    }> = [];

    // 基于使用率的建议
    if (stats.utilizationRate > 90) {
      recommendations.push({
        type: 'increase_max_connections',
        message: `连接池使用率过高 (${stats.utilizationRate.toFixed(1)}%)，建议增加最大连接数`,
        currentValue: stats.maxConnections,
        suggestedValue: Math.ceil(stats.maxConnections * 1.5),
      });
    } else if (stats.utilizationRate < 20 && stats.maxConnections > 10) {
      recommendations.push({
        type: 'decrease_max_connections',
        message: `连接池使用率较低 (${stats.utilizationRate.toFixed(1)}%)，可以减少最大连接数`,
        currentValue: stats.maxConnections,
        suggestedValue: Math.max(10, Math.ceil(stats.maxConnections * 0.7)),
      });
    }

    // 基于等待客户端的建议
    if (stats.waitingClients > 0) {
      recommendations.push({
        type: 'connection_timeout',
        message: `有 ${stats.waitingClients} 个客户端在等待连接，可能需要优化查询或增加连接数`,
        currentValue: stats.waitingClients,
      });
    }

    return recommendations;
  }

  /**
   * 清理资源
   */
  onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}