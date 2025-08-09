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

# Check if database is ready
check_db_ready() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if npx prisma db execute --stdin --schema=database/prisma/schema.prisma <<< "SELECT 1;" 2>/dev/null; then
            return 0
        fi
        print_status "Waiting for database to be ready... (attempt $attempt/$max_attempts)"
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Verify seed data and authentication
verify_seed() {
    print_status "Verifying seed data and authentication..."
    
    # Check if backend is running
    if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
        print_warning "Backend not running, skipping authentication verification"
        return 1
    fi
    
    # Test default users
    local test_users=(
        "admin@example.com:Demo123!"
        "teacher@example.com:Demo123!"
        "student@example.com:Demo123!"
    )
    
    local all_passed=true
    
    for user_pass in "${test_users[@]}"; do
        IFS=':' read -r email password <<< "$user_pass"
        
        # Create temp JSON file for authentication test
        echo "{\"email\":\"$email\",\"password\":\"$password\"}" > /tmp/auth_test.json
        
        # Test authentication
        if curl -s -X POST http://localhost:3000/api/v1/auth/login \
            -H "Content-Type: application/json" \
            -d @/tmp/auth_test.json \
            -o /tmp/auth_response.json 2>/dev/null; then
            
            if grep -q "\"success\":true" /tmp/auth_response.json 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} $email can authenticate"
            else
                echo -e "  ${RED}✗${NC} $email authentication failed"
                all_passed=false
            fi
        else
            echo -e "  ${RED}✗${NC} $email - API call failed"
            all_passed=false
        fi
    done
    
    # Cleanup
    rm -f /tmp/auth_test.json /tmp/auth_response.json
    
    if [ "$all_passed" = true ]; then
        print_success "All default users can authenticate!"
        return 0
    else
        print_error "Some users failed authentication. Run: $0 db:seed:fix"
        return 1
    fi
}

# Commands
case "$1" in
    start)
        print_status "Starting development environment..."
        
        # Start Docker services (DB, Redis only)
        print_status "Starting Docker services (Database & Redis)..."
        docker-compose -f docker-compose.dev.yml up -d postgres redis adminer redis-insight
        
        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        if ! check_db_ready; then
            print_error "Database failed to start. Check Docker logs."
            exit 1
        fi
        
        # Check migration status
        print_status "Checking database migration status..."
        MIGRATE_STATUS=$(npx prisma migrate status --schema=database/prisma/schema.prisma 2>&1)
        
        if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
            print_success "Database schema is up to date!"
        elif echo "$MIGRATE_STATUS" | grep -q "No migration found in prisma/migrations"; then
            print_warning "No migration history found. Creating baseline migration..."
            npx prisma migrate diff --from-empty --to-schema-datamodel database/prisma/schema.prisma --script > /tmp/baseline.sql 2>/dev/null
            if [ -s /tmp/baseline.sql ]; then
                mkdir -p database/prisma/migrations/0_init
                mv /tmp/baseline.sql database/prisma/migrations/0_init/migration.sql
                npx prisma migrate resolve --applied 0_init --schema=database/prisma/schema.prisma
                print_success "Baseline migration created and marked as applied!"
            else
                print_warning "Database appears to be empty, generating schema..."
                npx prisma db push --schema=database/prisma/schema.prisma
            fi
        else
            print_warning "Database schema is not up to date. Running migrations..."
            npx prisma migrate deploy --schema=database/prisma/schema.prisma
        fi
        
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
        
        # Seed database if empty
        print_status "Checking if database needs seeding..."
        USER_COUNT=$(npx prisma db execute --stdin --schema=database/prisma/schema.prisma <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -o '[0-9]\+' | head -1)
        
        if [ "$USER_COUNT" -eq "0" ] 2>/dev/null; then
            print_warning "Database is empty. Running seed..."
            npm run db:seed
        else
            print_status "Database already has $USER_COUNT users"
        fi
        
        # Start backend locally
        print_status "Starting backend locally with hot reload..."
        nohup npm run dev > /tmp/backend.log 2>&1 &
        echo $! > /tmp/backend.pid
        
        # Start frontend locally
        print_status "Starting frontend locally with hot reload..."
        cd frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &
        echo $! > /tmp/frontend.pid
        cd ..
        
        # Wait for services to start
        print_status "Waiting for services to start..."
        sleep 5
        
        # Verify authentication
        verify_seed || print_warning "Authentication verification failed - you may need to fix seed data"
        
        print_success "Development environment started!"
        echo ""
        echo "Services available at:"
        echo "  Backend API:    http://localhost:3000"
        echo "  Frontend:       http://localhost:3001"
        echo "  Database UI:    http://localhost:8080"
        echo "  Redis UI:       http://localhost:8001"
        echo ""
        echo "Default credentials:"
        echo "  Admin:    admin@example.com / Demo123!"
        echo "  Teacher:  teacher@example.com / Demo123!"
        echo "  Student:  student@example.com / Demo123!"
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
        
        echo ""
        echo "Authentication Status:"
        echo "---------------------"
        verify_seed
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
        
    db:seed)
        print_status "Running database seed..."
        
        # Check if database is ready
        if ! check_db_ready; then
            print_error "Database is not ready. Start the environment first: $0 start"
            exit 1
        fi
        
        # Run seed script
        if [ -f "database/seed.ts" ]; then
            print_status "Running TypeScript seed script..."
            npx tsx database/seed.ts
        elif [ -f "scripts/seed.js" ]; then
            print_status "Running JavaScript seed script..."
            node scripts/seed.js
        else
            print_error "No seed script found!"
            exit 1
        fi
        
        print_success "Database seeded!"
        ;;
        
    db:seed:fix)
        print_status "Fixing seed data and authentication..."
        
        # Check if database is ready
        if ! check_db_ready; then
            print_error "Database is not ready. Start the environment first: $0 start"
            exit 1
        fi
        
        # Run the fix script
        if [ -f "scripts/check-user.js" ]; then
            node scripts/check-user.js
        else
            print_warning "Fix script not found. Creating it..."
            cat > scripts/check-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixUsers() {
  const defaultUsers = [
    { email: 'admin@example.com', firstName: 'Demo', lastName: 'Admin', role: 'ADMIN' },
    { email: 'teacher@example.com', firstName: 'Demo', lastName: 'Teacher', role: 'TEACHER' },
    { email: 'student@example.com', firstName: 'Demo', lastName: 'Student', role: 'STUDENT' }
  ];
  
  const passwordHash = await bcrypt.hash('Demo123!', 10);
  
  for (const userData of defaultUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash },
      create: {
        ...userData,
        passwordHash,
        status: 'ACTIVE'
      }
    });
    console.log(`✓ Fixed user: ${user.email}`);
  }
}

