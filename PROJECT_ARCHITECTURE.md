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
├── .github/                      # GitHub Actions CI/CD配置
│   └── workflows/
│       ├── ci-cd.yml            # 主要CI/CD流水线
│       ├── code-quality.yml     # 代码质量检查工作流
│       └── test.yml             # 自动化测试工作流
├── TASK_ROADMAP.md              # 项目任务路线图和进度跟踪
├── PROJECT_ARCHITECTURE.md      # 项目架构文档（本文件）
├── DEVOPS_README.md             # DevOps基础设施使用文档
├── deploy.sh                    # 部署脚本（支持多环境一键部署）
├── docker-compose.yml           # 生产环境Docker编排配置
├── docker-compose.dev.yml       # 开发环境Docker编排配置
├── docker-compose.monitoring.yml # 监控系统Docker编排配置
├── .dockerignore                # Docker构建忽略文件
├── docker/                      # Docker相关配置文件
│   ├── mysql/
│   │   └── init/                # MySQL初始化脚本目录
│   │       └── 01-init.sql      # 数据库初始化SQL脚本
│   ├── nginx/
│   │   ├── nginx.conf           # Nginx生产环境配置
│   │   └── ssl/                 # SSL证书存放目录
│   └── redis/
│       └── redis.conf           # Redis配置文件
├── monitoring/                  # 监控系统配置目录
│   ├── prometheus/              # Prometheus监控配置
│   │   ├── prometheus.yml       # Prometheus主配置文件
│   │   └── rules/
│   │       └── alerts.yml       # 告警规则配置
│   ├── grafana/                 # Grafana可视化配置
│   │   ├── dashboards/          # 仪表板配置目录
│   │   └── provisioning/        # 数据源和仪表板自动配置
│   │       ├── datasources/     # 数据源配置
│   │       └── dashboards/      # 仪表板自动配置
│   ├── alertmanager/            # 告警管理器配置
│   │   └── alertmanager.yml     # 告警路由和通知配置
│   ├── logstash/                # Logstash日志处理配置
│   │   ├── config/              # Logstash配置文件
│   │   └── pipeline/            # 日志处理管道配置
│   └── filebeat/                # Filebeat日志收集配置
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
├── Dockerfile                   # 生产环境Docker镜像构建文件
├── Dockerfile.dev               # 开发环境Docker镜像构建文件
├── healthcheck.js               # Docker健康检查脚本
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
│   ├── dto/                     # 数据传输对象基类
│   └── services/                # 通用服务 ✅ 已完成
│       ├── sms.service.ts       # 短信服务
│       │                        # - 短信验证码发送
│       │                        # - 验证码生成和验证
│       │                        # - 手机号格式验证
│       │                        # - 发送频率限制
│       └── email.service.ts     # 邮件服务
│                                # - 邮箱验证邮件发送
│                                # - 密码重置邮件发送
│                                # - 邮件模板管理
│                                # - SMTP配置管理
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
    ├── auth/                    # 认证授权模块 ✅ 已完成
    │   ├── auth.module.ts       # 认证模块定义
    │   ├── auth.controller.ts   # 认证控制器（登录、注册等）
    │   ├── auth.service.ts      # 认证服务逻辑 ✅ 完整实现
    │   │                        # - 邮箱/手机号注册
    │   │                        # - 多种登录方式（用户名/邮箱/手机号+密码）
    │   │                        # - 手机号+短信验证码登录
    │   │                        # - JWT令牌生成和刷新
    │   │                        # - 密码重置和修改
    │   │                        # - 登录失败次数限制和账户锁定
    │   │                        # - 邮箱验证功能
    │   ├── dto/                 # 认证相关DTO ✅ 已完成
    │   │   ├── login.dto.ts     # 登录数据传输对象
    │   │   └── register.dto.ts  # 注册数据传输对象
    │   └── strategies/          # 认证策略
    │       ├── jwt.strategy.ts  # JWT认证策略
    │       └── local.strategy.ts # 本地认证策略
    │
    ├── user/                    # 用户管理模块 ✅ 已完成
    │   ├── user.module.ts       # 用户模块定义
    │   ├── user.controller.ts   # 用户控制器
    │   ├── user.service.ts      # 用户服务逻辑
    │   ├── entities/            # 用户实体 ✅ 已完成
    │   │   ├── user.entity.ts   # 用户数据库实体
    │   │   │                    # - 完整用户信息字段
    │   │   │                    # - 邮箱/手机号验证状态
    │   │   │                    # - 登录失败次数和锁定机制
    │   │   │                    # - 密码重置令牌管理
    │   │   │                    # - 短信验证码管理
    │   │   │                    # - RBAC权限关联
    │   │   └── role.entity.ts   # 角色权限实体
    │   └── dto/                 # 用户相关DTO ✅ 已完成
    │       ├── create-user.dto.ts # 创建用户DTO
    │       ├── update-user.dto.ts # 更新用户DTO
    │       ├── update-profile.dto.ts # 个人资料更新DTO
    │       ├── update-avatar.dto.ts # 头像更新DTO
    │       ├── update-security.dto.ts # 安全设置DTO
    │       └── user-profile.dto.ts # 用户资料DTO
    │
    ├── divination/              # 占卜功能模块 ✅ 已完成
    │   ├── divination.module.ts # 占卜模块定义
    │   ├── divination.controller.ts # 占卜控制器
    │   ├── divination.service.ts # 占卜服务逻辑
    │   ├── tarot/               # 塔罗牌占卜 ✅ 已完成
    │   ├── tarot.module.ts  # 塔罗牌模块定义
    │   ├── tarot.controller.ts # 塔罗牌控制器
    │   │                    # - GET /spreads 获取牌阵列表
    │   │                    # - GET /cards 获取卡片列表
    │   │                    # - POST /divination 执行占卜
    │   │                    # - GET /history 获取历史记录
    │   │                    # - GET /history/:id 获取占卜详情
    │   │                    # - POST /share 分享占卜结果
    │   │                    # - DELETE /history/:id 删除记录
    │   ├── tarot.service.ts # 塔罗牌服务逻辑
    │   │                    # - 牌阵和卡片数据管理
    │   │                    # - 占卜记录CRUD操作
    │   │                    # - 分享功能实现
    │   ├── tarot-algorithm.service.ts # 塔罗牌算法服务
    │   │                    # - 随机抽牌算法
    │   │                    # - 牌阵解读逻辑
    │   │                    # - 结果生成算法
    │   │                    # - 正逆位判断
    │   ├── entities/        # 塔罗牌实体
    │   │   ├── tarot-card.entity.ts # 塔罗牌实体
    │   │   ├── tarot-spread.entity.ts # 牌阵实体
    │   │   └── divination-record.entity.ts # 占卜记录实体
    │   └── dto/             # 塔罗牌DTO
    │       ├── create-divination.dto.ts # 创建占卜DTO
    │       ├── divination-history-query.dto.ts # 历史查询DTO
    │       └── share-result.dto.ts # 分享结果DTO
    │   ├── astrology/           # 星盘占卜（待开发）
    │   └── fortune/             # 运势预测（待开发）
    │
    ├── fortune/                 # 运势模块 ✅
