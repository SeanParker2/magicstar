# MagicStar 开发指南

## 📖 文档说明

本文档面向开发团队，提供详细的开发环境搭建、开发流程、调试技巧等实用信息，帮助新成员快速上手项目开发。

---

## 🚀 快速开始

### 环境要求

#### 必需软件
- **Node.js**: v18.0.0 或更高版本
- **npm**: v8.0.0 或更高版本 (或使用 yarn)
- **Git**: 版本控制工具
- **MySQL**: v8.0 或更高版本
- **Redis**: v6.0 或更高版本

#### 推荐工具
- **VS Code**: 代码编辑器
- **Postman**: API测试工具
- **MySQL Workbench**: 数据库管理工具
- **Redis Desktop Manager**: Redis可视化工具

### 项目克隆与安装

```bash
# 1. 克隆项目
git clone <repository-url>
cd magicstar

# 2. 安装根目录依赖
npm install

# 3. 安装后端依赖
cd magicstar-backend
npm install

# 4. 安装前端依赖
cd ../magicstar-frontend
npm install --legacy-peer-deps

# 5. 返回根目录
cd ..
```

### 环境配置

#### 后端环境配置

```bash
# 复制环境变量模板
cd magicstar-backend
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=magicstar
DB_PASSWORD=your_password
DB_DATABASE=magicstar

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# AI服务配置
AI_API_KEY=your_ai_api_key
AI_BASE_URL=https://aip.baidubce.com

# 支付配置
WECHAT_PAY_APP_ID=your_wechat_app_id
WECHAT_PAY_MCH_ID=your_wechat_mch_id
ALIPAY_APP_ID=your_alipay_app_id
```

#### 数据库初始化

```bash
# 启动MySQL服务
brew services start mysql

# 登录MySQL并创建数据库
mysql -u root -p

# 在MySQL中执行
CREATE DATABASE magicstar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'magicstar'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON magicstar.* TO 'magicstar'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Redis启动

```bash
# 启动Redis服务
brew services start redis

# 验证Redis连接
redis-cli ping
# 应该返回 PONG
```

---

## 🛠️ 开发流程

### 启动开发服务

#### 后端服务启动

```bash
# 进入后端目录
cd magicstar-backend

# 开发模式启动 (热重载)
npm run start:dev

# 或者调试模式启动
npm run start:debug
```

服务启动后访问：
- API服务: http://localhost:3000
- Swagger文档: http://localhost:3000/api
- 健康检查: http://localhost:3000/health

#### 前端服务启动

```bash
# 进入前端目录
cd magicstar-frontend

# 微信小程序开发
npm run dev:weapp

# H5开发
npm run dev:h5

# 支付宝小程序开发
npm run dev:alipay
```

### 数据库迁移

```bash
# 在后端目录执行
cd magicstar-backend

# 生成迁移文件
npm run migration:generate -- -n CreateUserTable

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert

# 初始化种子数据
npm run seed:run
```

---

## 🧪 测试指南

### 单元测试

```bash
# 后端单元测试
cd magicstar-backend
npm run test

# 测试覆盖率
npm run test:cov

# 监听模式测试
npm run test:watch

# 前端单元测试
cd magicstar-frontend
npm run test
```

### 集成测试

```bash
# 后端集成测试
cd magicstar-backend
npm run test:e2e

# 前端E2E测试
cd magicstar-frontend
npm run test:e2e
```

### API测试

使用Postman或curl测试API：

```bash
# 健康检查
curl http://localhost:3000/health

# 用户注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 用户登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 🐛 调试技巧

### 后端调试

#### VS Code调试配置