fixUsers()
  .then(() => {
    console.log('✅ All users fixed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
EOF
            node scripts/check-user.js
        fi
        
        print_success "Seed data fixed!"
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
            
            # Automatically seed after reset
            print_status "Running seed after reset..."
            $0 db:seed
        else
            print_status "Database reset cancelled."
        fi
        ;;
        
    test:auth)
        print_status "Testing authentication for all default users..."
        
        # Check if backend is running
        if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
            print_error "Backend is not running. Start it first: $0 start"
            exit 1
        fi
        
        verify_seed
        if [ $? -eq 0 ]; then
            print_success "All authentication tests passed!"
        else
            print_error "Some authentication tests failed!"
            print_status "Try running: $0 db:seed:fix"
            exit 1
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
        echo "Usage: $0 {start|stop|restart|status|logs|db:migrate|db:seed|db:seed:fix|db:studio|db:reset|test:auth|install|clean}"
        echo ""
        echo "Commands:"
        echo "  start         - Start all services (Docker databases + local apps)"
        echo "  stop          - Stop all services"
        echo "  restart       - Restart all services"
        echo "  status        - Show status of all services"
        echo "  logs          - Show logs (backend|frontend|db|redis)"
        echo "  db:migrate    - Run database migrations"
        echo "  db:seed       - Seed database with default data"
        echo "  db:seed:fix   - Fix authentication for default users"
        echo "  db:studio     - Open Prisma Studio"
        echo "  db:reset      - Reset database (WARNING: deletes all data)"
        echo "  test:auth     - Test authentication for all default users"
        echo "  install       - Install all dependencies"
        echo "  clean         - Clean up Docker volumes and temp files"
        echo ""
        echo "Default Credentials:"
        echo "  Admin:    admin@example.com / Demo123!"
        echo "  Teacher:  teacher@example.com / Demo123!"
        echo "  Student:  student@example.com / Demo123!"
        exit 1
        ;;
esac