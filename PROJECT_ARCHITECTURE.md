# Magic Lightning 项目架构文档

## 项目总览

本项目采用前后端分离架构，包含以下主要部分：
- **前端**: Taro + React + TypeScript 多端小程序应用
- **后端**: Node.js + Nest.js + TypeScript RESTful API服务
- **数据库**: MySQL + Redis
- **部署**: Docker + CI/CD

---

## 项目根目录结构

```
magicstar/
├── .gitignore                    # Git忽略文件配置
├── .trae/                        # Trae AI IDE配置目录
│   └── rules/
│       └── project_rules.md      # 项目开发规则文档
├── TASK_ROADMAP.md              # 项目任务路线图和进度跟踪
├── PROJECT_ARCHITECTURE.md      # 项目架构文档（本文件）
├── magicstar-backend/           # 后端服务目录
└── magicstar-frontend/          # 前端应用目录
```

---

## 后端项目结构 (magicstar-backend/)

### 根目录文件
```
magicstar-backend/
├── .env                         # 环境变量配置文件（本地开发）
├── .env.example                 # 环境变量配置模板
├── .gitignore                   # Git忽略文件
├── .prettierrc                  # Prettier代码格式化配置
├── README.md                    # 后端项目说明文档
├── eslint.config.mjs           # ESLint代码检查配置
├── nest-cli.json               # Nest.js CLI配置
├── package.json                # NPM包管理和脚本配置
├── package-lock.json           # NPM依赖锁定文件
├── tsconfig.json               # TypeScript编译配置
├── tsconfig.build.json         # TypeScript构建配置
```

### 源代码目录 (src/)
```
src/
├── main.ts                      # 应用程序入口文件
├── app.module.ts                # 根模块，整合所有功能模块
├── app.controller.ts            # 根控制器，处理基础路由
├── app.controller.spec.ts       # 根控制器单元测试
├── app.service.ts               # 根服务，提供基础业务逻辑
│
├── config/                      # 配置管理目录
│   ├── configuration.ts         # 应用配置文件（数据库、Redis、JWT等）
│   └── validation.ts            # 配置验证规则
│
├── database/                    # 数据库相关配置
│   ├── database.module.ts       # 数据库模块配置
│   ├── entities/                # 数据库实体定义目录
│   └── migrations/              # 数据库迁移脚本目录
│
├── common/                      # 通用组件和工具
│   ├── constants/               # 常量定义
│   ├── enums/                   # 枚举类型定义
│   ├── interfaces/              # 接口类型定义
│   ├── utils/                   # 工具函数
│   └── dto/                     # 数据传输对象基类
│
├── decorators/                  # 自定义装饰器
│   ├── auth.decorator.ts        # 认证相关装饰器
│   ├── roles.decorator.ts       # 角色权限装饰器
│   └── api-response.decorator.ts # API响应装饰器
│
├── guards/                      # 守卫（权限控制）
│   ├── auth.guard.ts            # 认证守卫
│   ├── roles.guard.ts           # 角色权限守卫
│   └── throttle.guard.ts        # 限流守卫
│
├── interceptors/                # 拦截器
│   ├── response.interceptor.ts  # 统一响应格式拦截器
│   ├── logging.interceptor.ts   # 日志记录拦截器
│   └── timeout.interceptor.ts   # 超时处理拦截器
│
├── filters/                     # 异常过滤器
│   ├── http-exception.filter.ts # HTTP异常过滤器
│   ├── validation.filter.ts     # 数据验证异常过滤器
│   └── all-exceptions.filter.ts # 全局异常过滤器
│
├── pipes/                       # 管道（数据转换和验证）
│   ├── validation.pipe.ts       # 数据验证管道
│   ├── parse-int.pipe.ts        # 整数解析管道
│   └── trim.pipe.ts             # 字符串去空格管道
│
└── modules/                     # 业务功能模块
    ├── auth/                    # 认证授权模块
    │   ├── auth.module.ts       # 认证模块定义
    │   ├── auth.controller.ts   # 认证控制器（登录、注册等）
    │   ├── auth.service.ts      # 认证服务逻辑
    │   ├── dto/                 # 认证相关DTO
    │   │   ├── login.dto.ts     # 登录数据传输对象
    │   │   ├── register.dto.ts  # 注册数据传输对象
    │   │   └── refresh-token.dto.ts # 刷新令牌DTO
    │   └── strategies/          # 认证策略
    │       ├── jwt.strategy.ts  # JWT认证策略
    │       └── local.strategy.ts # 本地认证策略
    │
    ├── user/                    # 用户管理模块
    │   ├── user.module.ts       # 用户模块定义
    │   ├── user.controller.ts   # 用户控制器
    │   ├── user.service.ts      # 用户服务逻辑
    │   ├── entities/            # 用户实体
    │   │   └── user.entity.ts   # 用户数据库实体
    │   └── dto/                 # 用户相关DTO
    │       ├── create-user.dto.ts # 创建用户DTO
    │       ├── update-user.dto.ts # 更新用户DTO
    │       └── user-profile.dto.ts # 用户资料DTO
    │
    ├── divination/              # 占卜功能模块（待开发）
    │   ├── tarot/               # 塔罗牌占卜
    │   ├── astrology/           # 星盘占卜
    │   └── fortune/             # 运势预测
    │
    ├── shop/                    # 商城模块（待开发）
    │   ├── product/             # 商品管理
    │   ├── order/               # 订单管理
    │   └── payment/             # 支付处理
    │
    └── upload/                  # 文件上传模块（待开发）
        ├── upload.module.ts     # 上传模块定义
        ├── upload.controller.ts # 上传控制器
        └── upload.service.ts    # 上传服务逻辑
```

