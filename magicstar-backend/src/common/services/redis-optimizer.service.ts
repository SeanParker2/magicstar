import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, Cluster } from 'ioredis';
import { EventEmitter } from 'events';

export interface CacheOptions {
  ttl?: number; // 过期时间（秒）
  tags?: string[]; // 缓存标签
  compress?: boolean; // 是否压缩
  serialize?: boolean; // 是否序列化
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  avgTtl: number;
}

export interface CachePattern {
  pattern: string;
  ttl: number;
  tags?: string[];
}

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  TTL = 'ttl',
  FIFO = 'fifo',
}

@Injectable()
export class RedisOptimizerService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisOptimizerService.name);
  private redis: Redis | Cluster;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;
  private readonly compressionThreshold: number;
  private stats: CacheStats;
  private patterns: Map<string, CachePattern> = new Map();
  private healthCheckInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    super();
    this.keyPrefix = this.configService.get('REDIS_KEY_PREFIX', 'app:');
    this.defaultTtl = this.configService.get('REDIS_DEFAULT_TTL', 3600);
    this.compressionThreshold = this.configService.get('REDIS_COMPRESSION_THRESHOLD', 1024);
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgTtl: 0,
    };
  }

  async onModuleInit() {
    await this.initializeRedis();
    this.startHealthCheck();
    this.loadCachePatterns();
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * 获取缓存值
   */
  async get<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        this.emit('cache:miss', { key, fullKey });
        return defaultValue || null;
      }

      this.stats.hits++;
      this.emit('cache:hit', { key, fullKey });
      
      return this.deserializeValue(value);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}: ${error.message}`);
      return defaultValue || null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const serializedValue = this.serializeValue(value, options.serialize !== false);
      const ttl = options.ttl || this.defaultTtl;
      
      // 设置缓存
      const result = await this.redis.setex(fullKey, ttl, serializedValue);
      
      if (result === 'OK') {
        this.stats.sets++;
        
        // 处理标签
        if (options.tags && options.tags.length > 0) {
          await this.addTagsToKey(fullKey, options.tags, ttl);
        }
        
        this.emit('cache:set', { key, fullKey, ttl, tags: options.tags });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      const fullKeys = keys.map(k => this.buildKey(k));
      
      const result = await this.redis.del(...fullKeys);
      this.stats.deletes += result;
      
      this.emit('cache:delete', { keys, fullKeys, count: result });
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete cache keys: ${error.message}`);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check key existence ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}: ${error.message}`);
      return -1;
    }
  }

  /**
   * 批量获取
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(k => this.buildKey(k));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        return this.deserializeValue(value);
      });
    } catch (error) {
      this.logger.error(`Failed to get multiple keys: ${error.message}`);
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置
   */
  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      const ttl = options.ttl || this.defaultTtl;
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key);
        const serializedValue = this.serializeValue(value, options.serialize !== false);
        pipeline.setex(fullKey, ttl, serializedValue);
      }
      
      const results = await pipeline.exec();
      const success = results?.every(([error, result]) => error === null && result === 'OK') || false;
      
      if (success) {
        this.stats.sets += Object.keys(keyValuePairs).length;
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Failed to set multiple keys: ${error.message}`);
      return false;
    }
  }

  /**
   * 根据模式删除键
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      
      this.emit('cache:pattern_delete', { pattern, fullPattern, count: result });
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete keys by pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * 根据标签删除缓存
   */
  async delByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag);
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          
          // 删除标签集合
          await this.redis.del(tagKey);
        }
      }
      
      this.stats.deletes += totalDeleted;
      this.emit('cache:tag_delete', { tags, count: totalDeleted });
      
      return totalDeleted;
    } catch (error) {
      this.logger.error(`Failed to delete keys by tags: ${error.message}`);
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<boolean> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
      }
      
      this.emit('cache:flush', { count: keys.length });
      return true;
    } catch (error) {
      this.logger.error(`Failed to flush cache: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    try {
      // 更新实时统计
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      this.stats.memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      this.stats.keyCount = keys.length;
      
      // 计算命中率
      const totalRequests = this.stats.hits + this.stats.misses;
      this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
      
      return { ...this.stats };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`);
      return { ...this.stats };
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: this.stats.memoryUsage,
      keyCount: this.stats.keyCount,
      avgTtl: 0,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    memoryUsage: number;
    keyCount: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        latency,
        memoryUsage: stats.memoryUsage,
        keyCount: stats.keyCount,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        memoryUsage: 0,
        keyCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * 注册缓存模式
   */
  registerPattern(name: string, pattern: CachePattern): void {
    this.patterns.set(name, pattern);
    this.logger.debug(`Registered cache pattern: ${name}`);
  }

  /**
   * 应用缓存模式
   */
  async applyPattern(patternName: string, key: string, value: any): Promise<boolean> {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      this.logger.warn(`Cache pattern not found: ${patternName}`);
      return false;
    }
    
    return this.set(key, value, {
      ttl: pattern.ttl,
      tags: pattern.tags,
    });
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    };

    // 检查是否使用集群模式
    const clusterNodes = this.configService.get('REDIS_CLUSTER_NODES');
    
    if (clusterNodes) {
      const nodes = clusterNodes.split(',').map((node: string) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      });
      
      this.redis = new Cluster(nodes, {
        redisOptions: redisConfig,
      });
    } else {
      this.redis = new Redis(redisConfig);
    }

    this.setupEventListeners();
    
    try {
      await this.redis.connect();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
      this.emit('redis:connect');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis ready');
      this.emit('redis:ready');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
      this.emit('redis:error', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.emit('redis:close');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting');
      this.emit('redis:reconnecting');
    });
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    const interval = this.configService.get('REDIS_HEALTH_CHECK_INTERVAL', 30000);
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      
      if (health.status === 'unhealthy') {
        this.logger.error('Redis health check failed', health.error);
        this.emit('redis:unhealthy', health);
      }
    }, interval);
  }

  /**
   * 加载缓存模式
   */
  private loadCachePatterns(): void {
    // 注册一些默认的缓存模式
    this.registerPattern('user', {
      pattern: 'user:*',
      ttl: 3600, // 1小时
      tags: ['user'],
    });
    
    this.registerPattern('session', {
      pattern: 'session:*',
      ttl: 1800, // 30分钟
      tags: ['session'],
    });
    
    this.registerPattern('api', {
      pattern: 'api:*',
      ttl: 300, // 5分钟
      tags: ['api'],
    });
  }

  /**
   * 构建完整的键名
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * 构建标签键名
   */
  private buildTagKey(tag: string): string {
    return `${this.keyPrefix}tag:${tag}`;
  }

  /**
   * 序列化值
   */
  private serializeValue(value: any, serialize: boolean = true): string {
    if (!serialize || typeof value === 'string') {
      return value;
    }
    
    const serialized = JSON.stringify(value);
    
    // 如果值较大且启用压缩，可以在这里添加压缩逻辑
    if (serialized.length > this.compressionThreshold) {
      // TODO: 添加压缩逻辑
    }
    
    return serialized;
  }

  /**
   * 反序列化值
   */
  private deserializeValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * 为键添加标签
   */
  private async addTagsToKey(key: string, tags: string[], ttl: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = this.buildTagKey(tag);
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, ttl);
    }
    
    await pipeline.exec();
  }
}