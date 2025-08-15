import Taro from '@tarojs/taro'
import React from 'react'

// 性能指标接口
interface PerformanceMetrics {
  // 页面加载时间
  pageLoadTime: number
  // 首屏渲染时间
  firstPaint: number
  // 首次内容绘制时间
  firstContentfulPaint: number
  // 最大内容绘制时间
  largestContentfulPaint: number
  // 首次输入延迟
  firstInputDelay: number
  // 累积布局偏移
  cumulativeLayoutShift: number
  // 内存使用情况
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

// 性能监控类
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Partial<PerformanceMetrics> = {}
  private observers: PerformanceObserver[] = []
  // private _startTime: number = Date.now()
  private isEnabled: boolean = true

  constructor() {
    this.init()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // 开始监控
  startMonitoring(): void {
    if (this.isEnabled) {
      this.init()
    }
  }

  // 停止监控
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isEnabled = false
  }

  private init() {
    // 只在H5环境下启用完整的性能监控
    if (process.env.TARO_ENV === 'h5') {
      this.initWebPerformanceAPI()
    }
    
    // 通用性能监控
    this.initCommonMetrics()
  }

  private initWebPerformanceAPI() {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    // 监控 LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.metrics.largestContentfulPaint = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (e) {
        console.warn('LCP observer not supported')
      }

      // 监控 FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (e) {
        console.warn('FID observer not supported')
      }

      // 监控 CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
              this.metrics.cumulativeLayoutShift = clsValue
            }
          })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (e) {
        console.warn('CLS observer not supported')
      }
    }

    // 监控页面加载完成
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.collectLoadMetrics()
      }, 0)
    })
  }

  private initCommonMetrics() {
    // 记录页面开始时间
    // this._startTime = Date.now()
    
    // 监控内存使用（如果支持）
    this.collectMemoryMetrics()
  }

  private collectLoadMetrics() {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart
      this.metrics.firstPaint = navigation.responseStart - navigation.fetchStart
      this.metrics.firstContentfulPaint = navigation.domContentLoadedEventEnd - navigation.fetchStart
    }

    // 收集 Paint Timing
    const paintEntries = window.performance.getEntriesByType('paint')
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        this.metrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        this.metrics.firstContentfulPaint = entry.startTime
      }
    })
  }

  private collectMemoryMetrics() {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      this.metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
  }

  // 标记自定义时间点
  mark(name: string) {
    if (!this.isEnabled) return
    
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      window.performance.mark(name)
    } else {
      // 降级方案
      console.time(name)
    }
  }

  // 测量两个标记之间的时间
  measure(name: string, startMark: string, endMark?: string) {
    if (!this.isEnabled) return
    
    if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark)
        const measures = window.performance.getEntriesByName(name, 'measure')
        return measures[measures.length - 1]?.duration
      } catch (e) {
        console.warn('Performance measure failed:', e)
      }
    } else {
      // 降级方案
      console.timeEnd(name)
    }
  }

  // 获取当前性能指标
  getMetrics(): Partial<PerformanceMetrics> {
    this.collectMemoryMetrics()
    return { ...this.metrics }
  }

  // 上报性能数据
  async reportMetrics(endpoint?: string) {
    if (!this.isEnabled) return
    
    const metrics = this.getMetrics()
    const reportData = {
      ...metrics,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      platform: process.env.TARO_ENV
    }

    try {
      if (endpoint) {
        // 发送到指定端点
        await Taro.request({
          url: endpoint,
          method: 'POST',
          data: reportData
        })
      } else {
        // 本地存储或控制台输出
        console.log('Performance Metrics:', reportData)
        
        // 存储到本地
        const storageKey = 'performance_metrics'
        const existingData = Taro.getStorageSync(storageKey) || []
        existingData.push(reportData)
        
        // 只保留最近50条记录
        if (existingData.length > 50) {
          existingData.splice(0, existingData.length - 50)
        }
        
        Taro.setStorageSync(storageKey, existingData)
      }
    } catch (error) {
      console.error('Failed to report performance metrics:', error)
    }
  }

  // 获取性能评分
  getPerformanceScore(): { score: number; details: any } {
    const metrics = this.getMetrics()
    let score = 100
    const details: any = {}

    // LCP 评分 (理想 < 2.5s)
    if (metrics.largestContentfulPaint) {
      const lcp = metrics.largestContentfulPaint / 1000
      if (lcp > 4) {
        score -= 30
        details.lcp = 'poor'
      } else if (lcp > 2.5) {
        score -= 15
        details.lcp = 'needs-improvement'
      } else {
        details.lcp = 'good'
      }
    }

    // FID 评分 (理想 < 100ms)
    if (metrics.firstInputDelay) {
      const fid = metrics.firstInputDelay
      if (fid > 300) {
        score -= 25
        details.fid = 'poor'
      } else if (fid > 100) {
        score -= 10
        details.fid = 'needs-improvement'
      } else {
        details.fid = 'good'
      }
    }

    // CLS 评分 (理想 < 0.1)
    if (metrics.cumulativeLayoutShift !== undefined) {
      const cls = metrics.cumulativeLayoutShift
      if (cls > 0.25) {
        score -= 25
        details.cls = 'poor'
      } else if (cls > 0.1) {
        score -= 10
        details.cls = 'needs-improvement'
      } else {
        details.cls = 'good'
      }
    }

    return { score: Math.max(0, score), details }
  }

  // 清理资源
  destroy() {
    this.observers.forEach(observer => {
      observer.disconnect()
    })
    this.observers = []
    this.isEnabled = false
  }

  // 启用/禁用监控
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance()

// 页面性能监控装饰器
export function withPerformanceMonitor<T extends React.ComponentType<any>>(Component: T, pageName: string): T {
  const WrappedComponent = (props: any) => {
    React.useEffect(() => {
      performanceMonitor.mark(`${pageName}-start`)
      
      return () => {
        performanceMonitor.mark(`${pageName}-end`)
        performanceMonitor.measure(`${pageName}-duration`, `${pageName}-start`, `${pageName}-end`)
      }
    }, [])

    return React.createElement(Component, props)
  }

  return WrappedComponent as T
}

// 性能监控 Hook
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startMark = `${componentName}-mount-start`
    const endMark = `${componentName}-mount-end`
    
    performanceMonitor.mark(startMark)
    
    return () => {
      performanceMonitor.mark(endMark)
      performanceMonitor.measure(`${componentName}-mount-duration`, startMark, endMark)
    }
  }, [])

  return {
    mark: (name: string) => performanceMonitor.mark(`${componentName}-${name}`),
    measure: (name: string, start: string, end?: string) => 
      performanceMonitor.measure(`${componentName}-${name}`, `${componentName}-${start}`, end ? `${componentName}-${end}` : undefined),
    getMetrics: () => performanceMonitor.getMetrics(),
    getScore: () => performanceMonitor.getPerformanceScore()
  }
}