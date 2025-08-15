// 状态管理入口文件
export { useUserStore, userStore } from './user'
export { useAppStore, appStore } from './app'

// 导出类型
export type { User, UserState } from './user'
export type { AppState } from './app'

// 全局状态初始化
export const initStores = () => {
  // 这里可以添加全局状态初始化逻辑
  console.log('状态管理初始化完成')
}