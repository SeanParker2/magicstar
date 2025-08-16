import Taro from '@tarojs/taro';
import { CacheManager } from './cache';

// 请求配置接口
export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  header?: Record<string, string>;
  timeout?: number;
  // 缓存配置
  cache?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };
  // 重试配置
  retry?: {
    times: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  };
  // 并发控制
  concurrent?: {
    key: string;
    limit?: number;
  };
}

// 请求响应接口
export interface RequestResponse<T = any> {
  data: T;
  statusCode: number;
  header: Record<string, string>;
  cookies?: string[];
}

// 请求错误接口
interface RequestError {
  errMsg: string;
  statusCode?: number;
  data?: any;
}

// 并发控制器
class ConcurrentController {
  private queues = new Map<string, Array<() => Promise<any>>>();
  private running = new Map<string, number>();
  private limits = new Map<string, number>();

  // 添加请求到队列
  async execute<T>(key: string, limit: number, requestFn: () => Promise<T>): Promise<T> {
    this.limits.set(key, limit);

    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.finishTask(key);
        }
      };

      if (this.canExecute(key)) {
        this.startTask(key);
        task();
      } else {
        this.addToQueue(key, task);
      }
    });
  }

  private canExecute(key: string): boolean {
    const running = this.running.get(key) || 0;
    const limit = this.limits.get(key) || 1;
    return running < limit;
  }

  private startTask(key: string): void {
    const running = this.running.get(key) || 0;
    this.running.set(key, running + 1);
  }

  private finishTask(key: string): void {
    const running = this.running.get(key) || 0;
    this.running.set(key, Math.max(0, running - 1));
    this.processQueue(key);
  }

  private addToQueue(key: string, task: () => Promise<any>): void {
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }
    this.queues.get(key)!.push(task);
  }

  private processQueue(key: string): void {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    if (this.canExecute(key)) {
      const task = queue.shift();
      if (task) {
        this.startTask(key);
        task();
      }
    }
  }

  // 获取队列状态
  getStatus(key: string): { running: number; queued: number } {
    return {
      running: this.running.get(key) || 0,
      queued: this.queues.get(key)?.length || 0,
    };
  }

  // 清空队列
  clear(key?: string): void {
    if (key) {
      this.queues.delete(key);
      this.running.delete(key);
      this.limits.delete(key);
    } else {
      this.queues.clear();
      this.running.clear();
      this.limits.clear();
    }
  }
}

// 请求优化器
export class RequestOptimizer {
  private static instance: RequestOptimizer;
  private concurrentController = new ConcurrentController();
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = [];
  private responseInterceptors: Array<
    (response: RequestResponse) => RequestResponse | Promise<RequestResponse>
  > = [];
  private errorInterceptors: Array<(error: RequestError) => RequestError | Promise<RequestError>> =
    [];

  private constructor() {
    this.initializeCache();
  }

  static getInstance(): RequestOptimizer {
    if (!RequestOptimizer.instance) {
      RequestOptimizer.instance = new RequestOptimizer();
    }
    return RequestOptimizer.instance;
  }

  // 初始化缓存
  private initializeCache(): void {
    try {
      CacheManager.initMemoryCache({
        ttl: 5 * 60 * 1000, // 5分钟
        maxSize: 100,
        strategy: 'LRU',
      });
    } catch (error) {
      console.warn('Failed to initialize request cache:', error);
    }
  }

  // 发送请求
  async request<T = any>(config: RequestConfig): Promise<RequestResponse<T>> {
    // 应用请求拦截器
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    // 检查缓存
    if (finalConfig.cache?.enabled && finalConfig.method === 'GET') {
      const cached = await this.getFromCache<T>(finalConfig);
      if (cached) {
        return cached;
      }
    }

    // 执行请求（带并发控制）
    const executeRequest = async (): Promise<RequestResponse<T>> => {
      if (finalConfig.concurrent) {
        return this.concurrentController.execute(
          finalConfig.concurrent.key,
          finalConfig.concurrent.limit || 3,
          () => this.executeRequest<T>(finalConfig)
        );
      } else {
        return this.executeRequest<T>(finalConfig);
      }
    };

    try {
      const response = await executeRequest();

      // 缓存响应
      if (finalConfig.cache?.enabled && finalConfig.method === 'GET') {
        await this.setToCache(finalConfig, response);
      }

      // 应用响应拦截器
      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = await interceptor(finalResponse);
      }

      return finalResponse;
    } catch (error) {
      // 应用错误拦截器
      let finalError = error as RequestError;
      for (const interceptor of this.errorInterceptors) {
        finalError = await interceptor(finalError);
      }
      throw finalError;
    }
  }

  // 执行实际请求
  private async executeRequest<T>(config: RequestConfig): Promise<RequestResponse<T>> {
    const { url, method = 'GET', data, header, timeout = 10000, retry } = config;

    const requestFn = async (): Promise<RequestResponse<T>> => {
      const result = await Taro.request({
        url,
        method,
        data,
        header,
        timeout,
      });

      return {
        data: result.data,
        statusCode: result.statusCode,
        header: result.header,
        cookies: result.cookies,
      };
    };

    if (retry && retry.times > 0) {
      return this.executeWithRetry(requestFn, retry);
    } else {
      return requestFn();
    }
  }

  // 带重试的请求执行
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retryConfig: NonNullable<RequestConfig['retry']>
  ): Promise<T> {
    const { times, delay = 1000, backoff = 'exponential' } = retryConfig;
    let lastError: any;

    for (let attempt = 0; attempt <= times; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        if (attempt === times) {
          throw error;
        }

        // 计算延迟时间
        let waitTime = delay;
        if (backoff === 'exponential') {
          waitTime = delay * Math.pow(2, attempt);
        } else if (backoff === 'linear') {
          waitTime = delay * (attempt + 1);
        }

        await this.delay(waitTime);
      }
    }

    throw lastError;
  }

  // 从缓存获取
  private async getFromCache<T>(config: RequestConfig): Promise<RequestResponse<T> | null> {
    try {
      const cacheKey = this.generateCacheKey(config);
      const memoryCache = CacheManager.getMemoryCache();
      return memoryCache.get<RequestResponse<T>>(cacheKey);
    } catch (error) {
      return null;
    }
  }

  // 设置缓存
  private async setToCache<T>(config: RequestConfig, response: RequestResponse<T>): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(config);
      const ttl = config.cache?.ttl || 5 * 60 * 1000;
      const memoryCache = CacheManager.getMemoryCache();
      memoryCache.set(cacheKey, response, ttl);
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  // 生成缓存键
  private generateCacheKey(config: RequestConfig): string {
    if (config.cache?.key) {
      return config.cache.key;
    }

    const { url, method = 'GET', data } = config;
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 添加请求拦截器
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  // 添加响应拦截器
  addResponseInterceptor(
    interceptor: (response: RequestResponse) => RequestResponse | Promise<RequestResponse>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  // 添加错误拦截器
  addErrorInterceptor(
    interceptor: (error: RequestError) => RequestError | Promise<RequestError>
  ): void {
    this.errorInterceptors.push(interceptor);
  }

  // 清除拦截器
  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }

  // 获取并发状态
  getConcurrentStatus(key: string): { running: number; queued: number } {
    return this.concurrentController.getStatus(key);
  }

  // 清除并发队列
  clearConcurrentQueue(key?: string): void {
    this.concurrentController.clear(key);
  }
}

