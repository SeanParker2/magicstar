#!/bin/bash

# MagicStar 部署脚本
# 用法: ./deploy.sh [environment] [action]
# 环境: dev, prod, monitoring
# 操作: up, down, restart, logs, build

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

# 显示帮助信息
show_help() {
    echo "MagicStar 部署脚本"
    echo ""
    echo "用法: $0 [environment] [action]"
    echo ""
    echo "环境 (environment):"
    echo "  dev         - 开发环境 (包含开发工具)"
    echo "  prod        - 生产环境"
    echo "  monitoring  - 监控系统"
    echo "  all         - 所有服务"
    echo ""
    echo "操作 (action):"
    echo "  up          - 启动服务"
    echo "  down        - 停止服务"
    echo "  restart     - 重启服务"
    echo "  logs        - 查看日志"
    echo "  build       - 构建镜像"
    echo "  status      - 查看状态"
    echo "  clean       - 清理资源"
    echo ""
    echo "示例:"
    echo "  $0 dev up          # 启动开发环境"
    echo "  $0 prod restart    # 重启生产环境"
    echo "  $0 monitoring logs # 查看监控系统日志"
    echo "  $0 all down        # 停止所有服务"
}

# 检查Docker和Docker Compose
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在PATH中"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装或不在PATH中"
        exit 1
    fi
}

# 获取compose文件
get_compose_files() {
    local env=$1
    case $env in
        "dev")
            echo "-f docker-compose.dev.yml"
            ;;
        "prod")
            echo "-f docker-compose.yml"
            ;;
        "monitoring")
            echo "-f docker-compose.monitoring.yml"
            ;;
        "all")
            echo "-f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.monitoring.yml"
            ;;
        *)
            log_error "未知环境: $env"
            exit 1
            ;;
    esac
}

# 执行操作
execute_action() {
    local env=$1
    local action=$2
    local compose_files=$(get_compose_files $env)

    case $action in
        "up")
            log_info "启动 $env 环境..."
            docker-compose $compose_files up -d
            log_success "$env 环境启动完成"
            ;;
        "down")
            log_info "停止 $env 环境..."
            docker-compose $compose_files down
            log_success "$env 环境停止完成"
            ;;
        "restart")
            log_info "重启 $env 环境..."
            docker-compose $compose_files restart
            log_success "$env 环境重启完成"
            ;;
        "logs")
            log_info "查看 $env 环境日志..."
            docker-compose $compose_files logs -f
            ;;
        "build")
            log_info "构建 $env 环境镜像..."
            docker-compose $compose_files build --no-cache
            log_success "$env 环境镜像构建完成"
            ;;
        "status")
            log_info "$env 环境状态:"
            docker-compose $compose_files ps
            ;;
        "clean")
            log_warning "清理 $env 环境资源..."
            docker-compose $compose_files down -v --remove-orphans
            docker system prune -f
            log_success "$env 环境资源清理完成"
            ;;
        *)
            log_error "未知操作: $action"
            exit 1
            ;;
    esac
}

# 主函数
main() {
    # 检查参数
    if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi

    if [ $# -ne 2 ]; then
        log_error "参数错误"
        show_help
        exit 1
    fi

    local environment=$1
    local action=$2

    # 检查依赖
    check_dependencies

    # 执行操作
    execute_action $environment $action
}

# 运行主函数
main "$@"