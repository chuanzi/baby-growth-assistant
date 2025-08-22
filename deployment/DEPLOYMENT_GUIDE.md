# 宝宝成长助手 - 生产环境部署指南

## 概述

本文档提供宝宝成长助手项目的完整生产环境部署方案，包括Docker容器化、CI/CD流水线、监控配置和运维操作。

## 部署架构

```
Internet
    ↓
[Nginx] → [Next.js App] → [PostgreSQL]
    ↓            ↓            ↓
[Grafana] → [Prometheus] → [Redis]
    ↓
[Loki (日志)]
```

## 部署选项

### 选项1：Vercel部署（推荐）

#### 优势
- 零配置部署
- 自动扩缩容
- CDN加速
- 内置监控

#### 步骤

1. **准备环境变量**
```bash
# 在Vercel Dashboard设置以下环境变量
DATABASE_URL="postgresql://user:pass@host:5432/baby_growth_assistant"
JWT_SECRET="your-super-secure-jwt-secret-32-chars-min"
GEMINI_API_KEY="your-gemini-api-key"
```

2. **部署到Vercel**
```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署
vercel --prod
```

3. **配置域名**
- 在Vercel Dashboard添加自定义域名
- 配置DNS记录指向Vercel

### 选项2：Docker容器部署

#### 环境要求
- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM
- 20GB+ 存储

#### 快速部署

1. **克隆项目**
```bash
git clone <repository-url>
cd baby-growth-assistant
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件，设置必要的环境变量
```

3. **启动服务**
```bash
# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps
```

4. **初始化数据库**
```bash
# 运行数据库迁移
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy --schema=prisma/schema.prod.prisma

# 可选：导入种子数据
docker-compose -f docker-compose.prod.yml exec app npm run db:seed
```

## 环境变量配置

### 必需变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL连接字符串 | `postgresql://user:pass@db:5432/baby_growth_assistant` |
| `JWT_SECRET` | JWT签名密钥 | `your-super-secure-32-character-secret` |
| `GEMINI_API_KEY` | Google Gemini API密钥 | `your-gemini-api-key` |

### 可选变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `REDIS_URL` | Redis连接字符串 | `redis://redis:6379` |
| `POSTGRES_PASSWORD` | PostgreSQL密码 | `changeme` |
| `GRAFANA_PASSWORD` | Grafana管理员密码 | `admin` |

## 数据库配置

### PostgreSQL优化设置

```sql
-- 连接到数据库
\c baby_growth_assistant;

-- 应用优化配置
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### 数据库迁移

```bash
# 从SQLite迁移到PostgreSQL
npx prisma migrate deploy --schema=prisma/schema.prod.prisma

# 生成Prisma客户端
npx prisma generate --schema=prisma/schema.prod.prisma
```

## CI/CD配置

### GitHub Actions

项目包含完整的CI/CD流水线配置：

1. **代码质量检查**
   - ESLint检查
   - TypeScript类型检查
   - 构建测试

2. **安全扫描**
   - 依赖漏洞扫描
   - Docker镜像安全检查

3. **自动部署**
   - 自动构建Docker镜像
   - 部署到暂存/生产环境

### 所需Secrets

在GitHub Repository Settings > Secrets中配置：

```
VERCEL_TOKEN=<vercel-token>
VERCEL_ORG_ID=<org-id>
VERCEL_PROJECT_ID=<project-id>
PRODUCTION_HOST=<server-ip>
PRODUCTION_USER=<ssh-user>
PRODUCTION_SSH_KEY=<private-key>
SLACK_WEBHOOK=<slack-webhook-url>
```

## 监控和日志

### 访问监控面板

- **应用监控**: http://your-domain:3001 (Grafana)
- **指标查询**: http://your-domain:9090 (Prometheus)
- **日志查询**: http://your-domain:3100 (Loki)

### 关键指标监控

1. **应用性能**
   - 响应时间 (P95 < 2秒)
   - 错误率 (< 1%)
   - 请求量 (QPS)

2. **资源使用**
   - CPU使用率 (< 80%)
   - 内存使用率 (< 85%)
   - 磁盘使用率 (< 85%)

3. **数据库性能**
   - 连接数
   - 查询延迟
   - 锁等待时间

### 告警配置

系统自动监控以下指标并发送告警：

- 应用宕机
- 高错误率 (>10%)
- 响应时间过长 (>2秒)
- 资源使用率过高
- 数据库连接失败

## 运维操作

### 日常操作

1. **查看应用状态**
```bash
# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看应用日志
docker-compose -f docker-compose.prod.yml logs app -f

# 检查资源使用
docker stats
```

2. **数据库维护**
```bash
# 连接到数据库
docker-compose -f docker-compose.prod.yml exec db psql -U postgres baby_growth_assistant

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('baby_growth_assistant'));

# 重建索引
REINDEX DATABASE baby_growth_assistant;
```

3. **备份操作**
```bash
# 数据库备份
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres baby_growth_assistant > backup_$(date +%Y%m%d_%H%M%S).sql

# 自动备份（推荐设置cron任务）
0 2 * * * docker-compose -f /path/to/docker-compose.prod.yml exec -T db pg_dump -U postgres baby_growth_assistant > /backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### 故障排查

1. **应用无响应**
```bash
# 检查容器状态
docker ps

# 重启应用
docker-compose -f docker-compose.prod.yml restart app

# 查看详细日志
docker-compose -f docker-compose.prod.yml logs app --tail=50
```

2. **数据库连接问题**
```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# 查看数据库日志
docker-compose -f docker-compose.prod.yml logs db --tail=50
```

3. **内存不足**
```bash
# 查看内存使用
free -h
docker stats --no-stream

# 清理Docker资源
docker system prune -f
```

### 扩容操作

1. **水平扩容**
```bash
# 增加应用实例
docker-compose -f docker-compose.prod.yml up --scale app=3 -d

# 配置负载均衡（需要修改nginx配置）
```

2. **垂直扩容**
```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## 安全配置

### 基本安全措施

1. **更新默认密码**
```bash
# 更新所有默认密码
# - PostgreSQL密码
# - Redis密码（如启用）
# - Grafana管理员密码
```

2. **配置防火墙**
```bash
# 仅开放必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

3. **SSL证书配置**
```bash
# 使用Let's Encrypt
certbot --nginx -d yourdomain.com
```

### 定期维护

1. **每日检查**
   - 监控面板检查
   - 日志文件清理
   - 备份验证

2. **每周维护**
   - 安全更新
   - 性能指标回顾
   - 数据库优化

3. **每月维护**
   - 依赖更新
   - 容量规划
   - 安全扫描

## 联系和支持

如遇到部署问题，请：

1. 检查本文档的故障排查部分
2. 查看项目Issues页面
3. 联系技术团队

---

**注意**: 本文档会随项目更新而更新，请定期检查最新版本。