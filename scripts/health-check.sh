#!/bin/sh
# 健康检查脚本

# 检查应用是否响应
curl -f http://localhost:3000/api/health || exit 1

# 检查数据库连接（如果有健康检查端点）
curl -f http://localhost:3000/api/health/db || exit 1

echo "Health check passed"
exit 0