创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/magicstar-backend/src/main.ts",
      "outFiles": ["${workspaceFolder}/magicstar-backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

#### 日志调试

```typescript
// 使用内置Logger
import { Logger } from '@nestjs/common';

const logger = new Logger('UserService');
logger.log('用户登录成功');
logger.error('登录失败', error.stack);
logger.warn('密码即将过期');
logger.debug('调试信息', { userId: 123 });
```

#### 数据库查询调试

```typescript
// 启用查询日志
// 在 database.module.ts 中
TypeOrmModule.forRoot({
  // ... 其他配置
  logging: ['query', 'error'],
  logger: 'advanced-console',
});
```

### 前端调试

#### 微信开发者工具调试
1. 打开微信开发者工具
2. 导入项目目录：`magicstar-frontend/dist`
3. 在调试器中设置断点
4. 查看Console输出和Network请求

#### H5调试
```bash
# 启动H5开发服务
npm run dev:h5

# 在浏览器中打开 http://localhost:10086
# 使用浏览器开发者工具调试
```

#### 真机调试
```bash
# 生成预览二维码
npm run build:weapp
# 在微信开发者工具中预览，扫码在真机上测试
```

---

## 📁 项目结构详解

### 后端目录结构

```
magicstar-backend/
├── src/
│   ├── modules/              # 业务模块
│   │   ├── auth/            # 认证模块
│   │   │   ├── auth.controller.ts    # 控制器
│   │   │   ├── auth.service.ts       # 服务层
│   │   │   ├── auth.module.ts        # 模块定义
│   │   │   ├── dto/                  # 数据传输对象
│   │   │   ├── guards/               # 守卫
│   │   │   └── strategies/           # 认证策略
│   │   ├── user/            # 用户模块
│   │   ├── divination/      # 占卜模块
│   │   ├── fortune/         # 运势模块
│   │   ├── ai/              # AI模块
│   │   ├── shop/            # 商城模块
│   │   └── payment/         # 支付模块
│   ├── common/              # 通用组件
│   │   ├── dto/             # 通用DTO
│   │   ├── entities/        # 基础实体
│   │   ├── middleware/      # 中间件
│   │   └── services/        # 通用服务
│   ├── config/              # 配置文件
│   ├── database/            # 数据库配置
│   ├── decorators/          # 自定义装饰器
│   ├── guards/              # 全局守卫
│   ├── interceptors/        # 拦截器
│   ├── filters/             # 异常过滤器
│   └── pipes/               # 管道
├── test/                    # 测试文件
├── migrations/              # 数据库迁移
├── seeds/                   # 种子数据
└── dist/                    # 编译输出
```

### 前端目录结构

```
magicstar-frontend/
├── src/
│   ├── pages/               # 页面组件
│   │   ├── index/           # 首页
│   │   ├── login/           # 登录页
│   │   ├── register/        # 注册页
│   │   ├── profile/         # 个人中心
│   │   ├── divination/      # 占卜页面
│   │   ├── tarot/           # 塔罗牌页面
│   │   ├── fortune/         # 运势页面
│   │   └── ai/              # AI解读页面
│   ├── components/          # 通用组件
│   │   ├── common/          # 基础组件
│   │   ├── business/        # 业务组件
│   │   └── layout/          # 布局组件
│   ├── services/            # API服务
│   │   ├── api/             # API接口
│   │   ├── request/         # 请求封装
│   │   └── types/           # 类型定义
│   ├── store/               # 状态管理
│   │   ├── modules/         # 状态模块
│   │   └── index.ts         # 状态管理入口
│   ├── utils/               # 工具函数
│   ├── styles/              # 样式文件
│   └── assets/              # 静态资源
├── config/                  # 配置文件
├── dist/                    # 编译输出
└── types/                   # 全局类型定义
```

---

## 🔧 常用命令

### 项目管理

```bash
# 安装新依赖
npm install package-name
npm install -D package-name  # 开发依赖

# 更新依赖
npm update
npm audit fix  # 修复安全漏洞

# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 代码质量

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint
npm run lint:fix  # 自动修复

# 类型检查
npm run type-check
```

### 构建部署

```bash
# 后端构建
cd magicstar-backend
npm run build

# 前端构建
cd magicstar-frontend
npm run build:weapp    # 微信小程序
npm run build:h5       # H5版本
npm run build:alipay   # 支付宝小程序

# Docker构建
docker build -t magicstar-backend .
docker build -t magicstar-frontend .
```

---

## 🚨 常见问题解决

### 环境问题

#### Node.js版本问题
```bash
# 使用nvm管理Node.js版本
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0
```

#### 依赖安装失败
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
```

### 数据库问题

#### 连接失败
```bash
# 检查MySQL服务状态
brew services list | grep mysql

# 重启MySQL服务
brew services restart mysql

# 检查端口占用
lsof -i :3306
```

#### 权限问题
```sql
-- 重新授权
GRANT ALL PRIVILEGES ON magicstar.* TO 'magicstar'@'localhost';
FLUSH PRIVILEGES;

-- 检查用户权限
SHOW GRANTS FOR 'magicstar'@'localhost';
```

### Redis问题

#### 连接失败
```bash
# 检查Redis服务状态
brew services list | grep redis

# 重启Redis服务
brew services restart redis

# 测试连接
redis-cli ping
```

### 前端问题

#### 编译错误
```bash
# 清理编译缓存
rm -rf dist .temp

# 重新编译
npm run dev:weapp
```

#### 微信开发者工具问题
1. 确保项目路径正确指向 `dist` 目录
2. 检查AppID配置是否正确
3. 确保开发者工具版本是最新的

---

## 📚 学习资源

### 官方文档
- [Taro官方文档](https://taro-docs.jd.com/)
- [NestJS官方文档](https://nestjs.com/)
- [TypeScript官方文档](https://www.typescriptlang.org/)
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

### 推荐教程
- [NestJS中文教程](https://nestjs.bootcss.com/)
- [TypeORM中文文档](https://typeorm.biunav.com/)
- [Taro实战教程](https://taro-club.jd.com/)

### 社区资源
- [NestJS GitHub](https://github.com/nestjs/nest)
- [Taro GitHub](https://github.com/NervJS/taro)
- [掘金技术社区](https://juejin.cn/)

---

## 🤝 团队协作

### 代码审查

#### Pull Request流程
1. 从develop分支创建feature分支
2. 完成功能开发和测试
3. 提交Pull Request到develop分支
4. 代码审查和讨论
5. 修改完善后合并

#### 审查要点
- 代码规范和风格
- 功能实现正确性
- 测试覆盖率
- 性能影响
- 安全性考虑

### 沟通协作

#### 日常沟通
- 每日站会：同步进度和问题
- 技术分享：定期技术交流
- 代码评审：互相学习提高

#### 文档维护
- 及时更新API文档
- 记录重要决策和变更
- 分享解决方案和经验

---

## 📞 技术支持

### 联系方式
- **技术负责人**: [技术负责人联系方式]
- **项目经理**: [项目经理联系方式]
- **运维支持**: [运维团队联系方式]

### 问题反馈
- **Bug报告**: 使用GitHub Issues
- **功能建议**: 技术讨论群
- **紧急问题**: 直接联系技术负责人

---

**文档版本**: v1.0  
**创建时间**: 2024年12月15日  
**维护者**: 开发团队  
**更新频率**: 根据项目进展及时更新