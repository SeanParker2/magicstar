import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_TAGS_KEY = 'cache_tags';

export interface CacheDecoratorOptions {
  ttl?: number; // 缓存时间（秒）
  key?: string; // 自定义缓存键
  tags?: string[]; // 缓存标签
  enabled?: boolean; // 是否启用缓存
}

/**
 * 缓存装饰器
 * @param keyOrOptions 缓存键或选项
 * @param ttl 缓存时间（秒），默认300秒
 * @param tags 缓存标签
 */
export function Cache(
  keyOrOptions?: string | CacheDecoratorOptions,
  ttl: number = 300,
  tags: string[] = [],
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    let options: CacheDecoratorOptions;
    
    if (typeof keyOrOptions === 'string') {
      options = {
        key: keyOrOptions,
        ttl,
        tags,
        enabled: true,
      };
    } else {
      options = {
        ttl: 300,
        enabled: true,
        ...keyOrOptions,
      };
    }
    
    SetMetadata(CACHE_KEY, options.key || `${target.constructor.name}_${propertyName}`)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL_KEY, options.ttl)(target, propertyName, descriptor);
    SetMetadata(CACHE_TAGS_KEY, options.tags)(target, propertyName, descriptor);
    
    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 * @param tags 要失效的缓存标签
 */
export function CacheEvict(tags: string[]) {
  return SetMetadata('cache_evict', tags);
}

/**
 * 缓存更新装饰器
 * @param key 缓存键
 * @param ttl 缓存时间
 */
export function CachePut(key: string, ttl: number = 300) {
  return SetMetadata('cache_put', { key, ttl });
}