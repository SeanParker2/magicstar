import React from 'react';
import Taro from '@tarojs/taro';

interface AppState {
  loading: boolean;
  theme: 'light' | 'dark';
  tabBarVisible: boolean;
  networkStatus: 'online' | 'offline';

  // Actions
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setTabBarVisible: (visible: boolean) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
}

class AppStore {
  private state: AppState;
  private listeners: Array<() => void> = [];

  constructor() {
    this.state = {
      loading: false,
      theme: 'light',
      tabBarVisible: true,
      networkStatus: 'online',
      setLoading: this.setLoading.bind(this),
      setTheme: this.setTheme.bind(this),
      setTabBarVisible: this.setTabBarVisible.bind(this),
      setNetworkStatus: this.setNetworkStatus.bind(this),
    };

    // 初始化时从本地存储恢复主题设置
    this.initFromStorage();
    // 监听网络状态
    this.initNetworkListener();
  }

  private initFromStorage() {
    try {
      const theme = Taro.getStorageSync('theme');
      if (theme) {
        this.state.theme = theme;
      }
    } catch (error) {
      console.log('初始化应用状态失败:', error);
    }
  }

  private initNetworkListener() {
    // 监听网络状态变化
    Taro.onNetworkStatusChange(res => {
      this.setNetworkStatus(res.isConnected ? 'online' : 'offline');
    });

    // 获取当前网络状态
    Taro.getNetworkType({
      success: res => {
        this.setNetworkStatus(res.networkType === 'none' ? 'offline' : 'online');
      },
    });
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  private setLoading(loading: boolean) {
    this.state.loading = loading;
    this.notify();

    // 显示或隐藏加载提示
    if (loading) {
      Taro.showLoading({
        title: '加载中...',
      });
    } else {
      Taro.hideLoading();
    }
  }

  private setTheme(theme: 'light' | 'dark') {
    this.state.theme = theme;
    Taro.setStorageSync('theme', theme);
    this.notify();
  }

  private setTabBarVisible(visible: boolean) {
    this.state.tabBarVisible = visible;
    this.notify();

    // 控制TabBar显示/隐藏
    if (visible) {
      Taro.showTabBar();
    } else {
      Taro.hideTabBar();
    }
  }

  private setNetworkStatus(status: 'online' | 'offline') {
    const prevStatus = this.state.networkStatus;
    this.state.networkStatus = status;
    this.notify();

    // 网络状态变化提示
    if (prevStatus !== status) {
      if (status === 'offline') {
        Taro.showToast({
          title: '网络连接已断开',
          icon: 'none',
        });
      } else {
        Taro.showToast({
          title: '网络连接已恢复',
          icon: 'success',
        });
      }
    }
  }
}

// 创建全局实例
const appStore = new AppStore();

// React Hook
export const useAppStore = () => {
  const [_updateCount, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      forceUpdate();
    });
    return unsubscribe;
  }, []);

  return appStore.getState();
};

export { appStore };
export type { AppState };
