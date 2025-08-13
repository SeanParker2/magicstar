# MagicStar DevOps 基础设施

本文档介绍 MagicStar 项目的 DevOps 基础设施配置和使用方法。

## 🐳 Docker 容器化

### 容器架构

- **后端服务**: Node.js + Nest.js 应用
- **前端服务**: Taro + React 应用 (通过 Nginx 提供服务)
- **数据库**: MySQL 8.0
- **缓存**: Redis 7
- **监控**: Prometheus + Grafana + ELK Stack

### 环境配置

#### 开发环境
```bash
# 启动开发环境
./deploy.sh dev up

# 查看开发环境日志
./deploy.sh dev logs

# 停止开发环境
./deploy.sh dev down
```

开发环境包含:
- 后端应用 (热重载)
- MySQL 数据库
- Redis 缓存
- Adminer (数据库管理工具)
- Redis Commander (Redis 管理工具)

#### 生产环境
```bash
# 启动生产环境
./deploy.sh prod up

# 重启生产环境
./deploy.sh prod restart

# 查看生产环境状态
./deploy.sh prod status
```

生产环境包含:
- 前后端应用
- MySQL 数据库
- Redis 缓存
- Nginx 反向代理

#### 监控环境
```bash
# 启动监控系统
./deploy.sh monitoring up

# 查看监控系统日志
./deploy.sh monitoring logs
```

监控环境包含:
- Prometheus (指标收集)
- Grafana (可视化面板)
- Elasticsearch (日志存储)
- Logstash (日志处理)
- Kibana (日志分析)
- Filebeat (日志收集)
- AlertManager (告警管理)
- Jaeger (分布式追踪)

### 服务端口

| 服务 | 端口 | 描述 |
|------|------|------|
| 后端应用 | 3001 | Nest.js API 服务 |
| 前端应用 | 80 | Nginx 静态文件服务 |
| MySQL | 3306 | 数据库服务 |
| Redis | 6379 | 缓存服务 |
| Prometheus | 9090 | 监控指标收集 |
| Grafana | 3000 | 监控面板 |
| Elasticsearch | 9200 | 日志存储 |
| Kibana | 5601 | 日志分析 |
| Adminer | 8080 | 数据库管理 |
| Redis Commander | 8081 | Redis 管理 |

## 🚀 CI/CD 流水线

### GitHub Actions 工作流

#### 主要流水线 (ci-cd.yml)
- **触发条件**: push 到 main/develop 分支，PR 到 main/develop 分支
- **流程**:
  1. 代码质量检查 (ESLint, 测试)
  2. 安全扫描 (Trivy)
  3. Docker 镜像构建
  4. 自动部署到对应环境
  5. 部署状态通知

#### 代码质量检查 (code-quality.yml)
- ESLint 代码规范检查
- Prettier 格式化检查
- TypeScript 类型检查
- 依赖安全审计
- 代码复杂度分析

#### 自动化测试 (test.yml)
- 单元测试 (多 Node.js 版本)
- 集成测试 (MySQL + Redis)
- E2E 测试 (Playwright)
- 性能测试 (k6)
- 测试覆盖率报告

### 环境部署策略

- **develop 分支** → 自动部署到开发环境
- **main 分支** → 自动部署到生产环境
- **PR** → 运行完整测试套件

## 📊 监控与日志

### Prometheus 监控

访问 `http://localhost:9090` 查看 Prometheus 控制台。

**监控指标**:
- 应用性能指标 (响应时间, 错误率)
- 系统资源指标 (CPU, 内存, 磁盘)
- 数据库指标 (连接数, 查询性能)
- 容器指标 (资源使用, 重启次数)

### Grafana 可视化

访问 `http://localhost:3000` 查看 Grafana 面板。
- 默认用户名: `admin`
- 默认密码: `admin123`

**预置面板**:
- 应用性能监控
- 系统资源监控
- 数据库性能监控
- 容器监控

### ELK 日志系统

访问 `http://localhost:5601` 查看 Kibana 日志分析。

**日志收集**:
- 应用日志 (通过 Filebeat)
- 系统日志
- 容器日志
- Nginx 访问日志

### 告警配置

**告警规则** (monitoring/prometheus/rules/alerts.yml):
- 服务可用性告警
- 高 CPU/内存使用率告警
- 磁盘空间不足告警
- 应用错误率告警
- 数据库连接数告警

**通知渠道** (monitoring/alertmanager/alertmanager.yml):
- 邮件通知
- Slack 集成
- 钉钉/企业微信集成
- Webhook 通知

## 🛠️ 常用操作

### 快速启动
```bash
# 启动完整开发环境
./deploy.sh dev up

# 启动监控系统
./deploy.sh monitoring up

# 查看所有服务状态
./deploy.sh all status
```

### 日志查看
```bash
# 查看后端应用日志
docker-compose -f docker-compose.dev.yml logs -f backend-dev

# 查看数据库日志
docker-compose -f docker-compose.dev.yml logs -f mysql-dev

# 查看所有服务日志
./deploy.sh dev logs
```

### 数据库管理
```bash
# 访问 Adminer (数据库管理工具)
open http://localhost:8080

# 直接连接 MySQL
docker exec -it magicstar-mysql-dev mysql -u magicstar -p

# 备份数据库
docker exec magicstar-mysql-dev mysqldump -u magicstar -p magicstar_dev > backup.sql
```

### 缓存管理
```bash
# 访问 Redis Commander
open http://localhost:8081

# 直接连接 Redis
docker exec -it magicstar-redis-dev redis-cli

# 清空 Redis 缓存
docker exec magicstar-redis-dev redis-cli FLUSHALL
```

### 镜像管理
```bash
# 重新构建镜像
./deploy.sh dev build

# 清理未使用的镜像
docker system prune -f

# 查看镜像大小
docker images | grep magicstar
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 查看端口占用
   lsof -i :3001
   
   # 停止冲突的服务
   ./deploy.sh dev down
   ```

2. **容器启动失败**
   ```bash
   # 查看容器日志
   docker logs magicstar-backend-dev
   
   # 重启容器
   docker restart magicstar-backend-dev
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker exec magicstar-mysql-dev mysqladmin ping
   
   # 重置数据库
   ./deploy.sh dev down
   docker volume rm magicstar_mysql_dev_data
   ./deploy.sh dev up
   ```

4. **监控服务异常**
   ```bash
   # 重启监控服务
   ./deploy.sh monitoring restart
   
   # 检查配置文件
   docker exec magicstar-prometheus promtool check config /etc/prometheus/prometheus.yml
   ```

### 性能优化

1. **调整容器资源限制**
   - 编辑 docker-compose 文件中的 `deploy.resources` 配置

2. **优化数据库性能**
   - 调整 MySQL 配置参数
   - 添加适当的索引

3. **缓存优化**
   - 调整 Redis 内存策略
   - 设置合理的过期时间

## 📚 参考文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)