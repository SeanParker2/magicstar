import Taro from '@tarojs/taro'
import { RequestOptimizer, useBatchRequest, requestUtils } from '../utils/requestOptimizer'
import type { RequestConfig } from '../utils/requestOptimizer'

// API基础配置
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001' 
  : 'https://api.magicstar.com'

// 初始化请求优化器
const requestOptimizer = RequestOptimizer.getInstance()

// 添加请求拦截器
requestOptimizer.addRequestInterceptor((config) => {
  // 添加基础URL
  if (!config.url.startsWith('http')) {
    config.url = BASE_URL + config.url
  }

  // 添加通用请求头
  config.header = {
    'Content-Type': 'application/json',
    ...config.header
  }

  // 添加认证token
  const token = Taro.getStorageSync('token')
  if (token) {
    config.header.Authorization = `Bearer ${token}`
  }

  console.log('请求参数:', config)
  return config
})

// 添加响应拦截器
requestOptimizer.addResponseInterceptor((response) => {
  console.log('响应结果:', response)
  
  // 处理HTTP状态码
  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}: ${response.data?.message || '请求失败'}`)
  }

  // 处理业务状态码
  if (response.data?.code !== undefined && response.data.code !== 200) {
    // 处理认证失败
    if (response.data.code === 401) {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('userInfo')
      Taro.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none'
      })
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/login/index' })
      }, 1500)
      throw new Error('登录已过期')
    }
    
    throw new Error(response.data.message || '请求失败')
  }

  // 返回处理后的数据
  return {
    ...response,
    data: response.data.data || response.data
  }
})

// 添加错误拦截器
requestOptimizer.addErrorInterceptor((error) => {
  console.error('请求错误:', error)
  
  // 网络错误处理
  if (error.errMsg) {
    if (error.errMsg.includes('timeout')) {
      Taro.showToast({
        title: '请求超时，请检查网络',
        icon: 'none'
      })
    } else if (error.errMsg.includes('fail')) {
      Taro.showToast({
        title: '网络连接失败',
        icon: 'none'
      })
    }
  } else {
    Taro.showToast({
      title: error.errMsg || '请求失败',
      icon: 'none'
    })
  }
  
  return error
})

// 通用请求方法
export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  timeout?: number
  // 扩展配置
  cache?: {
    enabled: boolean
    ttl?: number
    key?: string
  }
  retry?: {
    times: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
  concurrent?: {
    key: string
    limit?: number
  }
}

// 基础请求方法
export const request = async <T = any>(options: RequestOptions): Promise<T> => {
  const { method = 'GET', timeout = 10000 } = options
  
  const config: RequestConfig = {
    url: options.url,
    method,
    data: options.data,
    header: options.header,
    timeout,
    cache: options.cache,
    retry: options.retry,
    concurrent: options.concurrent
  }

  const response = await requestOptimizer.request<T>(config)
  return response.data
}

// 便捷方法 - 带缓存的GET请求
export const get = async <T = any>(
  url: string, 
  params?: any, 
  options?: Omit<RequestOptions, 'url' | 'method' | 'data'>
): Promise<T> => {
  const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
  const finalUrl = `${url}${queryString}`
  
  return request<T>({
    url: finalUrl,
    method: 'GET',
    cache: {
      enabled: true,
      ttl: 5 * 60 * 1000 // 默认5分钟缓存
    },
    ...options
  })
}

// POST请求 - 带重试机制
export const post = async <T = any>(
  url: string, 
  data?: any, 
  options?: Omit<RequestOptions, 'url' | 'method' | 'data'>
): Promise<T> => {
  return request<T>({
    url,
    method: 'POST',
    data,
    retry: {
      times: 2,
      delay: 1000,
      backoff: 'exponential'
    },
    ...options
  })
}

// PUT请求
export const put = async <T = any>(
  url: string, 
  data?: any, 
  options?: Omit<RequestOptions, 'url' | 'method' | 'data'>
): Promise<T> => {
  return request<T>({
    url,
    method: 'PUT',
    data,
    retry: {
      times: 1,
      delay: 1000
    },
    ...options
  })
}

// DELETE请求
export const del = async <T = any>(
  url: string, 
  options?: Omit<RequestOptions, 'url' | 'method'>
): Promise<T> => {
  return request<T>({
    url,
    method: 'DELETE',
    retry: {
      times: 1,
      delay: 1000
    },
    ...options
  })
}

// 批量请求方法
export const batchRequest = async <T = any>(
  configs: RequestOptions[],
  options?: {
    concurrent?: number
    failFast?: boolean
  }
): Promise<Array<T | Error>> => {
  const { batchRequest: batch } = useBatchRequest()
  
  const requestConfigs: RequestConfig[] = configs.map(config => ({
    url: config.url,
    method: config.method || 'GET',
    data: config.data,
    header: config.header,
    timeout: config.timeout || 10000,
    cache: config.cache,
    retry: config.retry,
    concurrent: config.concurrent
  }))

  const results = await batch<T>(requestConfigs, options)
  return results.map(result => 
    result instanceof Error ? result : result.data
  )
}

// 创建专用请求方法
export const createCachedRequest = <T = any>(
  url: string,
  ttl: number = 5 * 60 * 1000
) => {
  return requestUtils.createCachedGetter<T>(url, ttl)
}

export const createRetryRequest = <T = any>(
  config: RequestOptions,
  retryTimes: number = 3
) => {
  return requestUtils.createRetryRequest<T>(config as RequestConfig, retryTimes)
}

export const createConcurrentRequest = <T = any>(
  config: RequestOptions,
  concurrentKey: string,
  limit: number = 3
) => {
  return requestUtils.createConcurrentRequest<T>(config as RequestConfig, concurrentKey, limit)
}

// 请求状态管理
export const getRequestStats = () => {
  return {
    getConcurrentStatus: (key: string) => requestOptimizer.getConcurrentStatus(key),
    clearConcurrentQueue: (key?: string) => requestOptimizer.clearConcurrentQueue(key)
  }
}

// 导出默认对象
export default {
  request,
  get,
  post,
  put,
  delete: del,
  batchRequest,
  createCachedRequest,
  createRetryRequest,
  createConcurrentRequest,
  getRequestStats
}