### 测试目录 (test/)
```
test/
├── app.e2e-spec.ts             # 端到端测试
└── jest-e2e.json               # Jest E2E测试配置
```

---

## 前端项目结构 (magicstar-frontend/)

### 根目录文件
```
magicstar-frontend/
├── .editorconfig               # 编辑器配置
├── .eslintrc                   # ESLint配置（旧版）
├── .eslintrc.js               # ESLint配置（新版）
├── .gitignore                 # Git忽略文件
├── .prettierrc                # Prettier代码格式化配置
├── babel.config.js            # Babel转译配置
├── jest.config.ts             # Jest测试框架配置
├── package.json               # NPM包管理和脚本配置
├── package-lock.json          # NPM依赖锁定文件
├── yarn.lock                  # Yarn依赖锁定文件
├── tsconfig.json              # TypeScript编译配置
├── project.config.json        # Taro项目配置
├── project.tt.json            # 头条小程序配置
```

### 配置目录 (config/)
```
config/
├── index.ts                   # Taro配置入口文件
├── dev.js                     # 开发环境配置（JS版）
├── dev.ts                     # 开发环境配置（TS版）
├── prod.js                    # 生产环境配置（JS版）
└── prod.ts                    # 生产环境配置（TS版）
```

### 源代码目录 (src/)
```
src/
├── app.ts                     # 应用程序入口文件
├── app.config.ts              # 应用配置（页面路由、窗口样式等）
├── app.scss                   # 全局样式文件
├── index.html                 # H5版本的HTML模板
│
├── pages/                     # 页面组件目录
│   ├── index/                 # 首页
│   │   ├── index.tsx          # 首页组件
│   │   ├── index.config.ts    # 首页配置
│   │   └── index.scss         # 首页样式
│   │
│   ├── login/                 # 登录页面（待开发）
│   ├── register/              # 注册页面（待开发）
│   ├── profile/               # 个人中心（待开发）
│   ├── tarot/                 # 塔罗牌占卜页面（待开发）
│   ├── astrology/             # 星盘页面（待开发）
│   ├── shop/                  # 商城页面（待开发）
│   └── order/                 # 订单页面（待开发）
│
├── components/                # 公共组件目录（待开发）
│   ├── common/                # 通用组件
│   ├── business/              # 业务组件
│   └── ui/                    # UI组件
│
├── services/                  # API服务目录（待开发）
│   ├── api.ts                 # API基础配置
│   ├── auth.ts                # 认证相关API
│   ├── user.ts                # 用户相关API
│   ├── divination.ts          # 占卜相关API
│   └── shop.ts                # 商城相关API
│
├── store/                     # 状态管理目录（待开发）
│   ├── index.ts               # 状态管理入口
│   ├── modules/               # 状态模块
│   │   ├── user.ts            # 用户状态
│   │   ├── auth.ts            # 认证状态
│   │   └── app.ts             # 应用状态
│   └── types/                 # 状态类型定义
│
├── utils/                     # 工具函数目录（待开发）
│   ├── request.ts             # 网络请求工具
│   ├── storage.ts             # 本地存储工具
│   ├── validator.ts           # 数据验证工具
│   └── common.ts              # 通用工具函数
│
└── styles/                    # 样式文件目录
    ├── variables.scss         # SCSS变量定义
    ├── mixins.scss            # SCSS混入
    ├── base.scss              # 基础样式
    └── components.scss        # 组件样式
```