│   ├── entities/            # 数据实体定义
│   │   ├── fortune-template.entity.ts    # 运势模板实体
│   │   ├── user-fortune.entity.ts        # 用户运势实体
│   │   └── fortune-history.entity.ts     # 运势历史实体
│   ├── dto/                 # 数据传输对象
│   │   ├── create-fortune-template.dto.ts # 创建运势模板DTO
│   │   ├── update-fortune-template.dto.ts # 更新运势模板DTO
│   │   ├── get-fortune.dto.ts             # 获取运势DTO
│   │   └── get-fortune-history.dto.ts     # 获取运势历史DTO
│   ├── fortune.module.ts    # 运势模块定义
│   ├── fortune.controller.ts # 运势控制器
│   │                        # - GET /fortune/daily 获取今日运势
│   │                        # - GET /fortune/weekly 获取本周运势
│   │                        # - GET /fortune/monthly 获取本月运势
│   │                        # - GET /fortune/history 获取运势历史
│   ├── fortune-admin.controller.ts # 运势管理控制器
│   │                        # - POST /fortune/admin/seed 初始化模板数据
│   │                        # - POST /fortune/admin/reset 重置模板数据
│   │                        # - DELETE /fortune/admin/cache 清除缓存
│   │                        # - POST /fortune/admin/cache/refresh 刷新缓存
│   │                        # - GET /fortune/admin/cache/stats 缓存统计
│   │                        # - GET /fortune/admin/templates/count 模板统计
│   ├── fortune.service.ts   # 运势业务逻辑服务
│   │                        # - 用户运势获取和生成
│   │                        # - 运势历史记录管理
│   │                        # - 运势模板数据处理
│   ├── fortune-data.service.ts # 运势数据管理服务
│   │                        # - 运势模板数据缓存
│   │                        # - 星座运势数据获取
│   │                        # - 生肖运势数据获取
│   │                        # - 通用运势模板管理
│   │                        # - 缓存策略实现
│   ├── fortune-seed.service.ts # 运势数据初始化服务
│   │                        # - 运势模板数据种子
│   │                        # - 初始化和重置功能
│   └── fortune-algorithm.service.ts # 运势算法服务
│                            # - 今日运势算法
│                            # - 本周运势算法
│                            # - 本月运势算法
│                            # - 个性化推荐逻辑
│                            # - 模板选择算法
    │
    ├── shop/                    # 商城模块 ✅ 已完成
    │   ├── shop.module.ts       # 商城模块定义
    │   ├── entities/            # 商城数据实体 ✅ 已完成
    │   │   ├── product.entity.ts         # 商品实体
    │   │   │                    # - 商品基础信息（名称、描述、价格等）
    │   │   │                    # - 库存管理（数量、预警阈值）
    │   │   │                    # - 商品状态（上架、下架、草稿）
    │   │   │                    # - 商品类型和特色标签
    │   │   │                    # - SEO优化字段
    │   │   ├── product-category.entity.ts # 商品分类实体
    │   │   │                    # - 分类层级结构
    │   │   │                    # - 分类图标和描述
    │   │   │                    # - 排序和状态管理
    │   │   ├── product-image.entity.ts   # 商品图片实体
    │   │   │                    # - 图片URL和类型（主图/详情图）
    │   │   │                    # - 图片排序和Alt文本
    │   │   ├── cart-item.entity.ts       # 购物车项实体
    │   │   │                    # - 用户购物车商品管理
    │   │   │                    # - 商品选项和数量
    │   │   │                    # - 添加时间和备注
    │   │   ├── order.entity.ts           # 订单实体
    │   │   │                    # - 订单基础信息和状态
    │   │   │                    # - 订单金额计算
    │   │   │                    # - 订单号生成和时间戳
    │   │   ├── order-item.entity.ts      # 订单项实体
    │   │   │                    # - 订单商品详情
    │   │   │                    # - 商品快照信息
    │   │   │                    # - 价格和数量记录
    │   │   ├── order-address.entity.ts   # 订单地址实体
    │   │   │                    # - 收货地址和账单地址
    │   │   │                    # - 地址格式化显示
    │   │   │                    # - 联系人信息
    │   │   └── payment.entity.ts         # 支付记录实体
    │   │                        # - 支付方式和状态
    │   │                        # - 支付金额和时间
    │   │                        # - 第三方支付流水号
    │   ├── payment/             # 支付模块 ✅ 已完成
    │   │   ├── payment.module.ts         # 支付模块定义
    │   │   ├── payment.controller.ts     # 支付控制器
    │   │   │                    # - POST /payment/create 创建支付订单
    │   │   │                    # - POST /payment/notify 支付回调通知
    │   │   │                    # - GET /payment/status/:id 查询支付状态
    │   │   │                    # - POST /payment/refund 申请退款
    │   │   │                    # - GET /payment/methods 获取支付方式
    │   │   ├── payment.service.ts       # 支付服务逻辑
    │   │   │                    # - 支付订单创建和管理
    │   │   │                    # - 第三方支付接口集成
    │   │   │                    # - 支付状态同步和验证
    │   │   │                    # - 退款处理流程
    │   │   ├── providers/              # 支付提供商
    │   │   │   ├── alipay.service.ts   # 支付宝支付服务
    │   │   │   ├── wechat.service.ts   # 微信支付服务
    │   │   │   └── base-payment.service.ts # 支付基础服务
    │   │   ├── dto/                    # 支付相关DTO
    │   │   │   ├── create-payment.dto.ts # 创建支付DTO
    │   │   │   ├── payment-notify.dto.ts # 支付通知DTO
    │   │   │   └── refund.dto.ts        # 退款DTO
    │   │   └── interfaces/             # 支付接口定义
    │   │       ├── payment-provider.interface.ts # 支付提供商接口
    │   │       └── payment-config.interface.ts   # 支付配置接口
    │   ├── dto/                 # 商城数据传输对象 ✅ 已完成
    │   │   ├── product.dto.ts            # 商品相关DTO
    │   │   │                    # - 创建/更新商品DTO
    │   │   │                    # - 商品查询和搜索DTO
    │   │   ├── product-query.dto.ts      # 商品查询DTO
    │   │   │                    # - 分页、过滤、排序参数
    │   │   │                    # - 搜索关键词和分类筛选
    │   │   │                    # - 价格范围和库存状态
    │   │   ├── cart.dto.ts               # 购物车相关DTO
    │   │   │                    # - 添加到购物车DTO
    │   │   │                    # - 购物车项更新DTO
    │   │   │                    # - 购物车汇总响应DTO
    │   │   └── order.dto.ts              # 订单相关DTO
    │   │                        # - 创建订单DTO
    │   │                        # - 订单状态更新DTO
    │   │                        # - 订单查询和响应DTO
    │   ├── services/            # 商城业务服务 ✅ 已完成
    │   │   ├── product.service.ts        # 商品服务
    │   │   │                    # - 商品CRUD操作
    │   │   │                    # - 商品查询和搜索
    │   │   │                    # - 库存管理和更新
    │   │   │                    # - 商品推荐算法
    │   │   ├── cart.service.ts           # 购物车服务
    │   │   │                    # - 购物车商品管理
    │   │   │                    # - 购物车验证和汇总
    │   │   │                    # - 游客购物车同步
    │   │   └── order.service.ts          # 订单服务
    │   │                        # - 订单创建和管理
    │   │                        # - 订单状态流转
    │   │                        # - 库存扣减和恢复
    │   │                        # - 订单统计功能
    │   └── controllers/         # 商城控制器 ✅ 已完成
    │       ├── product.controller.ts     # 商品控制器
    │       │                    # - GET /products 商品列表
    │       │                    # - GET /products/:id 商品详情
    │       │                    # - POST /products 创建商品
    │       │                    # - PUT /products/:id 更新商品
    │       │                    # - DELETE /products/:id 删除商品
    │       │                    # - GET /products/search 商品搜索
    │       │                    # - GET /products/featured 特色商品
    │       │                    # - GET /products/recommended 推荐商品
    │       ├── cart.controller.ts        # 购物车控制器
    │       │                    # - POST /cart/items 添加到购物车
    │       │                    # - GET /cart/items 获取购物车列表
    │       │                    # - PUT /cart/items/:id 更新购物车项
    │       │                    # - DELETE /cart/items/:id 删除购物车项
    │       │                    # - GET /cart/summary 购物车汇总
    │       │                    # - POST /cart/validate 验证购物车
    │       └── order.controller.ts       # 订单控制器
    │                            # - POST /orders 创建订单
    │                            # - GET /orders 订单列表
    │                            # - GET /orders/:id 订单详情
    │                            # - PUT /orders/:id/status 更新订单状态
    │                            # - POST /orders/:id/cancel 取消订单
    │                            # - GET /orders/my 我的订单
    │                            # - GET /orders/stats 订单统计
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
├── Dockerfile                  # 生产环境Docker镜像构建文件
├── nginx.conf                  # 前端Nginx服务器配置
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
├── pages/                     # 页面组件目录 ✅ 已完成
│   ├── index/                 # 首页 ✅ 已完成
│   │   ├── index.tsx          # 首页组件（轮播图、快捷操作、今日运势）
│   │   ├── index.config.ts    # 首页配置
│   │   └── index.scss         # 首页样式
│   │
│   ├── login/                 # 登录页面 ✅ 已完成
│   │   ├── index.tsx          # 登录组件（用户名密码登录）
│   │   ├── index.config.ts    # 登录页面配置
│   │   └── index.scss         # 登录页面样式
│   │
│   ├── register/              # 注册页面 ✅ 已完成
│   │   ├── index.tsx          # 注册组件（用户名、邮箱、手机、密码）
│   │   ├── index.config.ts    # 注册页面配置
│   │   └── index.scss         # 注册页面样式
│   │
│   ├── profile/               # 个人中心 ✅ 已完成
│   │   ├── index.tsx          # 个人中心组件（用户信息、功能入口）
│   │   ├── index.config.ts    # 个人中心配置
│   │   └── index.scss         # 个人中心样式
│   │
│   ├── divination/            # 占卜页面 ✅ 已完成
│   │   ├── index.tsx          # 占卜组件（塔罗、星盘、运势预测）
│   │   ├── index.config.ts    # 占卜页面配置
│   │   └── index.scss         # 占卜页面样式
│   │
│   ├── tarot/                 # 塔罗牌占卜页面 ✅ 已完成
│   │   ├── index.tsx          # 塔罗牌主页（牌阵选择、历史记录入口）
│   │   ├── index.config.ts    # 塔罗牌主页配置
│   │   ├── index.scss         # 塔罗牌主页样式
│   │   ├── draw/              # 抽牌页面
│   │   │   ├── index.tsx      # 抽牌组件（问题输入、卡牌选择、抽牌流程）
│   │   │   ├── index.config.ts # 抽牌页面配置
│   │   │   └── index.scss     # 抽牌页面样式
│   │   ├── result/            # 结果展示页面
│   │   │   ├── index.tsx      # 结果组件（卡牌展示、解读内容、分享功能）
│   │   │   ├── index.config.ts # 结果页面配置
│   │   │   └── index.scss     # 结果页面样式
│   │   └── history/           # 历史记录页面
│   │       ├── index.tsx      # 历史记录组件（记录列表、详情查看、删除功能）
│   │       ├── index.config.ts # 历史记录页面配置
│   │       └── index.scss     # 历史记录页面样式
│   ├── fortune/               # 运势展示页面 ✅ 已完成
│   │   ├── index.tsx          # 运势主页（日/周/月运势切换、运势概览、幸运元素）
│   │   ├── index.config.ts    # 运势主页配置
│   │   ├── index.scss         # 运势主页样式
│   │   ├── history/           # 运势历史记录页面
│   │   │   ├── index.tsx      # 历史记录组件（记录列表、搜索筛选、详情查看）
│   │   │   ├── index.config.ts # 历史记录页面配置
│   │   │   └── index.scss     # 历史记录页面样式
│   │   ├── trend/             # 运势趋势图表页面
│   │   │   ├── index.tsx      # 趋势图表组件（统计概览、折线图、柱状图）
│   │   │   ├── index.config.ts # 趋势图表页面配置
│   │   │   └── index.scss     # 趋势图表页面样式
│   │   ├── detail/            # 运势详情页面
│   │   │   ├── index.tsx      # 详情组件（详细分析、运势建议、分享功能）
│   │   │   ├── index.config.ts # 详情页面配置
│   │   │   └── index.scss     # 详情页面样式
│   │   └── reminder/          # 运势提醒设置页面
│   │       ├── index.tsx      # 提醒设置组件（频率设置、内容选择、通知方式）
│   │       ├── index.config.ts # 提醒设置页面配置
│   │       └── index.scss     # 提醒设置页面样式
│   ├── astrology/             # 星盘页面（待开发）
│   ├── shop/                  # 商城页面（待开发）
│   └── order/                 # 订单页面（待开发）
│
├── components/                # 公共组件目录（待开发）
│   ├── common/                # 通用组件
│   ├── business/              # 业务组件
│   └── ui/                    # UI组件
│
├── assets/                    # 静态资源目录 ✅ 已完成
│   ├── images/                # 图片资源
│   ├── icons/                 # 图标资源 ✅ 已完成
│   │   ├── home.svg           # 首页图标
│   │   ├── home-active.svg    # 首页激活图标
│   │   ├── divination.svg     # 占卜图标
│   │   ├── divination-active.svg # 占卜激活图标
│   │   ├── profile.svg        # 个人中心图标
│   │   └── profile-active.svg # 个人中心激活图标
│   └── fonts/                 # 字体资源
│
├── services/                  # API服务目录 ✅ 已完成
│   ├── api.ts                 # API基础配置 ✅ 已完成
│   │                          # - 请求拦截器（添加认证token、通用请求头）
│   │                          # - 响应拦截器（处理错误、状态码）
│   │                          # - 通用请求方法（get、post、put、delete）
│   ├── tarot.ts               # 塔罗牌相关API ✅ 已完成
│   │                          # - TarotService类实现
│   │                          # - getSpreads() 获取牌阵列表
│   │                          # - getCards() 获取卡片列表
│   │                          # - performDivination() 执行占卜
│   │                          # - getHistory() 获取历史记录
│   │                          # - getRecordDetail() 获取记录详情
│   │                          # - shareResult() 分享结果
│   │                          # - deleteRecord() 删除记录
│   ├── auth.ts                # 认证相关API（待开发）
│   ├── user.ts                # 用户相关API（待开发）
│   └── shop.ts                # 商城相关API（待开发）
│
├── store/                     # 状态管理目录 ✅ 已完成
│   ├── index.ts               # 状态管理入口
│   ├── user.ts                # 用户状态管理（登录状态、用户信息）
│   └── app.ts                 # 应用状态管理（加载状态、主题、网络状态）
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

