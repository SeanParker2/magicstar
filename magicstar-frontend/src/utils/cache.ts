import Taro from '@tarojs/taro'

// 缓存配置接口
interface CacheConfig {
  // 缓存时间（毫秒）
  ttl: number
  // 最大缓存数量
  maxSize?: number
  // 是否启用压缩
  compress?: boolean
  // 缓存策略
  strategy?: 'LRU' | 'LFU' | 'FIFO'
}

// 缓存项接口
interface CacheItem<T = any> {
  data: T | string
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

// 缓存统计信息
interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

// 内存缓存管理器
export class MemoryCache {
  private cache = new Map<string, CacheItem>()
  private config: Required<CacheConfig>
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 }

  constructor(config: CacheConfig) {
    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize || 100,
      compress: config.compress || false,
      strategy: config.strategy || 'LRU'
    }
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const itemTtl = ttl || this.config.ttl
    
    // 检查是否需要清理空间
    if (this.cache.size >= this.config.maxSize) {
      this.evict()
    }

    const item: CacheItem<T> = {
      data: this.config.compress ? this.compress(data) : data,
      timestamp: now,
      ttl: itemTtl,
      accessCount: 0,
      lastAccess: now
    }

    this.cache.set(key, item)
    this.updateStats()
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      this.updateStats()
      return null
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.stats.misses++
      this.updateStats()
      return null
    }

    // 更新访问信息
    item.accessCount++
    item.lastAccess = Date.now()
    
    this.stats.hits++
    this.updateStats()

    return this.config.compress ? this.decompress(item.data as string) : (item.data as T)
  }

  // 删除缓存
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    this.updateStats()
    return result
  }

  // 清空缓存
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 }
  }

  // 检查是否存在
  has(key: string): boolean {
    const item = this.cache.get(key)
    return item ? !this.isExpired(item) : false
  }

  // 获取所有键
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  // 获取缓存大小
  size(): number {
    return this.cache.size
  }

  // 获取统计信息
  getStats(): CacheStats {
    return { ...this.stats }
  }

  // 清理过期缓存
  cleanup(): void {
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
    this.updateStats()
  }

  // 检查是否过期
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  // 缓存淘汰策略
  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.config.strategy) {
      case 'LRU': // 最近最少使用
        keyToEvict = this.findLRUKey()
        break
      case 'LFU': // 最少使用频率
        keyToEvict = this.findLFUKey()
        break
      case 'FIFO': // 先进先出
        keyToEvict = this.findFIFOKey()
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
    }
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess
        oldestKey = key
      }
    }

    return oldestKey
  }

  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null
    let leastCount = Infinity

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < leastCount) {
        leastCount = item.accessCount
        leastUsedKey = key
      }
    }

    return leastUsedKey
  }

  private findFIFOKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  private updateStats(): void {
    this.stats.size = this.cache.size
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0
  }

  private compress<T>(data: T): string {
    // 简单的JSON压缩（实际项目中可以使用更高效的压缩算法）
    return JSON.stringify(data)
  }

  private decompress<T>(data: string): T {
    return JSON.parse(data)
  }
}

// 持久化缓存管理器
export class PersistentCache {
  private prefix: string
  private config: Required<CacheConfig>

