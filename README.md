# MagicStar - 智能占卜平台

一个基于现代技术栈构建的跨平台智能占卜应用，集成塔罗牌占卜、星座运势、AI智能解读和商城功能。

## 项目概述

MagicStar 是一个全栈占卜应用平台，包含前端移动应用和后端API服务。项目采用微服务架构，支持多平台部署，提供完整的占卜服务生态系统。

### 🌟 核心特性

- **🔮 多样化占卜服务**: 塔罗牌、星座运势、个人运势分析
- **🤖 AI智能解读**: 集成百度文心一言，提供个性化解读
- **📱 跨平台支持**: 微信小程序、H5、React Native
- **🛒 完整商城系统**: 商品管理、订单处理、支付集成
- **👤 用户管理系统**: 注册登录、个人资料、历史记录
- **📊 数据分析**: 用户行为分析、业务指标监控
- **🔒 安全保障**: 数据加密、权限控制、隐私保护

## 技术架构

### 前端技术栈
- **框架**: Taro 3.x + React + TypeScript
- **状态管理**: Zustand
- **UI组件**: Taro UI + 自定义主题
- **样式方案**: CSS Modules + PostCSS
- **构建工具**: Webpack 5

### 后端技术栈
- **框架**: Node.js + Nest.js + TypeScript
- **数据库**: MySQL + Redis
- **ORM**: TypeORM
- **认证**: JWT + Passport
- **监控**: Prometheus + Grafana
- **容器化**: Docker + Kubernetes

### 第三方集成
- **AI服务**: 百度文心一言
- **支付**: 微信支付、支付宝
- **云服务**: 阿里云、腾讯云

## 项目结构

```
magicstar/
├── magicstar-frontend/     # 前端应用
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   ├── config/            # 配置文件
│   └── package.json
├── magicstar-backend/      # 后端API
│   ├── src/
│   │   ├── modules/       # 业务模块
│   │   ├── common/        # 公共模块
│   │   ├── config/        # 配置管理
│   │   └── database/      # 数据库相关
│   ├── test/              # 测试文件
│   └── package.json
├── docs/                   # 项目文档
├── docker-compose.yml      # Docker编排
└── README.md              # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Docker (可选)

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd magicstar
```

2. **启动后端服务**
```bash
cd magicstar-backend
npm install
npm run start:dev
```

3. **启动前端应用**
```bash
cd magicstar-frontend
npm install
npm run dev:h5
```

4. **访问应用**
- 后端API: http://localhost:3000
- 前端H5: http://localhost:10086
- API文档: http://localhost:3000/api

### Docker部署

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 功能模块

### 占卜服务
- **塔罗牌占卜**: 支持多种牌阵（单张牌、三张牌、Celtic Cross等）
- **星座运势**: 每日、每周、每月运势查询
- **个人分析**: 基于用户信息的个性化运势分析
- **AI解读**: 智能生成占卜结果解释

### 用户系统
- **认证授权**: 注册、登录、密码重置
- **个人资料**: 用户信息管理、头像上传
- **历史记录**: 占卜历史、收藏管理
- **会员系统**: 会员等级、权益管理

### 商城功能
- **商品管理**: 商品展示、分类筛选、搜索
- **购物车**: 商品添加、数量调整、批量操作
- **订单系统**: 下单、支付、物流跟踪
- **支付集成**: 微信支付、支付宝支付

### 管理后台
- **用户管理**: 用户列表、权限管理
- **内容管理**: 商品管理、内容审核
- **数据统计**: 业务指标、用户行为分析
- **系统监控**: 服务状态、性能监控

## API文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新Token

### 占卜服务
- `GET /api/divination/tarot/cards` - 获取塔罗牌列表
- `POST /api/divination/tarot/draw` - 抽取塔罗牌
- `POST /api/divination/horoscope` - 获取星座运势

### 商城功能
- `GET /api/shop/products` - 获取商品列表
- `POST /api/shop/cart/add` - 添加到购物车
- `POST /api/shop/orders` - 创建订单

详细API文档请访问: http://localhost:3000/api

## 部署指南

### 生产环境部署

1. **环境准备**
   - 服务器配置（推荐4核8G以上）
   - 域名和SSL证书
   - 数据库服务（MySQL、Redis）

2. **后端部署**
```bash
# 构建应用
npm run build

# 使用PM2部署
pm2 start dist/main.js --name magicstar-backend

# 或使用Docker
docker build -t magicstar-backend .
docker run -d -p 3000:3000 magicstar-backend
```

3. **前端部署**
```bash
# 构建生产版本
npm run build:h5

# 部署到CDN或静态服务器
# 配置Nginx反向代理
```

### 监控和维护

- **健康检查**: `/health` 端点监控服务状态
- **指标收集**: Prometheus收集业务和系统指标
- **日志管理**: 结构化日志，支持日志聚合
- **错误追踪**: 集成错误监控服务

## 开发规范

### 代码规范
- 使用 ESLint + Prettier 进行代码格式化
- 遵循 TypeScript 严格模式
- 组件和函数命名采用语义化命名
- 提交信息遵循 Conventional Commits 规范

### 分支管理
- `main`: 生产环境分支
- `develop`: 开发环境分支
- `feature/*`: 功能开发分支
- `hotfix/*`: 紧急修复分支

### 测试策略
- 单元测试覆盖率 ≥ 80%
- 集成测试覆盖核心业务流程
- E2E测试覆盖主要用户路径

## 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目到你的GitHub账户
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 贡献类型
- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX优化
- ⚡ 性能优化
- 🔒 安全增强

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系我们

- **项目维护者**: MagicStar Team
- **邮箱**: support@magicstar.com
- **官网**: https://www.magicstar.com
- **GitHub**: https://github.com/magicstar/magicstar
- **问题反馈**: https://github.com/magicstar/magicstar/issues

## 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！