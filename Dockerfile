# 宝宝成长助手生产环境Dockerfile
# 多阶段构建优化，支持缓存和安全最佳实践

# 1. 基础镜像阶段
FROM node:20-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat curl

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 2. 依赖安装阶段
FROM base AS deps

# 复制包管理文件
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm ci --only=production --frozen-lockfile && npm cache clean --force

# 3. 构建阶段
FROM base AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 生成Prisma客户端
RUN npx prisma generate --schema=prisma/schema.prod.prisma

# 构建应用
RUN npm run build

# 4. 生产运行阶段
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建必要目录
RUN mkdir .next

# 复制构建结果
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制Prisma相关文件
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# 健康检查
COPY --chown=nextjs:nodejs scripts/health-check.sh /app/health-check.sh
RUN chmod +x /app/health-check.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /app/health-check.sh

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动命令
CMD ["node", "server.js"]

# 标签信息
LABEL maintainer="Baby Growth Assistant Team"
LABEL version="1.0.0"
LABEL description="Baby Growth Assistant Production Container"