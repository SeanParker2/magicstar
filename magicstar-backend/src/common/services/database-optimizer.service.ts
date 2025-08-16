import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RedisOptimizerService } from './redis-optimizer.service';
import { PrometheusService } from '../../modules/monitoring/services/prometheus.service';

export interface QueryCacheOptions {
  ttl?: number; // 缓存时间（秒）
  key?: string; // 自定义缓存键
  tags?: string[]; // 缓存标签
  enabled?: boolean; // 是否启用缓存
}

export interface QueryPerformanceMetrics {
  queryTime: number;
  rowsAffected: number;
  cacheHit: boolean;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  tableName?: string;
}

export interface SlowQueryInfo {
  query: string;
  parameters: any[];
  executionTime: number;
  timestamp: Date;
  stackTrace?: string;
}

export interface ConnectionPoolStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  waitingCount: number;
  averageQueryTime: number;
}

@Injectable()
export class DatabaseOptimizerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizerService.name);
  private readonly slowQueryThreshold: number;
  private readonly cacheEnabled: boolean;
  private readonly slowQueries: SlowQueryInfo[] = [];
  private readonly queryMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private connectionPoolStats: ConnectionPoolStats = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    maxConnections: 0,
    waitingCount: 0,
    averageQueryTime: 0,
  };

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly redisOptimizer: RedisOptimizerService,
    private readonly prometheusService: PrometheusService,
  ) {
    this.slowQueryThreshold = this.configService.get('DB_SLOW_QUERY_THRESHOLD', 1000); // 1秒
    this.cacheEnabled = this.configService.get('DB_CACHE_ENABLED', true);
  }

  async onModuleInit() {
    this.setupQueryLogging();
    this.startConnectionPoolMonitoring();
    this.logger.log('Database optimizer service initialized');
  }

  /**
   * 执行带缓存的查询
   */
  async executeWithCache<T extends Record<string, any>>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryCacheOptions = {},
  ): Promise<T[]> {
    const startTime = Date.now();
    const query = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    
    // 生成缓存键
    const cacheKey = options.key || this.generateCacheKey(query, parameters);
    
    // 尝试从缓存获取
    if (this.cacheEnabled && options.enabled !== false) {
      const cached = await this.redisOptimizer.get<T[]>(cacheKey);
      if (cached) {
        const queryTime = Date.now() - startTime;
        this.recordQueryMetrics(query, queryTime, cached.length, true);
        this.logger.debug(`Cache hit for query: ${cacheKey}`);
        return cached;
      }
    }

    // 执行查询
    const result = await queryBuilder.getMany();
    const queryTime = Date.now() - startTime;
    
    // 记录性能指标
    this.recordQueryMetrics(query, queryTime, result.length, false);
    
    // 检查慢查询
    if (queryTime > this.slowQueryThreshold) {
      this.recordSlowQuery(query, Array.isArray(parameters) ? parameters : [parameters], queryTime);
    }
    
    // 缓存结果
    if (this.cacheEnabled && options.enabled !== false && result.length > 0) {
      const ttl = options.ttl || 300; // 默认5分钟
      await this.redisOptimizer.set(cacheKey, result, {
        ttl,
        tags: options.tags,
      });
    }
    
    return result;
  }

  /**
   * 执行带缓存的单个查询
   */
  async executeOneWithCache<T extends Record<string, any>>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryCacheOptions = {},
  ): Promise<T | null> {
    const results = await this.executeWithCache(queryBuilder.limit(1), options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 批量查询优化
   */
  async batchQuery<T extends Record<string, any>>(
    queries: Array<{ queryBuilder: SelectQueryBuilder<T>; options?: QueryCacheOptions }>,
  ): Promise<T[][]> {
    const promises = queries.map(({ queryBuilder, options }) =>
      this.executeWithCache(queryBuilder, options),
    );
    
    return Promise.all(promises);
  }

  /**
   * 预热缓存
   */
  async warmupCache(queries: Array<{ query: string; parameters?: any[]; cacheKey: string; ttl?: number }>) {
    this.logger.log('Starting cache warmup...');
    
    for (const { query, parameters = [], cacheKey, ttl = 300 } of queries) {
      try {
        const result = await this.dataSource.query(query, parameters);
        await this.redisOptimizer.set(cacheKey, result, { ttl });
        this.logger.debug(`Warmed up cache for: ${cacheKey}`);
      } catch (error) {
        this.logger.error(`Failed to warm up cache for ${cacheKey}: ${error.message}`);
      }
    }
    
    this.logger.log('Cache warmup completed');
  }

  /**
   * 清理查询缓存
   */
  async invalidateQueryCache(tags: string[]): Promise<void> {
    await this.redisOptimizer.delByTags(tags);
    this.logger.debug(`Invalidated cache for tags: ${tags.join(', ')}`);
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit: number = 50): SlowQueryInfo[] {
    return this.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * 获取查询性能统计
   */
  getQueryStats(): {
    totalQueries: number;
    averageQueryTime: number;
    slowQueriesCount: number;
    cacheHitRate: number;
    topSlowQueries: SlowQueryInfo[];
  } {
    let totalQueries = 0;
    let totalTime = 0;
    let cacheHits = 0;
    
    for (const metrics of this.queryMetrics.values()) {
      for (const metric of metrics) {
        totalQueries++;
        totalTime += metric.queryTime;
        if (metric.cacheHit) cacheHits++;
      }
    }
    
    return {
      totalQueries,
      averageQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      slowQueriesCount: this.slowQueries.length,
      cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      topSlowQueries: this.getSlowQueries(10),
    };
  }

  /**
   * 获取连接池状态
   */
  getConnectionPoolStats(): ConnectionPoolStats {
    return { ...this.connectionPoolStats };
  }

  /**
   * 优化查询建议
   */
  getOptimizationSuggestions(): Array<{
    type: 'index' | 'query' | 'cache';
    description: string;
    query?: string;
    suggestion: string;
  }> {
    const suggestions: Array<{
      type: 'index' | 'query' | 'cache';
      description: string;
      query?: string;
      suggestion: string;
    }> = [];
    
    // 分析慢查询
    const slowQueries = this.getSlowQueries(10);
    for (const slowQuery of slowQueries) {
      if (slowQuery.query.toLowerCase().includes('where') && 
          !slowQuery.query.toLowerCase().includes('index')) {
        suggestions.push({
          type: 'index',
          description: `Slow query detected (${slowQuery.executionTime}ms)`,
          query: slowQuery.query,
          suggestion: 'Consider adding an index on the WHERE clause columns',
        });
      }
      
      if (slowQuery.query.toLowerCase().includes('select *')) {
        suggestions.push({
          type: 'query',
          description: 'SELECT * detected in slow query',
          query: slowQuery.query,
          suggestion: 'Select only required columns instead of using SELECT *',
        });
      }
    }
    
    // 分析缓存命中率
    const stats = this.getQueryStats();
    if (stats.cacheHitRate < 50 && stats.totalQueries > 100) {
      suggestions.push({
        type: 'cache',
        description: `Low cache hit rate: ${stats.cacheHitRate.toFixed(2)}%`,
        suggestion: 'Consider increasing cache TTL or optimizing cache keys',
      });
    }
    
    return suggestions;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, parameters: any): string {
    const queryHash = Buffer.from(query).toString('base64').slice(0, 32);
    const paramHash = Buffer.from(JSON.stringify(parameters)).toString('base64').slice(0, 16);
    return `db:query:${queryHash}:${paramHash}`;
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetrics(
    query: string,
    queryTime: number,
    rowsAffected: number,
    cacheHit: boolean,
  ): void {
    const queryType = this.extractQueryType(query);
    const tableName = this.extractTableName(query);
    
    const metric: QueryPerformanceMetrics = {
      queryTime,
      rowsAffected,
      cacheHit,
      queryType,
      tableName,
    };
    
    const key = tableName || 'unknown';
    if (!this.queryMetrics.has(key)) {
      this.queryMetrics.set(key, []);
    }
    
    const metrics = this.queryMetrics.get(key)!;
    metrics.push(metric);
    
    // 保持最近1000条记录
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    // 更新Prometheus指标
    this.prometheusService.recordHttpRequest(
      'DATABASE',
      queryType.toLowerCase(),
      queryTime < 1000 ? 200 : 500,
      queryTime
    );
  }

  /**
   * 记录慢查询
   */
  private recordSlowQuery(query: string, parameters: any[], executionTime: number): void {
    const slowQuery: SlowQueryInfo = {
      query,
      parameters,
      executionTime,
      timestamp: new Date(),
      stackTrace: new Error().stack,
    };
    
    this.slowQueries.push(slowQuery);
    
    // 保持最近100条慢查询记录
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
    
    this.logger.warn(
      `Slow query detected (${executionTime}ms): ${query.slice(0, 200)}${query.length > 200 ? '...' : ''}`,
    );
  }

  /**
   * 提取查询类型
   */
  private extractQueryType(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const normalizedQuery = query.trim().toUpperCase();
    if (normalizedQuery.startsWith('SELECT')) return 'SELECT';
    if (normalizedQuery.startsWith('INSERT')) return 'INSERT';
    if (normalizedQuery.startsWith('UPDATE')) return 'UPDATE';
    if (normalizedQuery.startsWith('DELETE')) return 'DELETE';
    return 'SELECT';
  }

  /**
   * 提取表名
   */
  private extractTableName(query: string): string | undefined {
    const normalizedQuery = query.trim().toUpperCase();
    
    // 简单的表名提取逻辑
    let match = normalizedQuery.match(/FROM\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    if (match) return match[1].toLowerCase();
    
    match = normalizedQuery.match(/UPDATE\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    if (match) return match[1].toLowerCase();
    
    match = normalizedQuery.match(/INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    if (match) return match[1].toLowerCase();
    
    match = normalizedQuery.match(/DELETE\s+FROM\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    if (match) return match[1].toLowerCase();
    
    return undefined;
  }

  /**
   * 设置查询日志
   */
  private setupQueryLogging(): void {
    // 这里可以设置TypeORM的查询日志记录
    // 由于TypeORM的限制，我们使用自定义的查询包装器
  }

  /**
   * 开始连接池监控
   */
  private startConnectionPoolMonitoring(): void {
    setInterval(() => {
      this.updateConnectionPoolStats();
    }, 30000); // 每30秒更新一次
  }

  /**
   * 更新连接池统计
   */
  private updateConnectionPoolStats(): void {
    try {
      // 获取连接池信息（这里需要根据实际的数据库驱动来实现）
      const driver = this.dataSource.driver as any;
      
      if (driver.pool) {
        this.connectionPoolStats = {
          activeConnections: driver.pool.activeConnections || 0,
          idleConnections: driver.pool.idleConnections || 0,
          totalConnections: driver.pool.totalConnections || 0,
          maxConnections: driver.pool.maxConnections || 0,
          waitingCount: driver.pool.waitingCount || 0,
          averageQueryTime: this.getQueryStats().averageQueryTime,
        };
        
        // 更新Prometheus指标
        this.prometheusService.setDatabaseConnections(this.connectionPoolStats.totalConnections);
      }
    } catch (error) {
      this.logger.error(`Failed to update connection pool stats: ${error.message}`);
    }
  }
}