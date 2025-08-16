import React, { Suspense, lazy, ComponentType } from 'react';
import { View } from '@tarojs/components';
import './index.scss';

interface LazyRouteProps {
  fallback?: React.ReactNode;
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
}

// 默认加载组件
const DefaultFallback: React.FC = () => (
  <View className="lazy-route-loading">
    <View className="lazy-route-spinner" />
    <View className="lazy-route-text">页面加载中...</View>
  </View>
);

// 默认错误边界组件
const DefaultErrorBoundary: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <View className="lazy-route-error">
    <View className="lazy-route-error-icon">⚠️</View>
    <View className="lazy-route-error-title">页面加载失败</View>
    <View className="lazy-route-error-message">{error.message}</View>
    <View className="lazy-route-error-button" onClick={retry}>
      重新加载
    </View>
  </View>
);

// 错误边界类组件
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: ComponentType<{ error: Error; retry: () => void }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback: ComponentType<{ error: Error; retry: () => void }>;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyRoute Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// 创建懒加载路由的工厂函数
export const createLazyRoute = <P extends Record<string, any> = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyRouteProps = {}
) => {
  const LazyComponent = lazy(importFunc);
  const { fallback = <DefaultFallback />, errorBoundary = DefaultErrorBoundary } = options;

  const LazyRoute: React.FC<P> & { preload: () => void } = (props: P) => {
    return (
      <ErrorBoundary fallback={errorBoundary}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as any)} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  // 预加载函数
  LazyRoute.preload = () => {
    importFunc().catch(console.error);
  };

  return LazyRoute;
};

// 预加载管理器
export class PreloadManager {
  private static preloadedRoutes = new Set<string>();
  private static preloadQueue: Array<() => void> = [];
  private static isPreloading = false;

  // 添加预加载任务
  static addPreloadTask(routeName: string, preloadFunc: () => void) {
    if (this.preloadedRoutes.has(routeName)) {
      return;
    }

    this.preloadQueue.push(() => {
      preloadFunc();
      this.preloadedRoutes.add(routeName);
    });

    this.processQueue();
  }

  // 处理预加载队列
  private static async processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const task = this.preloadQueue.shift();
      if (task) {
        try {
          task();
          // 添加延迟，避免阻塞主线程
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Preload task failed:', error);
        }
      }
    }

    this.isPreloading = false;
  }

  // 预加载关键路由
  static preloadCriticalRoutes() {
    // 在空闲时间预加载关键页面
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.processQueue();
      });
    } else {
      // 降级方案
      setTimeout(() => {
        this.processQueue();
      }, 2000);
    }
  }
}

export default createLazyRoute;
