# 数据库迁移和种子数据

本目录包含了 MagicStar 项目的数据库迁移文件和种子数据。

## 目录结构

```
src/database/
├── migrations/           # 数据库迁移文件
│   ├── 1700000000000-CreateInitialTables.ts
│   ├── 1700000001000-CreateShopTables.ts
│   ├── 1700000002000-CreatePaymentAndAiTables.ts
│   ├── 1700000003000-CreateAstrologyAndFortuneTables.ts
│   └── 1700000004000-CreateFinanceTables.ts
├── seeds/                # 种子数据文件
│   └── 1700000000000-InitialData.ts
├── database.config.ts    # 数据库配置
├── database.module.ts    # 数据库模块
├── init-database.ts      # 数据库初始化脚本
└── README.md            # 本文件
```

## 迁移文件说明

### 1700000000000-CreateInitialTables.ts
创建基础表结构：
- `roles` - 角色表
- `users` - 用户表
- `tarot_cards` - 塔罗牌表
- `tarot_spreads` - 塔罗牌阵表
- `tarot_readings` - 塔罗占卜记录表
- `divination_records` - 占卜记录表

### 1700000001000-CreateShopTables.ts
创建商城相关表：
- `product_categories` - 商品分类表
- `products` - 商品表
- `product_images` - 商品图片表
- `cart_items` - 购物车表
- `order_addresses` - 订单地址表
- `orders` - 订单表
- `order_items` - 订单项表

### 1700000002000-CreatePaymentAndAiTables.ts
创建支付和AI相关表：
- `payments` - 支付表
- `payment_records` - 支付记录表
- `payment_logs` - 支付日志表
- `refunds` - 退款表
- `ai_requests` - AI请求表
- `ai_responses` - AI响应表
- `prompt_templates` - 提示词模板表

### 1700000003000-CreateAstrologyAndFortuneTables.ts
创建占星学和运势相关表：
- `birth_charts` - 星盘表
- `planets` - 行星表
- `houses` - 宫位表
- `aspects` - 相位表
- `chart_interpretations` - 星盘解读表
- `fortune_templates` - 运势模板表
- `user_fortunes` - 用户运势表
- `fortune_histories` - 运势历史表
- `fortune_subscriptions` - 运势订阅表

### 1700000004000-CreateFinanceTables.ts
创建财务相关表：
- `financial_records` - 财务记录表
- `refund_records` - 退款记录表
- `reconciliation_records` - 对账记录表
- `financial_reports` - 财务报表表

## 种子数据说明

### 1700000000000-InitialData.ts
创建基础数据：
- 系统角色（管理员、普通用户、VIP用户）
- 默认管理员账号
- 测试用户账号

**默认账号信息：**
- 管理员：`admin@magicstar.com` / `admin123456`
- 测试用户：`test@magicstar.com` / `test123456`

## 使用方法

### 1. 环境配置

确保 `.env` 文件中配置了正确的数据库连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=magicstar
```

### 2. 初始化数据库

**一键初始化（推荐）：**
```bash
npm run db:init
```

这个命令会：
1. 连接数据库
2. 运行所有迁移文件
3. 创建种子数据

### 3. 单独运行迁移

```bash
# 运行所有迁移
npm run migration:run

# 回滚最后一个迁移
npm run migration:revert
```

### 4. 单独运行种子数据

```bash
npm run db:seed
```

### 5. 生成新的迁移文件

```bash
npm run migration:generate -- src/database/migrations/YourMigrationName
```

## 注意事项

1. **生产环境**：确保 `synchronize` 设置为 `false`
2. **备份**：在运行迁移前请备份重要数据
3. **权限**：确保数据库用户有足够的权限创建表和索引
4. **字符集**：使用 `utf8mb4` 字符集以支持 emoji 和特殊字符
5. **时区**：默认使用 `+08:00` 时区（北京时间）

## 故障排除

### 连接失败
- 检查数据库服务是否启动
- 验证连接参数是否正确
- 确认网络连接正常

### 迁移失败
- 检查数据库用户权限
- 查看错误日志定位具体问题
- 确认表结构是否冲突

### 种子数据创建失败
- 检查实体类导入路径
- 验证数据格式是否正确
- 确认外键约束是否满足

## 开发指南

### 创建新的迁移文件

1. 使用时间戳命名：`{timestamp}-{description}.ts`
2. 实现 `up` 和 `down` 方法
3. 使用原生 SQL 确保兼容性
4. 添加适当的索引和约束

### 创建新的种子数据

1. 检查数据是否已存在
2. 使用 repository 模式操作数据
3. 处理外键依赖关系
4. 添加错误处理

### 最佳实践

1. **原子性**：每个迁移文件应该是原子操作
2. **可回滚**：确保 `down` 方法能正确回滚
3. **幂等性**：种子数据应该可以重复运行
4. **文档化**：为复杂的迁移添加注释
5. **测试**：在开发环境充分测试后再部署