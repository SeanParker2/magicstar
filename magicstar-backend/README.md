# MagicStar Backend API

基于 NestJS 构建的星座占卜应用后端服务，提供用户管理、占卜服务、商城功能和AI集成等核心功能。

## 项目概述

MagicStar Backend 是一个现代化的微服务架构应用，采用 TypeScript + NestJS 开发，集成了多种第三方服务和AI能力。

### 核心功能

- **用户系统**：注册、登录、个人资料管理
- **占卜服务**：塔罗牌占卜、星座运势、个性化解读
- **商城系统**：商品管理、订单处理、支付集成
- **AI集成**：百度文心一言API、智能解读生成
- **内容管理**：占卜内容、推荐算法
- **监控系统**：Prometheus指标、健康检查

### 技术栈

- **框架**：NestJS 10.x + TypeScript
- **数据库**：MySQL 8.0 + TypeORM
- **缓存**：Redis 7.x
- **认证**：JWT + Passport
- **文档**：Swagger/OpenAPI
- **监控**：Prometheus + Grafana
- **测试**：Jest + Supertest
- **容器化**：Docker + Docker Compose

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 7.0
- Docker & Docker Compose (可选)

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境配置文件：
```bash
cp .env.example .env
cp .env.ai.example .env.ai
```

2. 配置数据库连接：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=magicstar
```

3. 配置Redis：
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

4. 配置AI服务（.env.ai）：
```env
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

### 数据库初始化

```bash
# 运行数据库迁移
npm run migration:run

# 填充种子数据
npm run seed:run
```

### 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod

# 调试模式
npm run start:debug
```

### 使用Docker

```bash
# 启动所有服务
docker-compose up -d

# 仅启动依赖服务（MySQL + Redis）
docker-compose up -d mysql redis
```

## API文档

启动服务后，访问以下地址查看API文档：

- **Swagger UI**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/health
- **监控指标**: http://localhost:3000/metrics

### 主要API端点

#### 用户认证
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新Token
- `POST /auth/logout` - 用户登出

#### 用户管理
- `GET /users/profile` - 获取用户信息
- `PUT /users/profile` - 更新用户信息
- `POST /users/avatar` - 上传头像

#### 占卜服务
- `POST /tarot/draw` - 抽取塔罗牌
- `POST /tarot/interpret` - 获取解读
- `GET /tarot/history` - 占卜历史
- `GET /fortune/daily` - 每日运势

#### 商城功能
- `GET /products` - 商品列表
- `GET /products/:id` - 商品详情
- `POST /orders` - 创建订单
- `POST /payments/create` - 创建支付

#### AI服务
- `POST /ai/interpret` - AI解读
- `POST /ai/chat` - AI对话
- `GET /ai/templates` - 提示词模板

## 测试

```bash
# 单元测试
npm run test

# 集成测试
npm run test:e2e

# 测试覆盖率
npm run test:cov

# 监听模式
npm run test:watch
```

## 部署

### 生产环境部署

1. **构建应用**：
```bash
npm run build
```

2. **使用PM2部署**：
```bash
npm install -g pm2
pm2 start dist/main.js --name magicstar-backend
```

3. **使用Docker部署**：
```bash
# 构建镜像
docker build -t magicstar-backend .

# 运行容器
docker run -d -p 3000:3000 --name magicstar-backend magicstar-backend
```

4. **使用Docker Compose**：
```bash
docker-compose -f docker-compose.yml up -d
```

### 环境变量配置

生产环境需要配置以下关键环境变量：

```env
# 应用配置
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret

# 数据库配置
DB_HOST=your_db_host
DB_PORT=3306
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=magicstar

# Redis配置
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# AI服务配置
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

## 监控与日志

### Prometheus指标

应用集成了Prometheus指标收集，包括：

- HTTP请求指标
- 数据库连接池状态
- Redis连接状态
- 自定义业务指标

访问 `http://localhost:3000/metrics` 查看指标。

### 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/health/db

# 检查Redis连接
curl http://localhost:3000/health/redis
```

### 日志管理

应用使用结构化日志，支持不同级别：

- `error`: 错误日志
- `warn`: 警告日志
- `info`: 信息日志
- `debug`: 调试日志

## 开发指南

### 代码规范

项目使用ESLint和Prettier进行代码格式化：

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 数据库迁移

```bash
# 生成新的迁移文件
npm run migration:generate -- -n MigrationName

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

### 添加新模块

```bash
# 生成新模块
nest g module module-name

# 生成控制器
nest g controller module-name

# 生成服务
nest g service module-name
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证连接配置是否正确
   - 确认网络连接是否正常

2. **Redis连接失败**
   - 检查Redis服务状态
   - 验证Redis配置
   - 检查防火墙设置

3. **AI服务调用失败**
   - 验证API密钥是否正确
   - 检查网络连接
   - 查看API配额是否用完

### 调试技巧

```bash
# 启用调试模式
DEBUG=* npm run start:dev

# 查看详细日志
LOG_LEVEL=debug npm run start:dev
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
- 项目地址：https://github.com/magicstar/magicstar-backend