## DevOps 基础设施目录结构

### GitHub Actions 工作流 (.github/workflows/)
```
.github/workflows/
├── ci-cd.yml                    # 主要CI/CD流水线
│                                # - 代码质量检查和安全扫描
│                                # - Docker镜像构建和推送
│                                # - 自动化部署到开发/生产环境
├── code-quality.yml             # 代码质量检查工作流
│                                # - ESLint、Prettier格式检查
│                                # - TypeScript类型检查
│                                # - 依赖安全审计
└── test.yml                     # 自动化测试工作流
                                 # - 单元测试、集成测试
                                 # - E2E测试、性能测试
                                 # - 测试覆盖率报告
```

### Docker 配置目录 (docker/)
```
docker/
├── mysql/
│   └── init/
│       └── 01-init.sql          # MySQL数据库初始化脚本
│                                # - 创建数据库和表结构
│                                # - 插入默认数据和测试数据
├── nginx/
│   ├── nginx.conf               # 生产环境Nginx配置
│   │                            # - HTTPS配置、负载均衡
│   │                            # - 静态资源服务、API代理
│   │                            # - 安全头、限流配置
│   └── ssl/                     # SSL证书存放目录
└── redis/
    └── redis.conf               # Redis配置文件
                                 # - 持久化配置（RDB+AOF）
                                 # - 内存管理、安全配置
                                 # - 性能优化参数
```

