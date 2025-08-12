## 技术架构规范

### 1. 前端技术栈

```
框架：Taro 3.x + React + TypeScript
状态管理：Zustand
UI组件：Taro UI + 自定义主题
样式方案：CSS Modules + PostCSS
构建工具：Webpack 5
代码规范：ESLint + Prettier
```

### 2. 后端技术栈

```
框架：Node.js + Nest.js
数据库：MySQL (主) + Redis (缓存)
服务治理：Consul + Nginx
容器化：Docker + Kubernetes
监控：Jaeger + Prometheus
```

### 3. 微服务架构

#### 核心服务模块
- **用户服务 (user-service)**：用户管理、认证授权
- **占卜服务 (divination-service)**：核心占卜算法
- **商城服务 (mall-service)**：商品管理、订单处理
- **内容服务 (content-service)**：内容管理、推荐系统
- **支付服务 (payment-service)**：支付集成、财务管理
- **通知服务 (notification-service)**：消息推送、邮件通知

#### 基础设施服务
- **网关服务 (gateway-service)**：API网关、路由分发
- **配置中心 (config-service)**：配置管理
- **监控服务 (monitor-service)**：系统监控、日志收集

### 4. 数据安全与隐私保护

#### 数据分类与存储
- **敏感数据**：AES-256加密存储
- **业务数据**：关系型数据库，读写分离
- **缓存数据**：Redis集群，合理过期策略

#### 隐私保护措施
- 数据最小化收集原则
- 传输加密：HTTPS + TLS 1.3
- 访问控制：RBAC权限模型
- 审计日志：完整访问记录
- 合规性：符合《个人信息保护法》

### 5. 算法与AI集成

#### 本地算法模块
- 基础塔罗牌算法
- 运势生成规则引擎
- 用户画像分析

#### 第三方API集成
- 星盘计算：AstrologyAPI / Swiss Ephemeris
- AI大模型：文心一言
- 专业占卜算法服务

### 6. 商业模式技术支撑

#### 商品销售系统
- 多支付方式：微信支付、支付宝、Apple Pay
- 库存管理：实时同步
- 优惠券系统：灵活促销规则
- 数据分析：用户行为追踪

#### 扩展预留
- 广告系统架构
- 会员体系设计
- 积分兑换机制

## 开发规范

### 1. 代码规范

#### 命名规范
- **文件命名**：kebab-case (如：user-service.ts)
- **组件命名**：PascalCase (如：UserProfile)
- **变量/函数**：camelCase (如：getUserInfo)
- **常量**：UPPER_SNAKE_CASE (如：API_BASE_URL)

#### 目录结构
```
src/
├── components/     # 公共组件
├── pages/         # 页面组件
├── services/      # API服务
├── utils/         # 工具函数
├── hooks/         # 自定义Hooks
├── store/         # 状态管理
├── types/         # TypeScript类型定义
└── assets/        # 静态资源
```

### 2. Git工作流

#### 分支策略
- **main**：生产环境分支
- **develop**：开发环境分支
- **feature/**：功能开发分支
- **hotfix/**：紧急修复分支

#### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 3. 测试规范

#### 测试覆盖率要求
- 单元测试：≥80%
- 集成测试：核心业务流程100%
- E2E测试：主要用户路径覆盖

#### 测试工具
- 单元测试：Jest + React Testing Library
- E2E测试：Cypress
- API测试：Postman + Newman

### 4. 部署规范

#### 环境管理
- **开发环境 (dev)**：本地开发
- **测试环境 (test)**：功能测试
- **预生产环境 (staging)**：生产前验证
- **生产环境 (prod)**：正式发布

#### CI/CD流程
1. 代码提交触发构建
2. 自动化测试执行
3. 代码质量检查
4. 构建Docker镜像
5. 部署到对应环境
6. 健康检查验证

## 质量保证

### 1. 代码质量
- ESLint静态检查
- SonarQube代码质量分析
- 代码审查（Code Review）
- 技术债务定期清理

### 2. 性能要求
- 页面加载时间：<3秒
- API响应时间：<500ms
- 系统可用性：≥99.9%
- 并发用户数：≥10000

### 3. 安全要求
- 定期安全扫描
- 依赖包漏洞检查
- 渗透测试
- 安全编码规范