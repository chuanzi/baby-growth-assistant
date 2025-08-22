#!/bin/bash
set -e

echo "🚀 开始Vercel构建流程..."

# 显示Node.js和npm版本
echo "📦 Node.js版本: $(node --version)"
echo "📦 npm版本: $(npm --version)"

# 检查环境变量
echo "🔍 检查环境变量..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ DATABASE_URL未设置，使用内存数据库进行构建"
  export DATABASE_URL="file::memory:?cache=shared"
fi

echo "📄 使用的DATABASE_URL: $DATABASE_URL"

# 生成Prisma客户端
echo "🗄️ 生成Prisma客户端..."
npx prisma generate

# 运行构建（跳过数据库连接验证）
echo "🔨 开始Next.js构建..."
npm run build

echo "✅ Vercel构建完成！"