### 监控系统配置 (monitoring/)
```
monitoring/
├── prometheus/                  # Prometheus监控配置
│   ├── prometheus.yml           # 主配置文件
│   │                            # - 抓取目标配置
│   │                            # - 告警管理器集成
│   │                            # - 服务发现配置
│   └── rules/
│       └── alerts.yml           # 告警规则配置
│                                # - 服务可用性告警
│                                # - 资源使用率告警
│                                # - 应用性能告警
├── grafana/                     # Grafana可视化配置
│   ├── dashboards/              # 自定义仪表板
│   └── provisioning/            # 自动配置
│       ├── datasources/         # 数据源自动配置
│       └── dashboards/          # 仪表板自动导入
├── alertmanager/                # 告警管理器配置
│   └── alertmanager.yml         # 告警路由和通知配置
│                                # - 邮件、Slack、钉钉通知
│                                # - 告警分组和抑制规则
├── logstash/                    # 日志处理配置
│   ├── config/                  # Logstash配置文件
│   └── pipeline/                # 日志处理管道
└── filebeat/                    # 日志收集配置
                                 # - 应用日志收集
                                 # - 系统日志收集
```

### Docker Compose 编排文件
```
├── docker-compose.yml           # 生产环境编排
│                                # - 前后端服务、数据库
│                                # - Nginx反向代理
│                                # - 网络和卷配置
├── docker-compose.dev.yml       # 开发环境编排
│                                # - 开发模式服务配置
│                                # - Adminer、Redis Commander
│                                # - 热重载和调试支持
└── docker-compose.monitoring.yml # 监控系统编排
                                 # - Prometheus、Grafana
                                 # - ELK Stack、Jaeger
                                 # - 完整监控栈部署
```