### 类型定义目录 (types/)
```
types/
└── global.d.ts                # 全局类型定义
```

### 测试目录 (__tests__/)
```
__tests__/
└── index.test.js              # 基础测试文件
```

### Git钩子目录 (.husky/)
```
.husky/
├── _/                         # Husky内部文件
└── pre-commit                 # 提交前钩子（代码检查）
```

---

## 开发规范和约定

### 文件命名规范
- **组件文件**: PascalCase (如: `UserProfile.tsx`)
- **页面文件**: kebab-case (如: `user-profile/index.tsx`)
- **工具文件**: camelCase (如: `requestUtils.ts`)
- **常量文件**: UPPER_SNAKE_CASE (如: `API_CONSTANTS.ts`)

### 目录结构约定
- **按功能模块划分**: 每个业务功能独立成模块
- **按文件类型分层**: controller、service、dto、entity分离
- **公共代码抽取**: 通用组件、工具函数统一管理

### 代码组织原则
- **单一职责**: 每个文件、类、函数只负责一个功能
- **依赖注入**: 使用Nest.js的依赖注入系统
- **接口隔离**: 定义清晰的接口和DTO
- **配置外置**: 所有配置通过环境变量管理

---

## 技术栈说明

### 后端技术栈
- **框架**: Nest.js (企业级Node.js框架)
- **语言**: TypeScript (类型安全的JavaScript)
- **数据库**: MySQL (关系型数据库) + TypeORM (ORM框架)
- **缓存**: Redis (内存数据库)
- **认证**: JWT (JSON Web Token)
- **文档**: Swagger (API文档自动生成)
- **测试**: Jest (单元测试和集成测试)

### 前端技术栈
- **框架**: Taro (多端统一开发框架)
- **UI库**: React (用户界面库)
- **语言**: TypeScript (类型安全的JavaScript)
- **样式**: Sass (CSS预处理器)
- **状态管理**: Redux/Zustand (待选择)
- **UI组件**: Taro UI (多端UI组件库)
- **测试**: Jest (单元测试框架)

### 开发工具
- **代码编辑器**: Trae AI IDE
- **版本控制**: Git
- **代码规范**: ESLint + Prettier
- **提交规范**: Husky + lint-staged
- **包管理**: npm/yarn

---

## 部署架构

### 容器化部署
- **Docker容器化**：前后端应用完全容器化
  - 生产环境Dockerfile：多阶段构建，优化镜像大小
  - 开发环境Dockerfile：支持热重载和调试
  - 健康检查：内置应用健康检查机制
- **Docker Compose**：多环境编排
  - `docker-compose.yml`：生产环境配置
  - `docker-compose.dev.yml`：开发环境配置
  - `docker-compose.monitoring.yml`：监控系统配置
- **多环境支持**：开发、测试、预生产、生产环境隔离

### CI/CD流水线
- **GitHub Actions自动化**：
  - `ci-cd.yml`：主要CI/CD流水线
  - `code-quality.yml`：代码质量检查
  - `test.yml`：自动化测试套件
- **代码质量检查**：
  - ESLint代码规范检查
  - Prettier格式化检查
  - TypeScript类型检查
  - 安全漏洞扫描
- **自动化测试**：
  - 单元测试（Jest）
  - 集成测试（数据库+Redis）
  - E2E测试（Playwright）
  - 性能测试（k6）
- **自动部署**：
  - 容器镜像构建和推送
  - 多环境自动部署
  - 部署状态通知

### 监控与日志
- **Prometheus监控**：
  - 应用指标收集
  - 系统资源监控
  - 自定义业务指标
  - 告警规则配置
- **Grafana可视化**：
  - 实时监控面板
  - 业务指标展示
  - 告警状态可视化
- **ELK日志收集**：
  - Elasticsearch：日志存储
  - Logstash：日志处理
  - Kibana：日志查询和分析
  - Filebeat：日志收集
- **分布式追踪**：Jaeger链路追踪
- **告警通知**：
  - 邮件告警
  - Slack/钉钉/企业微信集成
  - 多级告警策略
  - 告警抑制规则

### 开发环境
- **前端**: 本地开发服务器 (Taro dev server)
- **后端**: 本地Node.js服务器 (Nest.js dev mode)
- **数据库**: 本地MySQL + Redis

### 生产环境
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **数据库**: 云数据库MySQL + Redis
- **CDN**: 静态资源加速
- **监控**: 应用性能监控
- **日志**: 集中式日志收集

---

**文档版本**: v1.0  
**最后更新**: 2024年  
**维护者**: 开发团队