#!/bin/bash
# ============================================
# DOCKER MANAGEMENT SCRIPT (Không có thư mục backend)
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Help function
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  stop        Stop all containers"
    echo "  logs        Show logs"
    echo "  shell       Open shell in backend container"
    echo "  psql        Open PostgreSQL shell"
    echo "  redis       Open Redis CLI"
    echo "  prune       Remove all containers, volumes, and images"
    echo "  build       Build images"
    echo "  test        Run tests in Docker"
    echo "  help        Show this help"
}

# Development environment
start_dev() {
    echo -e "${GREEN}Starting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✓ Development environment started${NC}"
    echo "Backend: http://localhost:3000"
    echo "Swagger: http://localhost:3000/api/docs"
}

# Production environment
start_prod() {
    echo -e "${YELLOW}Starting production environment...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found!${NC}"
        echo "Copy .docker/.env.docker to .env and update values"
        exit 1
    fi
    
    docker-compose -f docker-compose.prod.yml up -d
    echo -e "${GREEN}✓ Production environment started${NC}"
    echo "API: https://api.goldtrack.vn"
    echo "Grafana: http://localhost:3001"
    echo "Prometheus: http://localhost:9090"
}

# Stop all containers
stop_all() {
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.prod.yml down
    echo -e "${GREEN}✓ All containers stopped${NC}"
}

# Show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose -f docker-compose.dev.yml logs -f "$service"
    fi
}

# Open shell in backend
open_shell() {
    docker exec -it goldtrack-backend-dev /bin/sh
}

# Open PostgreSQL shell
open_psql() {
    docker exec -it goldtrack-postgres-dev psql -U postgres -d goldtrack_dev
}

# Open Redis CLI
open_redis() {
    docker exec -it goldtrack-redis-dev redis-cli
}

# Prune everything
prune_all() {
    echo -e "${RED}WARNING: This will remove all containers, volumes, and images!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        docker-compose -f docker-compose.prod.yml down -v --rmi all
        docker system prune -a -f --volumes
        echo -e "${GREEN}✓ Prune completed${NC}"
    fi
}

# Build images
build_images() {
    echo -e "${GREEN}Building Docker images...${NC}"
    docker-compose -f docker-compose.dev.yml build
    docker-compose -f docker-compose.prod.yml build
    echo -e "${GREEN}✓ Build completed${NC}"
}

# Run tests
run_tests() {
    echo -e "${GREEN}Running tests in Docker...${NC}"
    docker-compose -f docker-compose.dev.yml exec backend npm run test
}

# Main
case "${1:-}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_all
        ;;
    logs)
        show_logs "$2"
        ;;
    shell)
        open_shell
        ;;
    psql)
        open_psql
        ;;
    redis)
        open_redis
        ;;
    prune)
        prune_all
        ;;
    build)
        build_images
        ;;
    test)
        run_tests
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: ${1}${NC}"
        show_help
        exit 1
        ;;
esac