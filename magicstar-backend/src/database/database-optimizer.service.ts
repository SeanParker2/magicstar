import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

export interface QueryCacheOptions {
  ttl?: number; // 缓存时间（秒）
  key?: string; // 自定义缓存键
  tags?: string[]; // 缓存标签，用于批量清除
}

export interface QueryPerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  rowCount: number;
  queryHash: string;
  timestamp: Date;
}

export interface DatabaseStats {
  totalQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
  slowQueries: QueryPerformanceMetrics[];
  connectionPoolStats: {
    active: number;
    idle: number;
    total: number;
  };
}

@Injectable()
export class DatabaseOptimizerService {
  private readonly logger = new Logger(DatabaseOptimizerService.name);
  private readonly redis: Redis;
  private readonly cachePrefix = 'db:cache:';
  private readonly metricsPrefix = 'db:metrics:';
  private readonly slowQueryThreshold: number;
  private readonly defaultCacheTtl: number;
  private queryMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB_CACHE', 1),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.slowQueryThreshold = this.configService.get('DB_SLOW_QUERY_THRESHOLD', 1000); // 1秒
    this.defaultCacheTtl = this.configService.get('DB_CACHE_DEFAULT_TTL', 300); // 5分钟

    this.setupRedisEventListeners();
    this.startMetricsCollection();
  }

  /**
   * 执行带缓存的查询
   */
  async executeWithCache<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryCacheOptions = {},
  ): Promise<T[]> {
    const startTime = Date.now();
    const queryString = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    const queryHash = this.generateQueryHash(queryString, parameters);
    
    const cacheKey = options.key || `${this.cachePrefix}${queryHash}`;
    const ttl = options.ttl || this.defaultCacheTtl;

    try {
      // 尝试从缓存获取
      const cachedResult = await this.getCachedResult<T[]>(cacheKey);
      if (cachedResult) {
        const queryTime = Date.now() - startTime;
        this.recordQueryMetrics({
          queryTime,
          cacheHit: true,
          rowCount: cachedResult.length,
          queryHash,
          timestamp: new Date(),
        });
        
        this.logger.debug(`Cache hit for query: ${queryHash}`);
        return cachedResult;
      }

      // 执行查询
      const result = await queryBuilder.getMany();
      const queryTime = Date.now() - startTime;

      // 缓存结果
      await this.cacheResult(cacheKey, result, ttl, options.tags);

      // 记录性能指标
      this.recordQueryMetrics({
        queryTime,
        cacheHit: false,
        rowCount: result.length,
        queryHash,
        timestamp: new Date(),
      });

      if (queryTime > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected: ${queryTime}ms - ${queryString}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Query execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行带缓存的单个结果查询
   */
  async executeOneWithCache<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryCacheOptions = {},
  ): Promise<T | null> {
    const startTime = Date.now();
    const queryString = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    const queryHash = this.generateQueryHash(queryString, parameters);
    
    const cacheKey = options.key || `${this.cachePrefix}${queryHash}`;
    const ttl = options.ttl || this.defaultCacheTtl;

    try {
      // 尝试从缓存获取
      const cachedResult = await this.getCachedResult<T>(cacheKey);
      if (cachedResult !== null) {
        const queryTime = Date.now() - startTime;
        this.recordQueryMetrics({
          queryTime,
          cacheHit: true,
          rowCount: cachedResult ? 1 : 0,
          queryHash,
          timestamp: new Date(),
        });
        
        return cachedResult;
      }

      // 执行查询
      const result = await queryBuilder.getOne();
      const queryTime = Date.now() - startTime;

      // 缓存结果
      await this.cacheResult(cacheKey, result, ttl, options.tags);

      // 记录性能指标
      this.recordQueryMetrics({
        queryTime,
        cacheHit: false,
        rowCount: result ? 1 : 0,
        queryHash,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.logger.error(`Query execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern ? `${this.cachePrefix}${pattern}*` : `${this.cachePrefix}*`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} cache entries`);
      
      return keys.length;
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
      return 0;
    }
  }

  /**
   * 根据标签清除缓存
   */
  async clearCacheByTags(tags: string[]): Promise<number> {
    try {
      let totalCleared = 0;
      
      for (const tag of tags) {
        const tagKey = `${this.cachePrefix}tag:${tag}`;
        const cacheKeys = await this.redis.smembers(tagKey);
        
        if (cacheKeys.length > 0) {
          await this.redis.del(...cacheKeys);
          await this.redis.del(tagKey);
          totalCleared += cacheKeys.length;
        }
      }
      
      this.logger.log(`Cleared ${totalCleared} cache entries by tags: ${tags.join(', ')}`);
      return totalCleared;
    } catch (error) {
      this.logger.error(`Failed to clear cache by tags: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const now = Date.now();
      const oneHourAgo = now - 3600000; // 1小时前
      
      // 获取查询指标
      const allMetrics = Array.from(this.queryMetrics.values()).flat();
      const recentMetrics = allMetrics.filter(m => m.timestamp.getTime() > oneHourAgo);
      
      const totalQueries = recentMetrics.length;
      const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
      const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
      
      const totalQueryTime = recentMetrics.reduce((sum, m) => sum + m.queryTime, 0);
      const averageQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0;
      
      const slowQueries = recentMetrics
        .filter(m => m.queryTime > this.slowQueryThreshold)
        .sort((a, b) => b.queryTime - a.queryTime)
        .slice(0, 10);

      // 获取连接池状态（简化版本）
      const connectionPoolStats = {
        active: 0,
        idle: 0,
        total: 0,
      };

      return {
        totalQueries,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        averageQueryTime: Math.round(averageQueryTime * 100) / 100,
        slowQueries,
        connectionPoolStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get database stats: ${error.message}`);
      return {
        totalQueries: 0,
        cacheHitRate: 0,
        averageQueryTime: 0,
        slowQueries: [],
        connectionPoolStats: { active: 0, idle: 0, total: 0 },
      };
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance(queryString: string): Promise<{
    estimatedCost: number;
    suggestions: string[];
    indexRecommendations: string[];
  }> {
    try {
      const suggestions: string[] = [];
      const indexRecommendations: string[] = [];
      
      // 简单的查询分析
      if (queryString.includes('SELECT *')) {
        suggestions.push('避免使用 SELECT *，只选择需要的字段');
      }
      
      if (queryString.includes('LIKE %')) {
        suggestions.push('避免在 LIKE 查询中使用前导通配符');
        indexRecommendations.push('考虑使用全文索引');
      }
      
      if (queryString.includes('ORDER BY') && !queryString.includes('LIMIT')) {
        suggestions.push('在 ORDER BY 查询中添加 LIMIT 以提高性能');
      }
      
      if (queryString.includes('JOIN') && queryString.split('JOIN').length > 3) {
        suggestions.push('考虑减少 JOIN 的数量或使用子查询');
      }

      return {
        estimatedCost: 0, // 简化处理
        suggestions,
        indexRecommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze query: ${error.message}`);
      return {
        estimatedCost: 0,
        suggestions: [],
        indexRecommendations: [],
      };
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(queries: Array<{ queryBuilder: SelectQueryBuilder<any>; options?: QueryCacheOptions }>): Promise<void> {
    this.logger.log(`Starting cache warmup for ${queries.length} queries`);
    
    for (const { queryBuilder, options } of queries) {
      try {
        await this.executeWithCache(queryBuilder, options);
      } catch (error) {
        this.logger.error(`Failed to warmup cache for query: ${error.message}`);
      }
    }
    
    this.logger.log('Cache warmup completed');
  }

  /**
   * 生成查询哈希
   */
  private generateQueryHash(queryString: string, parameters: any): string {
    const content = queryString + JSON.stringify(parameters);
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * 获取缓存结果
   */
  private async getCachedResult<T>(cacheKey: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached result: ${error.message}`);
      return null;
    }
  }

  /**
   * 缓存结果
   */
  private async cacheResult(cacheKey: string, result: any, ttl: number, tags?: string[]): Promise<void> {
    try {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
      
      // 如果有标签，建立标签索引
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          const tagKey = `${this.cachePrefix}tag:${tag}`;
          await this.redis.sadd(tagKey, cacheKey);
          await this.redis.expire(tagKey, ttl);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cache result: ${error.message}`);
    }
  }

  /**
   * 记录查询性能指标
   */
  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    const { queryHash } = metrics;
    
    if (!this.queryMetrics.has(queryHash)) {
      this.queryMetrics.set(queryHash, []);
    }
    
    const queryMetricsList = this.queryMetrics.get(queryHash)!;
    queryMetricsList.push(metrics);
    
    // 只保留最近100条记录
    if (queryMetricsList.length > 100) {
      queryMetricsList.splice(0, queryMetricsList.length - 100);
    }
  }

  /**
   * 设置Redis事件监听
   */
  private setupRedisEventListeners(): void {
    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for database cache');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  /**
   * 启动指标收集
   */
  private startMetricsCollection(): void {
    // 每5分钟清理旧的指标数据
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      
      for (const [queryHash, metrics] of this.queryMetrics.entries()) {
        const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > fiveMinutesAgo);
        
        if (filteredMetrics.length === 0) {
          this.queryMetrics.delete(queryHash);
        } else {
          this.queryMetrics.set(queryHash, filteredMetrics);
        }
      }
    }, 300000); // 5分钟
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    database: boolean;
    redis: boolean;
    connectionPool: boolean;
  }> {
    const health = {
      database: false,
      redis: false,
      connectionPool: false,
    };

    try {
      // 检查数据库连接
      await this.dataSource.query('SELECT 1');
      health.database = true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
    }

    try {
      // 检查Redis连接
      await this.redis.ping();
      health.redis = true;
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
    }

    try {
      // 检查连接池状态
      health.connectionPool = this.dataSource.isInitialized;
    } catch (error) {
      this.logger.error(`Connection pool health check failed: ${error.message}`);
    }

    return health;
  }
}