#!/bin/bash

# Radio Calico Deployment Script
# This script provides convenient commands for Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    echo "Radio Calico Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [COMMAND]"
    echo ""
    echo "Environments:"
    echo "  dev           Development environment"
    echo "  prod          Production environment"
    echo ""
    echo "Commands:"
    echo "  up            Start environment (create if needed)"
    echo "  start         Start existing stopped containers"
    echo "  stop          Stop containers (keep them for restart)"
    echo "  restart       Restart containers"
    echo "  down          Remove containers and networks"
    echo "  logs          Show container logs"
    echo "  build         Build images"
    echo "  status        Show container status"
    echo ""
    echo "Global Commands (no environment needed):"
    echo "  test          Run tests in Docker"
    echo "  clean         Clean up all containers and volumes"
    echo "  health        Check container health"
    echo "  backup        Backup database"
    echo "  restore       Restore database from backup"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev up              # Start development environment"
    echo "  $0 dev stop            # Stop development containers"
    echo "  $0 dev start           # Start stopped dev containers"
    echo "  $0 prod up             # Start production environment"
    echo "  $0 prod logs           # Show production logs"
    echo "  $0 test                # Run tests"
    echo "  $0 clean               # Clean everything"
}

# Development environment functions
dev_up() {
    print_status "Starting Radio Calico development environment..."
    docker-compose up -d radiocalico-dev
    print_success "Development environment started!"
    print_status "Access the application at: http://localhost:3000"
    print_status "View logs with: $0 dev logs"
}

dev_start() {
    print_status "Starting existing development containers..."
    if docker-compose start radiocalico-dev 2>/dev/null; then
        print_success "Development containers started!"
        print_status "Access the application at: http://localhost:3000"
    else
        print_error "No development containers found to start. Use '$0 dev up' first."
        exit 1
    fi
}

dev_stop() {
    print_status "Stopping development containers..."
    docker-compose stop radiocalico-dev
    print_success "Development containers stopped!"
}

dev_restart() {
    print_status "Restarting development containers..."
    docker-compose restart radiocalico-dev
    print_success "Development containers restarted!"
}

dev_down() {
    print_status "Removing development containers and networks..."
    docker-compose down
    print_success "Development environment removed!"
}

dev_logs() {
    print_status "Showing development logs..."
    docker-compose logs -f radiocalico-dev
}

dev_build() {
    print_status "Building development image..."
    docker-compose build radiocalico-dev
    print_success "Development image built!"
}

dev_status() {
    print_status "Development environment status:"
    docker-compose ps radiocalico-dev
}

# Production environment functions
prod_up() {
    print_status "Starting Radio Calico production environment..."
    docker-compose -f docker-compose.prod.yml up -d radiocalico
    print_success "Production environment started!"
    print_status "Access the application at: http://localhost:3000"
    print_status "View logs with: $0 prod logs"
}

prod_start() {
    print_status "Starting existing production containers..."
    if docker-compose -f docker-compose.prod.yml start radiocalico 2>/dev/null; then
        print_success "Production containers started!"
        print_status "Access the application at: http://localhost:3000"
    else
        print_error "No production containers found to start. Use '$0 prod up' first."
        exit 1
    fi
}

prod_stop() {
    print_status "Stopping production containers..."
    docker-compose -f docker-compose.prod.yml stop radiocalico
    print_success "Production containers stopped!"
}

prod_restart() {
    print_status "Restarting production containers..."
    docker-compose -f docker-compose.prod.yml restart radiocalico
    print_success "Production containers restarted!"
}

prod_down() {
    print_status "Removing production containers and networks..."
    docker-compose -f docker-compose.prod.yml down
    print_success "Production environment removed!"
}

prod_logs() {
    print_status "Showing production logs..."
    docker-compose -f docker-compose.prod.yml logs -f radiocalico
}

prod_build() {
    print_status "Building production image..."
    docker build -t radiocalico:latest --target production .
    print_success "Production image built!"
}

prod_status() {
    print_status "Production environment status:"
    docker-compose -f docker-compose.prod.yml ps radiocalico
}

