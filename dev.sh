#!/bin/bash

# Development Environment Manager Script
# This script helps manage the local development setup with Docker for databases only

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Commands
case "$1" in
    start)
        print_status "Starting development environment..."
        
        # Start Docker services (DB, Redis only)
        print_status "Starting Docker services (Database & Redis)..."
        docker-compose -f docker-compose.dev.yml up -d postgres redis adminer redis-insight
        
        # Wait for services to be healthy
        print_status "Waiting for services to be healthy..."
        sleep 5
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            print_status "Installing backend dependencies..."
            npm install
        fi
        
        if [ ! -d "frontend/node_modules" ]; then
            print_status "Installing frontend dependencies..."
            cd frontend && npm install && cd ..
        fi
        
        # Generate Prisma client
        print_status "Generating Prisma client..."
        npx prisma generate --schema=database/prisma/schema.prisma
        
        # Start backend locally
        print_status "Starting backend locally with hot reload..."
        npm run dev > /tmp/backend.log 2>&1 &
        echo $! > /tmp/backend.pid
        
        # Start frontend locally
        print_status "Starting frontend locally with hot reload..."
        cd frontend && npm run dev > /tmp/frontend.log 2>&1 &
        echo $! > /tmp/frontend.pid
        cd ..
        
        sleep 3
        print_success "Development environment started!"
        echo ""
        echo "Services available at:"
        echo "  Backend API:    http://localhost:3000"
        echo "  Frontend:       http://localhost:3001"
        echo "  Database UI:    http://localhost:8080"
        echo "  Redis UI:       http://localhost:8001"
        echo ""
        echo "Both backend and frontend are running locally with hot reload enabled!"
        echo ""
        echo "View logs with:"
        echo "  Backend:  tail -f /tmp/backend.log"
        echo "  Frontend: tail -f /tmp/frontend.log"
        ;;
        
    stop)
        print_status "Stopping development environment..."
        
        # Kill local backend process
        print_status "Stopping local backend..."
        if [ -f /tmp/backend.pid ]; then
            kill $(cat /tmp/backend.pid) 2>/dev/null || true
            rm /tmp/backend.pid
        fi
        pkill -f "tsx watch" 2>/dev/null || true
        
        # Kill local frontend process
        print_status "Stopping local frontend..."
        if [ -f /tmp/frontend.pid ]; then
            kill $(cat /tmp/frontend.pid) 2>/dev/null || true
            rm /tmp/frontend.pid
        fi
        pkill -f "vite" 2>/dev/null || true
        
        # Stop Docker containers
        print_status "Stopping Docker services..."
        docker-compose -f docker-compose.dev.yml down
        
        print_success "Development environment stopped!"
        ;;
        
    restart)
        print_status "Restarting development environment..."
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        echo "Development Environment Status:"
        echo "==============================="
        echo ""
        echo "Docker Services:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAME|interactive-learning)" || echo "No services running"
        echo ""
        echo "Local Backend Process:"
        ps aux | grep "tsx watch" | grep -v grep || echo "Backend not running locally"
        echo ""
        echo "Local Frontend Process:"
        ps aux | grep "vite" | grep -v grep || echo "Frontend not running locally"
        echo ""
        
        # Test health endpoints
        echo "Service Health Checks:"
        echo "----------------------"
        echo -n "Backend:  "
        curl -s http://localhost:3000/health 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✅ Healthy (v{data['version']})\") if data['status']=='healthy' else print('❌ Not responding')" 2>/dev/null || echo "❌ Not responding"
        
        echo -n "Frontend: "
        curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null | grep -q "200" && echo "✅ Running" || echo "❌ Not responding"
        ;;
        
    logs)
        case "$2" in
            backend)
                if [ -f /tmp/backend.log ]; then
                    tail -f /tmp/backend.log
                else
                    print_error "Backend log file not found. Is the backend running?"
                fi
                ;;
            frontend)
                if [ -f /tmp/frontend.log ]; then
                    tail -f /tmp/frontend.log
                else
                    print_error "Frontend log file not found. Is the frontend running?"
                fi
                ;;
            db)
                docker logs -f interactive-learning-db
                ;;
            redis)
                docker logs -f interactive-learning-redis
                ;;
            *)
                echo "Usage: $0 logs [backend|frontend|db|redis]"
                ;;
        esac
        ;;
        
    db:migrate)
        print_status "Running database migrations..."
        npx prisma migrate dev --schema=database/prisma/schema.prisma
        print_success "Migrations completed!"
        ;;
        
    db:studio)
        print_status "Opening Prisma Studio..."
        npx prisma studio --schema=database/prisma/schema.prisma
        ;;
        
    db:reset)
        print_warning "This will reset your database and delete all data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Resetting database..."
            npx prisma migrate reset --force --schema=database/prisma/schema.prisma
            print_success "Database reset completed!"
        else
            print_status "Database reset cancelled."
        fi
        ;;
        
    install)
        print_status "Installing all dependencies..."
        
        # Backend dependencies
        print_status "Installing backend dependencies..."
        npm install
        
        # Frontend dependencies
        print_status "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
        
        print_success "All dependencies installed!"
        ;;
        
    clean)
        print_warning "This will remove all Docker volumes and clean up development files!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $0 stop
            print_status "Removing Docker volumes..."
            docker-compose -f docker-compose.dev.yml down -v
            print_status "Cleaning up log files..."
            rm -f /tmp/backend.log /tmp/frontend.log /tmp/backend.pid /tmp/frontend.pid
            print_success "Cleanup completed!"
        else
            print_status "Cleanup cancelled."
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|db:migrate|db:studio|db:reset|install|clean}"
        echo ""
        echo "Commands:"
        echo "  start       - Start all services (Docker databases + local apps)"
        echo "  stop        - Stop all services"
        echo "  restart     - Restart all services"
        echo "  status      - Show status of all services"
        echo "  logs        - Show logs (backend|frontend|db|redis)"
        echo "  db:migrate  - Run database migrations"
        echo "  db:studio   - Open Prisma Studio"
        echo "  db:reset    - Reset database (WARNING: deletes all data)"
        echo "  install     - Install all dependencies"
        echo "  clean       - Clean up Docker volumes and temp files"
        exit 1
        ;;
esac