import React from 'react'
import Taro from '@tarojs/taro'

interface User {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  vipLevel: number
  points: number
  isVip: boolean
}

interface UserState {
  user: User | null
  isLoggedIn: boolean
  token: string | null
  
  // Actions
  setUser: (user: User) => void
  setToken: (token: string) => void
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  checkLoginStatus: () => boolean
}

// 简单的状态管理实现
class UserStore {
  private state: UserState
  private listeners: Array<() => void> = []

  constructor() {
    this.state = {
      user: null,
      isLoggedIn: false,
      token: null,
      setUser: this.setUser.bind(this),
      setToken: this.setToken.bind(this),
      login: this.login.bind(this),
      logout: this.logout.bind(this),
      updateUser: this.updateUser.bind(this),
      checkLoginStatus: this.checkLoginStatus.bind(this)
    }
    
    // 初始化时从本地存储恢复状态
    this.initFromStorage()
  }

  private initFromStorage() {
    try {
      const token = Taro.getStorageSync('token')
      const user = Taro.getStorageSync('user')
      
      if (token && user) {
        this.state.token = token
        this.state.user = user
        this.state.isLoggedIn = true
      }
    } catch (error) {
      console.log('初始化用户状态失败:', error)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getState(): UserState {
    return { ...this.state }
  }

  private setUser(user: User) {
    this.state.user = user
    this.state.isLoggedIn = true
    this.notify()
  }

  private setToken(token: string) {
    this.state.token = token
    Taro.setStorageSync('token', token)
    this.notify()
  }

  private login(user: User, token: string) {
    this.state.user = user
    this.state.token = token
    this.state.isLoggedIn = true
    Taro.setStorageSync('token', token)
    Taro.setStorageSync('user', user)
    this.notify()
  }

  private logout() {
    this.state.user = null
    this.state.token = null
    this.state.isLoggedIn = false
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    this.notify()
    
    // 跳转到登录页
    Taro.navigateTo({
      url: '/pages/login/index'
    })
  }

  private updateUser(updates: Partial<User>) {
    if (this.state.user) {
      this.state.user = { ...this.state.user, ...updates }
      Taro.setStorageSync('user', this.state.user)
      this.notify()
    }
  }

  private checkLoginStatus(): boolean {
    return this.state.isLoggedIn && !!this.state.token
  }
}

// 创建全局实例
const userStore = new UserStore()

// React Hook
export const useUserStore = () => {
  const [_updateCount, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
  
  React.useEffect(() => {
    const unsubscribe = userStore.subscribe(() => {
      forceUpdate()
    })
    return unsubscribe
  }, [])
  
  return userStore.getState()
}

export { userStore }
export type { User, UserState }