// 请求Hook
export function useRequest() {
  const optimizer = RequestOptimizer.getInstance();

  const request = async <T = any>(config: RequestConfig): Promise<RequestResponse<T>> => {
    return await optimizer.request<T>(config);
  };

  const get = async <T = any>(
    url: string,
    params?: any,
    options?: Omit<RequestConfig, 'url' | 'method' | 'data'>
  ): Promise<RequestResponse<T>> => {
    const config: RequestConfig = {
      url: params ? `${url}?${new URLSearchParams(params).toString()}` : url,
      method: 'GET',
      ...options,
    };
    return await request<T>(config);
  };

  const post = async <T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestConfig, 'url' | 'method' | 'data'>
  ): Promise<RequestResponse<T>> => {
    const config: RequestConfig = {
      url,
      method: 'POST',
      data,
      ...options,
    };
    return await request<T>(config);
  };

  const put = async <T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestConfig, 'url' | 'method' | 'data'>
  ): Promise<RequestResponse<T>> => {
    const config: RequestConfig = {
      url,
      method: 'PUT',
      data,
      ...options,
    };
    return await request<T>(config);
  };

  const del = async <T = any>(
    url: string,
    options?: Omit<RequestConfig, 'url' | 'method'>
  ): Promise<RequestResponse<T>> => {
    const config: RequestConfig = {
      url,
      method: 'DELETE',
      ...options,
    };
    return await request<T>(config);
  };

  return {
    request,
    get,
    post,
    put,
    delete: del,
  };
}

// 批量请求Hook
export function useBatchRequest() {
  const { request } = useRequest();

  const batchRequest = async <T = any>(
    configs: RequestConfig[],
    options?: {
      concurrent?: number;
      failFast?: boolean;
    }
  ): Promise<Array<RequestResponse<T> | Error>> => {
    const { concurrent = 3, failFast = false } = options || {};

    if (failFast) {
      // 快速失败模式
      const results: Array<RequestResponse<T>> = [];
      for (let i = 0; i < configs.length; i += concurrent) {
        const batch = configs.slice(i, i + concurrent);
        const batchResults = await Promise.all(batch.map(config => request<T>(config)));
        results.push(...batchResults);
      }
      return results;
    } else {
      // 容错模式
      const results: Array<RequestResponse<T> | Error> = [];
      for (let i = 0; i < configs.length; i += concurrent) {
        const batch = configs.slice(i, i + concurrent);
        const batchResults = await Promise.allSettled(batch.map(config => request<T>(config)));

        const processedResults = batchResults.map(result =>
          result.status === 'fulfilled' ? result.value : result.reason
        );
        results.push(...processedResults);
      }
      return results;
    }
  };

  return {
    batchRequest,
  };
}

// 请求工具函数
export const requestUtils = {
  // 创建带缓存的GET请求
  createCachedGetter: <T = any>(url: string, ttl: number = 5 * 60 * 1000) => {
    const { get } = useRequest();
    return (params?: any) =>
      get<T>(url, params, {
        cache: {
          enabled: true,
          ttl,
        },
      });
  },

  // 创建带重试的请求
  createRetryRequest: <T = any>(config: RequestConfig, retryTimes: number = 3) => {
    const { request } = useRequest();
    return () =>
      request<T>({
        ...config,
        retry: {
          times: retryTimes,
          delay: 1000,
          backoff: 'exponential',
        },
      });
  },

  // 创建并发控制的请求
  createConcurrentRequest: <T = any>(
    config: RequestConfig,
    concurrentKey: string,
    limit: number = 3
  ) => {
    const { request } = useRequest();
    return () =>
      request<T>({
        ...config,
        concurrent: {
          key: concurrentKey,
          limit,
        },
      });
  },
};

// 导出默认配置
export const defaultRequestConfig = {
  timeout: 10000,
  cache: {
    enabled: false,
    ttl: 5 * 60 * 1000,
  },
  retry: {
    times: 0,
    delay: 1000,
    backoff: 'exponential' as const,
  },
  concurrent: {
    limit: 3,
  },
};
