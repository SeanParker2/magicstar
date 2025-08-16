# MagicStar Frontend

基于 Taro 3.x + React + TypeScript 的跨平台占卜应用前端项目。

## 项目概述

MagicStar Frontend 是一个现代化的跨平台移动应用，支持微信小程序、H5、React Native 等多个平台。项目采用 Taro 框架开发，提供塔罗牌占卜、星座运势、商城购物等核心功能。

## 核心功能

### 🔮 占卜服务
- 塔罗牌占卜（单张牌、三张牌、Celtic Cross等牌阵）
- 星座运势查询
- 个人运势分析
- AI智能解读

### 👤 用户系统
- 用户注册/登录
- 个人资料管理
- 占卜历史记录
- 收藏夹功能

### 🛒 商城功能
- 商品浏览与搜索
- 购物车管理
- 订单处理
- 支付集成（微信支付、支付宝）

### 📱 多平台支持
- 微信小程序
- H5 网页版
- React Native App

## 技术栈

- **框架**: Taro 3.x
- **开发语言**: TypeScript
- **UI库**: React + Taro UI
- **状态管理**: Zustand
- **样式方案**: CSS Modules + PostCSS
- **构建工具**: Webpack 5
- **代码规范**: ESLint + Prettier
- **包管理**: npm

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 微信开发者工具（小程序开发）

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd magicstar-frontend

# 安装依赖
npm install
```

### 开发模式

```bash
# 微信小程序
npm run dev:weapp

# H5
npm run dev:h5

# React Native
npm run dev:rn
```

### 构建生产版本

```bash
# 微信小程序
npm run build:weapp

# H5
npm run build:h5

# React Native
npm run build:rn
```

## 项目结构

```
src/
├── components/          # 公共组件
│   ├── TarotCard/      # 塔罗牌组件
│   ├── TarotSpread/    # 牌阵组件
│   ├── UserProfile/    # 用户资料组件
│   └── ...
├── pages/              # 页面组件
│   ├── index/          # 首页
│   ├── divination/     # 占卜相关页面
│   ├── shop/           # 商城相关页面
│   ├── user/           # 用户相关页面
│   └── ...
├── services/           # API服务
│   ├── api.ts          # API配置
│   ├── auth.ts         # 认证服务
│   ├── divination.ts   # 占卜服务
│   └── ...
├── store/              # 状态管理
│   ├── auth.ts         # 认证状态
│   ├── user.ts         # 用户状态
│   └── ...
├── utils/              # 工具函数
│   ├── request.ts      # 请求封装
│   ├── storage.ts      # 存储工具
│   └── ...
├── types/              # TypeScript类型定义
├── assets/             # 静态资源
└── app.config.ts       # 应用配置
```

## 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 组件开发

```typescript
// 组件示例
import { View, Text } from '@tarojs/components'
import { FC } from 'react'
import './index.scss'

interface Props {
  title: string
}

const MyComponent: FC<Props> = ({ title }) => {
  return (
    <View className="my-component">
      <Text>{title}</Text>
    </View>
  )
}

export default MyComponent
```

### 页面开发

```typescript
// 页面示例
import { View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { FC } from 'react'
import './index.scss'

const MyPage: FC = () => {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className="my-page">
      {/* 页面内容 */}
    </View>
  )
}

export default MyPage
```

### API调用

```typescript
// API调用示例
import { request } from '@/utils/request'

// 获取用户信息
export const getUserInfo = async (userId: string) => {
  return request({
    url: `/api/users/${userId}`,
    method: 'GET'
  })
}

// 创建占卜记录
export const createDivination = async (data: DivinationData) => {
  return request({
    url: '/api/divination',
    method: 'POST',
    data
  })
}
```

### 状态管理

```typescript
// Zustand store 示例
import { create } from 'zustand'

interface AuthState {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null })
}))
```

## 测试

```bash
# 运行单元测试
npm run test

# 监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

## 部署

### 微信小程序部署

1. 使用微信开发者工具打开 `dist` 目录
2. 点击"上传"按钮上传代码
3. 在微信公众平台提交审核

### H5部署

```bash
# 构建H5版本
npm run build:h5

# 部署到服务器
# 将 dist 目录内容上传到 Web 服务器
```

### React Native部署

```bash
# Android
npm run build:rn
cd android
./gradlew assembleRelease

# iOS
npm run build:rn
cd ios
xcodebuild -workspace MagicStar.xcworkspace -scheme MagicStar archive
```

## 环境配置

### 开发环境

```typescript
// config/dev.ts
export default {
  env: {
    NODE_ENV: '"development"',
    API_BASE_URL: '"http://localhost:3000"'
  }
}
```

### 生产环境

```typescript
// config/prod.ts
export default {
  env: {
    NODE_ENV: '"production"',
    API_BASE_URL: '"https://api.magicstar.com"'
  }
}
```

## 性能优化

### 代码分割

```typescript
// 路由懒加载
import { lazy } from 'react'

const DivinationPage = lazy(() => import('@/pages/divination'))
const ShopPage = lazy(() => import('@/pages/shop'))
```

### 图片优化

- 使用 WebP 格式图片
- 实现图片懒加载
- 压缩图片资源

### 缓存策略

- API响应缓存
- 静态资源缓存
- 离线数据缓存

## 故障排除

### 常见问题

1. **编译错误**
   - 检查 Node.js 版本是否符合要求
   - 清除 node_modules 重新安装依赖
   - 检查 TypeScript 类型错误

2. **小程序真机调试问题**
   - 检查网络请求域名是否在白名单
   - 验证 HTTPS 证书是否有效
   - 检查小程序权限配置

3. **样式问题**
   - 检查 CSS 兼容性
   - 验证 rpx 单位使用
   - 检查平台特定样式

### 调试技巧

```bash
# 启用详细日志
DEBUG=* npm run dev:weapp

# 分析打包体积
npm run build:analyzer
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目维护者：MagicStar Team
- 邮箱：support@magicstar.com
- 项目地址：https://github.com/magicstar/magicstar-frontend