  constructor(prefix: string, config: CacheConfig) {
    this.prefix = prefix
    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize || 50,
      compress: config.compress || true,
      strategy: config.strategy || 'LRU'
    }
  }

  // 设置缓存
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const now = Date.now()
      const itemTtl = ttl || this.config.ttl
      
      const item: CacheItem<T> = {
        data: this.config.compress ? JSON.stringify(data) : data,
        timestamp: now,
        ttl: itemTtl,
        accessCount: 0,
        lastAccess: now
      }

      const storageKey = this.getStorageKey(key)
      await Taro.setStorage({ key: storageKey, data: item })
      
      // 检查存储大小限制
      await this.checkStorageLimit()
    } catch (error) {
      console.error('Failed to set persistent cache:', error)
    }
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getStorageKey(key)
      const result = await Taro.getStorage({ key: storageKey })
      const item: CacheItem<T> = result.data

      if (!item) {
        return null
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        await this.delete(key)
        return null
      }

      // 更新访问信息
      item.accessCount++
      item.lastAccess = Date.now()
      await Taro.setStorage({ key: storageKey, data: item })

      return this.config.compress ? JSON.parse(item.data as string) : (item.data as T)
    } catch (error) {
      return null
    }
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key)
      await Taro.removeStorage({ key: storageKey })
    } catch (error) {
      console.error('Failed to delete persistent cache:', error)
    }
  }

  // 清空缓存
  async clear(): Promise<void> {
    try {
      const info = await Taro.getStorageInfo() as any
      const keysToRemove = (info.keys || []).filter((key: string) => key.startsWith(this.prefix))
      
      await Promise.all(
        keysToRemove.map(key => Taro.removeStorage({ key }))
      )
    } catch (error) {
      console.error('Failed to clear persistent cache:', error)
    }
  }

  // 检查是否存在
  async has(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key)
      const result = await Taro.getStorage({ key: storageKey })
      const item: CacheItem = result.data
      return item ? !this.isExpired(item) : false
    } catch (error) {
      return false
    }
  }

  // 获取所有键
  async keys(): Promise<string[]> {
    try {
      const info = await Taro.getStorageInfo()
      const storageInfo = info as any
      return (storageInfo.keys || [])
        .filter((key: string) => key.startsWith(this.prefix))
        .map((key: string) => key.replace(this.prefix, ''))
    } catch (error) {
      return []
    }
  }

  // 清理过期缓存
  async cleanup(): Promise<void> {
    try {
      const info = await Taro.getStorageInfo()
      const storageInfo = info as any
      const keysToCheck = (storageInfo.keys || [])
        .filter((key: string) => key.startsWith(this.prefix))
      
      const cleanupPromises = keysToCheck.map(async (storageKey: string) => {
        try {
          const result = await Taro.getStorage({ key: storageKey })
          const item: CacheItem = result.data
          if (this.isExpired(item)) {
            await Taro.removeStorage({ key: storageKey })
          }
        } catch (error) {
          // 如果获取失败，删除该键
          await Taro.removeStorage({ key: storageKey })
        }
      })
      
      await Promise.all(cleanupPromises)
    } catch (error) {
      console.error('Failed to cleanup persistent cache:', error)
    }
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  private async checkStorageLimit(): Promise<void> {
    try {
      const keys = await this.keys()
      if (keys.length > this.config.maxSize) {
        // 获取所有缓存项并按策略排序
        const items = await Promise.all(
          keys.map(async (key) => {
            const storageKey = this.getStorageKey(key)
            const result = await Taro.getStorage({ key: storageKey })
            return { key, item: result.data as CacheItem }
          })
        )

        // 根据策略排序
        items.sort((a, b) => {
          switch (this.config.strategy) {
            case 'LRU':
              return a.item.lastAccess - b.item.lastAccess
            case 'LFU':
              return a.item.accessCount - b.item.accessCount
            case 'FIFO':
            default:
              return a.item.timestamp - b.item.timestamp
          }
        })

        // 删除最旧的项
        const itemsToDelete = items.slice(0, items.length - this.config.maxSize)
        await Promise.all(
          itemsToDelete.map(({ key }) => this.delete(key))
        )
      }
    } catch (error) {
      console.error('Failed to check storage limit:', error)
    }
  }
}

// 缓存管理器工厂
export class CacheManager {
  private static memoryCache: MemoryCache
  private static persistentCache: PersistentCache

  static initMemoryCache(config: CacheConfig): MemoryCache {
    if (!this.memoryCache) {
      this.memoryCache = new MemoryCache(config)
      
      // 定期清理过期缓存
      setInterval(() => {
        this.memoryCache.cleanup()
      }, 60000) // 每分钟清理一次
    }
    return this.memoryCache
  }

  static initPersistentCache(prefix: string, config: CacheConfig): PersistentCache {
    if (!this.persistentCache) {
      this.persistentCache = new PersistentCache(prefix, config)
    }
    return this.persistentCache
  }

  static getMemoryCache(): MemoryCache {
    if (!this.memoryCache) {
      throw new Error('Memory cache not initialized')
    }
    return this.memoryCache
  }

  static getPersistentCache(): PersistentCache {
    if (!this.persistentCache) {
      throw new Error('Persistent cache not initialized')
    }
    return this.persistentCache
  }
}

// 缓存装饰器
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
    useMemory?: boolean
    usePersistent?: boolean
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    ttl = 5 * 60 * 1000, // 5分钟
    useMemory = true,
    usePersistent = false
  } = options

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    
    // 先尝试内存缓存
    if (useMemory) {
      try {
        const memoryCache = CacheManager.getMemoryCache()
        const cached = memoryCache.get(key)
        if (cached !== null) {
          return cached
        }
      } catch (error) {
        // 内存缓存未初始化，继续
      }
    }

    // 再尝试持久化缓存
    if (usePersistent) {
      try {
        const persistentCache = CacheManager.getPersistentCache()
        const cached = await persistentCache.get(key)
        if (cached !== null) {
          // 同时更新内存缓存
          if (useMemory) {
            try {
              const memoryCache = CacheManager.getMemoryCache()
              memoryCache.set(key, cached, ttl)
            } catch (error) {
              // 忽略内存缓存错误
            }
          }
          return cached
        }
      } catch (error) {
        // 持久化缓存未初始化，继续
      }
    }

    // 执行原函数
    const result = await fn(...args)

    // 缓存结果
    if (useMemory) {
      try {
        const memoryCache = CacheManager.getMemoryCache()
        memoryCache.set(key, result, ttl)
      } catch (error) {
        // 忽略缓存错误
      }
    }

    if (usePersistent) {
      try {
        const persistentCache = CacheManager.getPersistentCache()
        await persistentCache.set(key, result, ttl)
      } catch (error) {
        // 忽略缓存错误
      }
    }

    return result
  }) as T
}

// 导出默认配置
export const defaultCacheConfig: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 100,
  compress: false,
  strategy: 'LRU'
}

export const defaultPersistentConfig: CacheConfig = {
  ttl: 24 * 60 * 60 * 1000, // 24小时
  maxSize: 50,
  compress: true,
  strategy: 'LRU'
}