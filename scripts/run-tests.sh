#!/bin/bash

# 宝宝成长助手 - 测试运行脚本
# 这个脚本用于本地开发环境运行各种测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 帮助信息
show_help() {
    cat << EOF
宝宝成长助手 - 测试运行脚本

用法: $0 [选项] [测试类型]

测试类型:
    unit        运行单元测试
    integration 运行集成测试
    security    运行安全测试
    performance 运行性能测试
    e2e         运行端到端测试
    coverage    运行覆盖率测试
    all         运行所有测试

选项:
    -w, --watch     监听模式
    -h, --help      显示帮助信息
    -v, --verbose   详细输出
    -c, --ci        CI模式（无交互）
    --headed        E2E测试显示浏览器（仅适用于e2e）
    --ui            E2E测试显示UI（仅适用于e2e）

示例:
    $0 unit                 运行单元测试
    $0 e2e --headed        运行E2E测试并显示浏览器
    $0 coverage            生成覆盖率报告
    $0 all --ci            CI模式运行所有测试

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm未安装，请先安装Node.js和npm"
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        log_warning "未找到node_modules，正在安装依赖..."
        npm install
    fi
    
    log_success "依赖检查完成"
}

# 设置测试环境
setup_test_env() {
    log_info "设置测试环境..."
    
    export NODE_ENV=test
    export DATABASE_URL="file:./test.db"
    export JWT_SECRET="test-jwt-secret-key-for-testing"
    
    log_success "测试环境设置完成"
}

# 生成Prisma客户端
generate_prisma() {
    log_info "生成Prisma客户端..."
    npx prisma generate
    log_success "Prisma客户端生成完成"
}

# 运行单元测试
run_unit_tests() {
    log_info "运行单元测试..."
    
    if [ "$WATCH_MODE" = true ]; then
        npm run test:unit -- --watch
    else
        npm run test:unit
    fi
    
    log_success "单元测试完成"
}

# 运行集成测试
run_integration_tests() {
    log_info "运行集成测试..."
    npm run test:integration
    log_success "集成测试完成"
}

# 运行安全测试
run_security_tests() {
    log_info "运行安全测试..."
    npm run test:security
    log_success "安全测试完成"
}

# 运行性能测试
run_performance_tests() {
    log_info "运行性能测试..."
    npm run test:performance
    log_success "性能测试完成"
}

# 运行E2E测试
run_e2e_tests() {
    log_info "运行E2E测试..."
    
    # 确保Playwright浏览器已安装
    if [ ! -d "~/.cache/ms-playwright" ] && [ ! -d "/Users/$USER/Library/Caches/ms-playwright" ]; then
        log_warning "Playwright浏览器未安装，正在安装..."
        npx playwright install
    fi
    
    local e2e_args=""
    if [ "$HEADED_MODE" = true ]; then
        e2e_args="--headed"
    fi
    if [ "$UI_MODE" = true ]; then
        e2e_args="--ui"
    fi
    
    npm run test:e2e $e2e_args
    log_success "E2E测试完成"
}

# 运行覆盖率测试
run_coverage_tests() {
    log_info "运行覆盖率测试..."
    npm run test:coverage
    
    if command -v open &> /dev/null && [ "$CI_MODE" != true ]; then
        log_info "打开覆盖率报告..."
        open coverage/lcov-report/index.html
    else
        log_info "覆盖率报告位置: coverage/lcov-report/index.html"
    fi
    
    log_success "覆盖率测试完成"
}

# 运行所有测试
run_all_tests() {
    log_info "运行所有测试..."
    
    if [ "$CI_MODE" = true ]; then
        npm run test:ci
    else
        npm run test:all
    fi
    
    log_success "所有测试完成"
}

# 主函数
main() {
    local test_type=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -w|--watch)
                WATCH_MODE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE_MODE=true
                shift
                ;;
            -c|--ci)
                CI_MODE=true
                shift
                ;;
            --headed)
                HEADED_MODE=true
                shift
                ;;
            --ui)
                UI_MODE=true
                shift
                ;;
            unit|integration|security|performance|e2e|coverage|all)
                test_type=$1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有指定测试类型，显示帮助
    if [ -z "$test_type" ]; then
        show_help
        exit 0
    fi
    
    # 检查依赖和设置环境
    check_dependencies
    setup_test_env
    generate_prisma
    
    # 根据测试类型运行相应测试
    case $test_type in
        unit)
            run_unit_tests
            ;;
        integration)
            run_integration_tests
            ;;
        security)
            run_security_tests
            ;;
        performance)
            run_performance_tests
            ;;
        e2e)
            run_e2e_tests
            ;;
        coverage)
            run_coverage_tests
            ;;
        all)
            run_all_tests
            ;;
        *)
            log_error "不支持的测试类型: $test_type"
            exit 1
            ;;
    esac
    
    log_success "测试运行完成! 🎉"
}

# 运行主函数
main "$@"