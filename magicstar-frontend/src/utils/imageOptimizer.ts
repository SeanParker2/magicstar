import Taro from '@tarojs/taro'

// 图片压缩配置
interface ImageCompressConfig {
  // 压缩质量 (0-1)
  quality: number
  // 最大宽度
  maxWidth?: number
  // 最大高度
  maxHeight?: number
  // 输出格式
  format?: 'jpeg' | 'png' | 'webp'
  // 是否保持宽高比
  keepAspectRatio?: boolean
}

// 图片信息
interface ImageInfo {
  width: number
  height: number
  size: number
  format: string
  url: string
}

// 图片预加载配置
interface PreloadConfig {
  // 预加载数量
  batchSize: number
  // 预加载延迟
  delay: number
  // 优先级
  priority: 'high' | 'normal' | 'low'
}

// 图片优化器
export class ImageOptimizer {
  private static instance: ImageOptimizer
  private preloadQueue: string[] = []
  private preloadedImages = new Set<string>()
  private loadingImages = new Set<string>()
  private preloadConfig: PreloadConfig = {
    batchSize: 3,
    delay: 100,
    priority: 'normal'
  }

  private constructor() {}

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer()
    }
    return ImageOptimizer.instance
  }

  // 压缩图片
  async compressImage(
    filePath: string,
    config: ImageCompressConfig
  ): Promise<string> {
    try {
      const {
        quality = 0.8,
        maxWidth = 1920,
        maxHeight = 1080,
        format: _format = 'jpeg',
        keepAspectRatio = true
      } = config

      // 获取图片信息
      const imageInfo = await this.getImageInfo(filePath)
      
      // 计算压缩后的尺寸
      const { width, height } = this.calculateDimensions(
        imageInfo.width,
        imageInfo.height,
        maxWidth,
        maxHeight,
        keepAspectRatio
      )

      // 压缩图片
      const result = await Taro.compressImage({
        src: filePath,
        quality: quality * 100, // Taro需要0-100的值
        compressedWidth: width,
        compressedHeight: height
      })

      return result.tempFilePath
    } catch (error) {
      console.error('Image compression failed:', error)
      return filePath // 压缩失败时返回原图
    }
  }

  // 获取图片信息
  async getImageInfo(src: string): Promise<ImageInfo> {
    try {
      const result = await Taro.getImageInfo({ src })
      return {
        width: result.width,
        height: result.height,
        size: 0, // Taro不提供文件大小信息
        format: result.type || 'unknown',
        url: src
      }
    } catch (error) {
      console.error('Failed to get image info:', error)
      throw error
    }
  }

  // 预加载图片
  async preloadImage(src: string): Promise<boolean> {
    if (this.preloadedImages.has(src) || this.loadingImages.has(src)) {
      return true
    }

    this.loadingImages.add(src)

    try {
      await this.getImageInfo(src)
      this.preloadedImages.add(src)
      this.loadingImages.delete(src)
      return true
    } catch (error) {
      this.loadingImages.delete(src)
      console.error('Failed to preload image:', src, error)
      return false
    }
  }

  // 批量预加载图片
  async preloadImages(urls: string[], config?: Partial<PreloadConfig>): Promise<void> {
    const finalConfig = { ...this.preloadConfig, ...config }
    
    // 过滤已预加载的图片
    const urlsToLoad = urls.filter(url => 
      !this.preloadedImages.has(url) && !this.loadingImages.has(url)
    )

    // 分批预加载
    for (let i = 0; i < urlsToLoad.length; i += finalConfig.batchSize) {
      const batch = urlsToLoad.slice(i, i + finalConfig.batchSize)
      
      // 并行加载当前批次
      const promises = batch.map(url => this.preloadImage(url))
      await Promise.allSettled(promises)

      // 延迟下一批次
      if (i + finalConfig.batchSize < urlsToLoad.length) {
        await this.delay(finalConfig.delay)
      }
    }
  }

  // 添加到预加载队列
  addToPreloadQueue(urls: string | string[]): void {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    this.preloadQueue.push(...urlArray)
  }

  // 处理预加载队列
  async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) return

    const urls = [...this.preloadQueue]
    this.preloadQueue = []
    
    await this.preloadImages(urls)
  }

  // 检查图片是否已预加载
  isPreloaded(src: string): boolean {
    return this.preloadedImages.has(src)
  }

  // 清除预加载缓存
  clearPreloadCache(): void {
    this.preloadedImages.clear()
    this.loadingImages.clear()
    this.preloadQueue = []
  }

  // 获取预加载统计
  getPreloadStats(): {
    preloaded: number
    loading: number
    queued: number
  } {
    return {
      preloaded: this.preloadedImages.size,
      loading: this.loadingImages.size,
      queued: this.preloadQueue.length
    }
  }

  // 生成响应式图片URL
  generateResponsiveUrl(
    baseUrl: string,
    width: number,
    quality: number = 80
  ): string {
    // 如果是本地图片或已经包含参数，直接返回
    if (baseUrl.startsWith('data:') || baseUrl.includes('?')) {
      return baseUrl
    }

    // 添加响应式参数（适用于支持的CDN）
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}w=${width}&q=${quality}&f=auto`
  }

  // 选择最佳图片格式
  getBestFormat(): 'webp' | 'jpeg' | 'png' {
    // 检查浏览器支持
    if (process.env.TARO_ENV === 'h5') {
      // H5环境下检查WebP支持
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      return webpSupported ? 'webp' : 'jpeg'
    }
    
    // 小程序环境默认使用jpeg
    return 'jpeg'
  }

  // 计算压缩后的尺寸
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    keepAspectRatio: boolean
  ): { width: number; height: number } {
    if (!keepAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight)
      }
    }

    const aspectRatio = originalWidth / originalHeight
    let width = originalWidth
    let height = originalHeight

    // 按宽度限制
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    // 按高度限制
    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 图片懒加载Hook
export function useImageLazyLoad() {
  const optimizer = ImageOptimizer.getInstance()

  const preloadImage = async (src: string): Promise<boolean> => {
    return await optimizer.preloadImage(src)
  }

  const preloadImages = async (urls: string[]): Promise<void> => {
    await optimizer.preloadImages(urls)
  }

  const isPreloaded = (src: string): boolean => {
    return optimizer.isPreloaded(src)
  }

  const addToQueue = (urls: string | string[]): void => {
    optimizer.addToPreloadQueue(urls)
  }

  const processQueue = async (): Promise<void> => {
    await optimizer.processPreloadQueue()
  }

  return {
    preloadImage,
    preloadImages,
    isPreloaded,
    addToQueue,
    processQueue
  }
}

// 图片压缩Hook
export function useImageCompress() {
  const optimizer = ImageOptimizer.getInstance()

  const compressImage = async (
    filePath: string,
    config: Partial<ImageCompressConfig> = {}
  ): Promise<string> => {
    const defaultConfig: ImageCompressConfig = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'jpeg',
      keepAspectRatio: true
    }

    return await optimizer.compressImage(filePath, { ...defaultConfig, ...config })
  }

  const getImageInfo = async (src: string): Promise<ImageInfo> => {
    return await optimizer.getImageInfo(src)
  }

  const generateResponsiveUrl = (
    baseUrl: string,
    width: number,
    quality: number = 80
  ): string => {
    return optimizer.generateResponsiveUrl(baseUrl, width, quality)
  }

  const getBestFormat = (): 'webp' | 'jpeg' | 'png' => {
    return optimizer.getBestFormat()
  }

  return {
    compressImage,
    getImageInfo,
    generateResponsiveUrl,
    getBestFormat
  }
}

// 图片工具函数
export const imageUtils = {
  // 检查图片URL是否有效
  isValidImageUrl: (url: string): boolean => {
    if (!url) return false
    
    // 检查是否是base64图片
    if (url.startsWith('data:image/')) return true
    
    // 检查是否是有效的URL
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  // 获取图片扩展名
  getImageExtension: (url: string): string => {
    if (url.startsWith('data:image/')) {
      const match = url.match(/data:image\/(\w+)/)
      return match ? match[1] : 'unknown'
    }
    
    const match = url.match(/\.([^.?]+)(\?|$)/)
    return match ? match[1].toLowerCase() : 'unknown'
  },

  // 生成缩略图URL
  generateThumbnailUrl: (
    originalUrl: string,
    size: number = 200,
    quality: number = 70
  ): string => {
    const optimizer = ImageOptimizer.getInstance()
    return optimizer.generateResponsiveUrl(originalUrl, size, quality)
  },

  // 计算图片显示尺寸
  calculateDisplaySize: (
    originalWidth: number,
    originalHeight: number,
    containerWidth: number,
    containerHeight: number
  ): { width: number; height: number } => {
    const aspectRatio = originalWidth / originalHeight
    const containerAspectRatio = containerWidth / containerHeight

    let width: number
    let height: number

    if (aspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      width = containerWidth
      height = containerWidth / aspectRatio
    } else {
      // 图片更高，以容器高度为准
      height = containerHeight
      width = containerHeight * aspectRatio
    }

    return { width, height }
  }
}

// 导出默认配置
export const defaultImageConfig = {
  compress: {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg' as const,
    keepAspectRatio: true
  },
  preload: {
    batchSize: 3,
    delay: 100,
    priority: 'normal' as const
  }
}