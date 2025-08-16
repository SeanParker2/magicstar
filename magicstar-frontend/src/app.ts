import { Component, PropsWithChildren } from 'react';
import { PerformanceMonitor } from './utils/performance';
import { CacheManager } from './utils/cache';
import { ImageOptimizer } from './utils/imageOptimizer';

import './app.scss';

class App extends Component<PropsWithChildren> {
  private performanceMonitor: PerformanceMonitor | null = null;

  componentDidMount() {
    this.initializeApp();
  }

  componentDidShow() {
    // 应用显示时开始性能监控
    if (this.performanceMonitor) {
      this.performanceMonitor.startMonitoring();
    }
  }

  componentDidHide() {
    // 应用隐藏时停止性能监控
    if (this.performanceMonitor) {
      this.performanceMonitor.stopMonitoring();
    }
  }

  // 初始化应用
  private async initializeApp() {
    try {
      // 初始化性能监控
      this.initPerformanceMonitor();

      // 初始化缓存管理
      this.initCacheManager();

      // 初始化图片优化器
      this.initImageOptimizer();

      // 清理过期数据
      await this.cleanupExpiredData();

      console.log('应用初始化完成');
    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  }

  // 初始化性能监控
  private initPerformanceMonitor(): void {
    try {
      this.performanceMonitor = new PerformanceMonitor();
      console.log('性能监控初始化成功');
    } catch (error) {
      console.error('性能监控初始化失败:', error);
    }
  }

  // 初始化缓存管理
  private initCacheManager() {
    try {
      // 初始化内存缓存
      CacheManager.initMemoryCache({
        ttl: 5 * 60 * 1000, // 5分钟
        maxSize: 100,
        strategy: 'LRU',
      });

      // 初始化持久化缓存
      CacheManager.initPersistentCache('magicstar_', {
        ttl: 24 * 60 * 60 * 1000, // 24小时
        maxSize: 50,
        compress: true,
        strategy: 'LRU',
      });

      console.log('缓存管理初始化成功');
    } catch (error) {
      console.error('缓存管理初始化失败:', error);
    }
  }

  // 初始化图片优化器
  private initImageOptimizer() {
    try {
      const optimizer = ImageOptimizer.getInstance();

      // 预加载关键图片
      const criticalImages = [
        '/assets/images/logo.png',
        '/assets/images/default-avatar.png',
        '/assets/images/loading.gif',
      ];

      optimizer.addToPreloadQueue(criticalImages);
      optimizer.processPreloadQueue();

      console.log('图片优化器初始化成功');
    } catch (error) {
      console.error('图片优化器初始化失败:', error);
    }
  }

  // 清理过期数据
  private async cleanupExpiredData() {
    try {
      // 清理过期的持久化缓存
      const persistentCache = CacheManager.getPersistentCache();
      await persistentCache.cleanup();

      // 清理过期的内存缓存
      const memoryCache = CacheManager.getMemoryCache();
      memoryCache.cleanup();

      console.log('过期数据清理完成');
    } catch (error) {
      console.error('过期数据清理失败:', error);
    }
  }

  // this.props.children 是将要会渲染的页面
  render() {
    return this.props.children;
  }
}

export default App;
