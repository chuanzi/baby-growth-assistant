# 生产环境数据库配置指南

## 环境变量配置

### PostgreSQL 连接配置
```bash
# 生产环境数据库连接
DATABASE_URL="postgresql://user:password@host:5432/baby_growth_db?schema=public&connection_limit=20&pool_timeout=20"

# 连接池设置
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=20000
DATABASE_POOL_TIMEOUT=5000

# 查询日志设置
DATABASE_LOG_QUERIES=false
DATABASE_LOG_SLOW_QUERIES=true
DATABASE_SLOW_QUERY_THRESHOLD=1000
```

### Prisma 生产环境配置
```typescript
// src/lib/prisma.ts - 生产环境优化
new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error'] 
    : ['query', 'info', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // PostgreSQL 连接池优化
  __internal: {
    engine: {
      binaryPath: undefined, // 使用默认二进制路径
    }
  }
})
```

## PostgreSQL 服务器配置建议

### postgresql.conf 关键设置
```ini
# 连接和内存
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# 写入性能
checkpoint_completion_target = 0.9
wal_buffers = 16MB
synchronous_commit = on

# 查询优化
default_statistics_target = 100
random_page_cost = 1.1  # SSD优化
effective_io_concurrency = 200

# 自动清理
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
```

### pg_hba.conf 安全配置
```ini
# 限制连接方式和加密
host    baby_growth_db    app_user    0.0.0.0/0    scram-sha-256
host    baby_growth_db    app_user    ::/0         scram-sha-256
```

## 数据库迁移步骤

### 1. 数据导出 (SQLite → PostgreSQL)
```bash
# 1. 导出SQLite数据为CSV
sqlite3 prisma/dev.db << 'EOF'
.headers on
.mode csv
.output users.csv
SELECT * FROM "User";
.output babies.csv  
SELECT * FROM babies;
.output feeding_records.csv
SELECT * FROM feeding_records;
.output sleep_records.csv
SELECT * FROM sleep_records;
.output milestones.csv
SELECT * FROM milestones;
.output baby_milestones.csv
SELECT * FROM baby_milestones;
.quit
EOF

# 2. 创建PostgreSQL数据库
createdb baby_growth_db

# 3. 应用schema
npx prisma db push --preview-feature

# 4. 导入数据
psql baby_growth_db -c "\copy \"User\" FROM users.csv CSV HEADER"
psql baby_growth_db -c "\copy babies FROM babies.csv CSV HEADER"  
psql baby_growth_db -c "\copy feeding_records FROM feeding_records.csv CSV HEADER"
psql baby_growth_db -c "\copy sleep_records FROM sleep_records.csv CSV HEADER"
psql baby_growth_db -c "\copy milestones FROM milestones.csv CSV HEADER"
psql baby_growth_db -c "\copy baby_milestones FROM baby_milestones.csv CSV HEADER"

# 5. 应用性能优化
psql baby_growth_db -f scripts/postgresql-migration.sql
```

### 2. 应用部署配置

#### Vercel 部署
```bash
# 设置环境变量
vercel env add DATABASE_URL
vercel env add DATABASE_POOL_SIZE  
vercel env add GEMINI_API_KEY
vercel env add JWT_SECRET

# 部署
vercel --prod
```

#### Docker 部署
```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

## 监控和维护

### 性能监控查询
```sql
-- 慢查询监控
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 数据库连接状态
SELECT 
    state,
    COUNT(*) as connections
FROM pg_stat_activity
WHERE datname = 'baby_growth_db'
GROUP BY state;
```

### 定期维护脚本
```bash
#!/bin/bash
# maintenance.sh - 定期数据库维护

# 更新统计信息
psql baby_growth_db -c "ANALYZE;"

# 重建索引 (如果需要)
psql baby_growth_db -c "REINDEX DATABASE baby_growth_db;"

# 清理未使用的空间
psql baby_growth_db -c "VACUUM ANALYZE;"

# 检查数据库大小
psql baby_growth_db -c "
SELECT 
    pg_size_pretty(pg_database_size('baby_growth_db')) as db_size,
    pg_size_pretty(pg_total_relation_size('feeding_records')) as feeding_size,
    pg_size_pretty(pg_total_relation_size('sleep_records')) as sleep_size;
"
```

## 备份策略

### 自动备份脚本
```bash
#!/bin/bash
# backup.sh - 数据库备份脚本

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="baby_growth_db"

# 创建备份
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/backup_$DATE.sql

# 保留最近30天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# 验证备份完整性
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: backup_$DATE.sql.gz"
else
    echo "Backup failed!"
    exit 1
fi
```

## 安全配置

### 数据库用户权限
```sql
-- 创建应用专用用户
CREATE USER app_user WITH PASSWORD 'secure_password';

-- 授予必要权限
GRANT CONNECT ON DATABASE baby_growth_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 撤销不必要的权限
REVOKE CREATE ON SCHEMA public FROM app_user;
```

### SSL配置
```bash
# 启用SSL连接
DATABASE_URL="postgresql://app_user:password@host:5432/baby_growth_db?sslmode=require&sslcert=client-cert.pem&sslkey=client-key.pem&sslrootcert=ca-cert.pem"
```