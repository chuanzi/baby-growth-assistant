#!/bin/bash
# 数据库备份脚本

set -e

# 配置
POSTGRES_DB="baby_growth_assistant"
POSTGRES_USER="postgres"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
echo "开始数据库备份: $TIMESTAMP"
pg_dump -h db -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_FILE

echo "备份完成: $BACKUP_FILE.gz"

# 清理30天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "备份任务完成"