# Global functions (no environment specified)
run_tests() {
    print_status "Running Radio Calico tests in Docker..."
    docker-compose --profile test up --build radiocalico-test
    if [ $? -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_error "Tests failed!"
        exit 1
    fi
}

clean_all() {
    print_warning "This will remove ALL Radio Calico containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up all containers, networks, and volumes..."
        docker-compose down -v --remove-orphans 2>/dev/null || true
        docker-compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

check_health() {
    print_status "Checking Radio Calico container health..."
    
    # Check development container
    if docker ps -q -f name=radiocalico-dev > /dev/null 2>&1; then
        dev_health=$(docker inspect --format='{{.State.Health.Status}}' radiocalico-dev 2>/dev/null || echo "no health check")
        echo "Development container: $dev_health"
    else
        echo "Development container: not running"
    fi
    
    # Check production container
    if docker ps -q -f name=radiocalico-prod > /dev/null 2>&1; then
        prod_health=$(docker inspect --format='{{.State.Health.Status}}' radiocalico-prod 2>/dev/null || echo "no health check")
        echo "Production container: $prod_health"
    else
        echo "Production container: not running"
    fi
    
    # Show all Radio Calico containers
    print_status "All Radio Calico containers:"
    docker ps -a -f name=radiocalico --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

backup_database() {
    local backup_path=${2:-"./backup-$(date +%Y%m%d_%H%M%S).db"}
    print_status "Creating database backup..."
    
    if docker ps -q -f name=radiocalico-prod > /dev/null 2>&1; then
        docker cp radiocalico-prod:/app/data/users.db "$backup_path"
        print_success "Production database backed up to: $backup_path"
    elif docker ps -q -f name=radiocalico-dev > /dev/null 2>&1; then
        docker cp radiocalico-dev:/app/data/users.db "$backup_path"
        print_success "Development database backed up to: $backup_path"
    else
        print_error "No running Radio Calico containers found!"
        exit 1
    fi
}

restore_database() {
    local backup_path=$2
    if [ -z "$backup_path" ]; then
        print_error "Please provide backup file path"
        echo "Usage: $0 restore /path/to/backup.db"
        exit 1
    fi
    
    if [ ! -f "$backup_path" ]; then
        print_error "Backup file not found: $backup_path"
        exit 1
    fi
    
    print_warning "This will replace the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restoring database from: $backup_path"
        
        if docker ps -q -f name=radiocalico-prod > /dev/null 2>&1; then
            docker cp "$backup_path" radiocalico-prod:/app/data/users.db
            docker restart radiocalico-prod
            print_success "Database restored to production container!"
        elif docker ps -q -f name=radiocalico-dev > /dev/null 2>&1; then
            docker cp "$backup_path" radiocalico-dev:/app/data/users.db
            docker restart radiocalico-dev
            print_success "Database restored to development container!"
        else
            print_error "No running Radio Calico containers found!"
            exit 1
        fi
    else
        print_status "Restore cancelled."
    fi
}

# Main script logic
ENV=${1:-help}
CMD=${2:-help}

case "$ENV" in
    dev)
        case "$CMD" in
            up)
                dev_up
                ;;
            start)
                dev_start
                ;;
            stop)
                dev_stop
                ;;
            restart)
                dev_restart
                ;;
            down)
                dev_down
                ;;
            logs)
                dev_logs
                ;;
            build)
                dev_build
                ;;
            status)
                dev_status
                ;;
            *)
                print_error "Unknown development command: $CMD"
                show_usage
                exit 1
                ;;
        esac
        ;;
    prod)
        case "$CMD" in
            up)
                prod_up
                ;;
            start)
                prod_start
                ;;
            stop)
                prod_stop
                ;;
            restart)
                prod_restart
                ;;
            down)
                prod_down
                ;;
            logs)
                prod_logs
                ;;
            build)
                prod_build
                ;;
            status)
                prod_status
                ;;
            *)
                print_error "Unknown production command: $CMD"
                show_usage
                exit 1
                ;;
        esac
        ;;
    test)
        run_tests
        ;;
    clean)
        clean_all
        ;;
    health)
        check_health
        ;;
    backup)
        backup_database "$@"
        ;;
    restore)
        restore_database "$@"
        ;;
    help)
        show_usage
        ;;
    *)
        print_error "Unknown environment or command: $ENV"
        show_usage
        exit 1
        ;;
esac