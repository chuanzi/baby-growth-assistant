#!/bin/bash
# 一键部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 检查依赖
check_requirements() {
    log "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker未安装"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装"
    fi
    
    log "系统要求检查通过"
}

# 环境配置检查
check_environment() {
    log "检查环境配置..."
    
    if [ ! -f ".env" ]; then
        warn ".env文件不存在，从.env.example复制..."
        cp .env.example .env
        warn "请编辑.env文件设置正确的环境变量"
        read -p "按回车键继续..." -r
    fi
    
    # 检查关键环境变量
    source .env
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL未设置"
    fi
    
    if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
        error "JWT_SECRET未设置或长度不足32字符"
    fi
    
    log "环境配置检查通过"
}

# 构建和启动服务
deploy_services() {
    log "开始部署服务..."
    
    # 拉取最新镜像
    log "拉取最新镜像..."
    docker-compose -f docker-compose.prod.yml pull --ignore-pull-failures
    
    # 构建应用镜像
    log "构建应用镜像..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # 启动服务
    log "启动服务..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    log "服务部署完成"
}

# 数据库初始化
init_database() {
    log "初始化数据库..."
    
    # 等待数据库启动
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U postgres; then
            break
        fi
        warn "等待数据库启动... ($retries)"
        sleep 2
        retries=$((retries-1))
    done
    
    if [ $retries -eq 0 ]; then
        error "数据库启动超时"
    fi
    
    # 运行数据库迁移
    log "运行数据库迁移..."
    docker-compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy --schema=prisma/schema.prod.prisma
    
    # 生成Prisma客户端
    log "生成Prisma客户端..."
    docker-compose -f docker-compose.prod.yml exec -T app npx prisma generate --schema=prisma/schema.prod.prisma
    
    log "数据库初始化完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local retries=10
    while [ $retries -gt 0 ]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log "应用健康检查通过"
            return 0
        fi
        warn "等待应用启动... ($retries)"
        sleep 5
        retries=$((retries-1))
    done
    
    error "应用健康检查失败"
}

# 显示部署信息
show_info() {
    log "部署完成！"
    echo ""
    echo "访问地址:"
    echo "- 应用: http://localhost"
    echo "- 监控: http://localhost:3001 (Grafana, admin/admin)"
    echo "- 指标: http://localhost:9090 (Prometheus)"
    echo "- 健康检查: http://localhost/health"
    echo ""
    echo "常用命令:"
    echo "- 查看状态: docker-compose -f docker-compose.prod.yml ps"
    echo "- 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "- 停止服务: docker-compose -f docker-compose.prod.yml down"
    echo ""
}

# 主函数
main() {
    log "开始部署宝宝成长助手..."
    
    check_requirements
    check_environment
    deploy_services
    init_database
    health_check
    show_info
    
    log "部署完成！"
}

# 参数处理
case "${1:-}" in
    "check")
        check_requirements
        check_environment
        ;;
    "deploy")
        deploy_services
        ;;
    "init-db")
        init_database
        ;;
    "health")
        health_check
        ;;
    *)
        main
        ;;
esac