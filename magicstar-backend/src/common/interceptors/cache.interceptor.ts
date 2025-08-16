import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisOptimizerService } from '../services/redis-optimizer.service';
import { CACHE_KEY, CACHE_TTL_KEY, CACHE_TAGS_KEY } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisOptimizer: RedisOptimizerService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    const cacheTags = this.reflector.get<string[]>(CACHE_TAGS_KEY, context.getHandler());

    // 如果没有缓存配置，直接执行原方法
    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const finalCacheKey = this.generateCacheKey(cacheKey, request);

    try {
      // 尝试从缓存获取
      const cachedResult = await this.redisOptimizer.get(finalCacheKey);
      if (cachedResult !== null) {
        this.logger.debug(`Cache hit for key: ${finalCacheKey}`);
        return of(cachedResult);
      }

      // 缓存未命中，执行原方法并缓存结果
      return next.handle().pipe(
        tap(async (result) => {
          if (result !== null && result !== undefined) {
            await this.redisOptimizer.set(finalCacheKey, result, {
              ttl: cacheTtl || 300,
              tags: cacheTags,
            });
            this.logger.debug(`Cached result for key: ${finalCacheKey}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error for key ${finalCacheKey}: ${error.message}`);
      // 缓存出错时，直接执行原方法
      return next.handle();
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(baseKey: string, request: any): string {
    const { method, url, query, params, body, user } = request;
    
    // 构建缓存键的组成部分
    const keyParts = [baseKey];
    
    // 添加用户ID（如果存在）
    if (user?.id) {
      keyParts.push(`user:${user.id}`);
    }
    
    // 添加路径参数
    if (params && Object.keys(params).length > 0) {
      const paramStr = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      keyParts.push(`params:${paramStr}`);
    }
    
    // 添加查询参数（仅对GET请求）
    if (method === 'GET' && query && Object.keys(query).length > 0) {
      const queryStr = Object.entries(query)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      keyParts.push(`query:${queryStr}`);
    }
    
    // 对于POST/PUT请求，可以考虑添加body的哈希
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      const bodyHash = this.hashObject(body);
      keyParts.push(`body:${bodyHash}`);
    }
    
    return keyParts.join(':');
  }

  /**
   * 对象哈希
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
}