### 部署和文档
```
├── deploy.sh                    # 一键部署脚本
│                                # - 多环境支持（dev/prod/monitoring）
│                                # - 服务管理（启动/停止/重启）
│                                # - 日志查看和状态检查
├── .dockerignore                # Docker构建优化
│                                # - 排除不必要文件
│                                # - 减少镜像大小
└── DEVOPS_README.md             # DevOps使用文档
                                 # - 环境搭建指南
                                 # - 常用操作说明
                                 # - 故障排除指南
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

## 安全测试与审计

### 安全测试结果 (2024年12月)

#### ✅ 已通过的安全检查
- **依赖包安全扫描**: npm audit - 0个安全漏洞
- **认证机制**: JWT认证已实现，包含认证守卫和权限控制
- **输入验证**: ValidationPipe已实现请求参数验证
- **异常处理**: 全局异常过滤器已配置
- **环境变量保护**: .env文件已正确配置在.gitignore中
- **Redis安全**: 配置了密码保护(requirepass)
- **Nginx安全**: 配置了限流、安全头、SSL等安全措施
- **Docker安全**: 使用非root用户运行容器

#### 🔴 发现的高风险安全问题
1. **缺少CORS配置**: 后端应用未配置CORS策略
2. **缺少全局限流保护**: 应用未配置全局API限流
3. **缺少安全头配置**: 应用未配置HTTP安全头

#### 🟡 发现的中风险安全问题
1. **缺少请求体大小限制**: 未配置全局请求体大小限制
2. **缺少全局ValidationPipe配置**: ValidationPipe未在全局范围内配置

### 安全配置改进建议

#### 立即修复 (高风险)
```typescript
// main.ts 安全配置
import helmet from 'helmet';

// 1. 安全头配置
app.use(helmet());

// 2. CORS配置
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// 3. 全局ValidationPipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

#### 需要安装的安全依赖
```bash
npm install @nestjs/throttler helmet express-rate-limit
```

#### 安全审计报告
详细的安全审计报告请参考: `SECURITY_AUDIT_REPORT.md`

---

**文档版本**: v1.1  
**最后更新**: 2024年12月 (添加安全测试结果)  
**维护者**: 开发团队