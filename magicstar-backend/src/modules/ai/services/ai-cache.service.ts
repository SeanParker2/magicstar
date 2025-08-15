import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { AiRequestType } from '../entities/ai-request.entity';
import { AiResponse } from '../entities/ai-response.entity';

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly redis: Redis;
  private readonly keyPrefix = 'ai:cache:';
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_AI_CACHE_DB', 3),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.defaultTtl = this.configService.get('AI_CACHE_DEFAULT_TTL', 3600); // 1小时

    // 连接事件监听
    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for AI cache');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  /**
   * 生成缓存键
   */
  async generateCacheKey(
    requestType: AiRequestType,
    inputData: any,
    promptTemplateId?: string,
    modelConfig?: any,
  ): Promise<string> {
    try {
      // 创建用于生成hash的数据对象
      const cacheData = {
        requestType,
        inputData: this.normalizeData(inputData),
        promptTemplateId: promptTemplateId || 'default',
        modelConfig: this.normalizeData(modelConfig || {}),
      };

      // 生成数据的hash
      const dataString = JSON.stringify(cacheData);
      const hash = createHash('sha256').update(dataString).digest('hex');
      
      // 生成缓存键
      const cacheKey = `${this.keyPrefix}${requestType}:${hash}`;
      
      this.logger.debug(`Generated cache key: ${cacheKey}`);
      
      return cacheKey;
    } catch (error) {
      this.logger.error(`Failed to generate cache key: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取缓存的响应
   */
  async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        this.logger.debug(`Cache miss for key: ${cacheKey}`);
        return null;
      }

      const response = JSON.parse(cached);
      
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      
      // 记录缓存命中统计
      await this.incrementCacheStats('hits');
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to get cached response: ${error.message}`);
      await this.incrementCacheStats('errors');
      return null;
    }
  }

  /**
   * 缓存响应
   */
  async cacheResponse(
    cacheKey: string,
    response: AiResponse,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheData = {
        modelProvider: response.modelProvider,
        modelName: response.modelName,
        modelVersion: response.modelVersion,
        responseText: response.responseText,
        formattedResponse: response.formattedResponse,
        tokenUsage: response.tokenUsage,
        quality: response.quality,
        qualityScore: response.qualityScore,
        cachedAt: new Date().toISOString(),
      };

      const cacheTtl = ttl || this.defaultTtl;
      
      await this.redis.setex(
        cacheKey,
        cacheTtl,
        JSON.stringify(cacheData),
      );

      this.logger.debug(`Cached response with key: ${cacheKey}, TTL: ${cacheTtl}s`);
      
      // 记录缓存存储统计
      await this.incrementCacheStats('stores');
      
      // 设置缓存元数据
      await this.setCacheMetadata(cacheKey, {
        size: JSON.stringify(cacheData).length,
        ttl: cacheTtl,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to cache response: ${error.message}`);
      await this.incrementCacheStats('errors');
    }
  }

  /**
   * 删除缓存
   */
  async deleteCachedResponse(cacheKey: string): Promise<void> {
    try {
      await this.redis.del(cacheKey);
      await this.redis.del(`${cacheKey}:meta`);
      
      this.logger.debug(`Deleted cache for key: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete cached response: ${error.message}`);
    }
  }

  /**
   * 批量删除缓存
   */
  async deleteCacheByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach(key => {
        pipeline.del(key);
        pipeline.del(`${key}:meta`);
      });
      
      await pipeline.exec();
      
      this.logger.log(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
      
      return keys.length;
    } catch (error) {
      this.logger.error(`Failed to delete cache by pattern: ${error.message}`);
      return 0;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    stores: number;
    errors: number;
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const [hits, misses, stores, errors] = await Promise.all([
        this.redis.get(`${this.keyPrefix}stats:hits`).then(v => parseInt(v || '0')),
        this.redis.get(`${this.keyPrefix}stats:misses`).then(v => parseInt(v || '0')),
        this.redis.get(`${this.keyPrefix}stats:stores`).then(v => parseInt(v || '0')),
        this.redis.get(`${this.keyPrefix}stats:errors`).then(v => parseInt(v || '0')),
      ]);

      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;

      // 获取缓存键数量
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const totalKeys = keys.filter(key => !key.includes(':stats:') && !key.includes(':meta')).length;

      // 获取内存使用情况
      const memoryUsage = '0 B'; // 简化处理，避免Redis版本兼容问题

      return {
        hits,
        misses,
        stores,
        errors,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`);
      return {
        hits: 0,
        misses: 0,
        stores: 0,
        errors: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: '0 B',
      };
    }
  }

  /**
   * 清空所有AI缓存
   */
  async clearAllCache(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      
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
   * 检查缓存连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error(`Cache connection check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取缓存键的TTL
   */
  async getCacheTtl(cacheKey: string): Promise<number> {
    try {
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      this.logger.error(`Failed to get cache TTL: ${error.message}`);
      return -1;
    }
  }

  /**
   * 延长缓存过期时间
   */
  async extendCacheTtl(cacheKey: string, additionalTtl: number): Promise<void> {
    try {
      await this.redis.expire(cacheKey, additionalTtl);
      
      this.logger.debug(`Extended TTL for cache key: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to extend cache TTL: ${error.message}`);
    }
  }

  /**
   * 私有方法：标准化数据（用于生成一致的hash）
   */
  private normalizeData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeData(item)).sort();
    }

    if (typeof data === 'object') {
      const normalized: any = {};
      Object.keys(data)
        .sort()
        .forEach(key => {
          normalized[key] = this.normalizeData(data[key]);
        });
      return normalized;
    }

    return data;
  }

  /**
   * 私有方法：增加缓存统计
   */
  private async incrementCacheStats(type: 'hits' | 'misses' | 'stores' | 'errors'): Promise<void> {
    try {
      await this.redis.incr(`${this.keyPrefix}stats:${type}`);
    } catch (error) {
      // 忽略统计错误，不影响主要功能
    }
  }

  /**
   * 私有方法：设置缓存元数据
   */
  private async setCacheMetadata(cacheKey: string, metadata: any): Promise<void> {
    try {
      await this.redis.setex(
        `${cacheKey}:meta`,
        this.defaultTtl,
        JSON.stringify(metadata),
      );
    } catch (error) {
      // 忽略元数据错误
    }
  }

  /**
   * 私有方法：格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 预热缓存（可选功能）
   */
  async warmupCache(requests: Array<{
    requestType: AiRequestType;
    inputData: any;
    promptTemplateId?: string;
  }>): Promise<void> {
    this.logger.log(`Starting cache warmup for ${requests.length} requests`);
    
    for (const request of requests) {
      try {
        const cacheKey = await this.generateCacheKey(
          request.requestType,
          request.inputData,
          request.promptTemplateId,
        );
        
        // 检查是否已缓存
        const exists = await this.redis.exists(cacheKey);
        if (!exists) {
          // 这里可以触发实际的AI请求来预热缓存
          this.logger.debug(`Cache key ${cacheKey} not found, skipping warmup`);
        }
      } catch (error) {
        this.logger.error(`Failed to warmup cache for request: ${error.message}`);
      }
    }
    
    this.logger.log('Cache warmup completed');
  }
}