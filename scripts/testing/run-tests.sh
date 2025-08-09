#!/bin/bash

# Interactive Learning Platform - Test Runner
# Comprehensive test execution script for Phase 1 foundation tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required services are running
check_services() {
    print_header "Checking Required Services"
    
    # Check if PostgreSQL is accessible
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_error "PostgreSQL is not accessible. Please ensure it's running."
        echo "You can start it with: docker-compose up -d postgres"
        exit 1
    else
        print_success "PostgreSQL is accessible"
    fi
    
    # Check if test database exists
    if ! psql -h localhost -p 5432 -U postgres -lqt | cut -d \| -f 1 | grep -qw learning_platform_test; then
        print_warning "Test database doesn't exist. Creating it..."
        createdb -h localhost -p 5432 -U postgres learning_platform_test || {
            print_error "Failed to create test database"
            exit 1
        }
        print_success "Test database created"
    else
        print_success "Test database exists"
    fi
}

# Run backend tests
run_backend_tests() {
    print_header "Running Backend Tests"
    
    # Set test environment
    export NODE_ENV=test
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_platform_test"
    
    # Run database migrations for test database
    print_warning "Running test database migrations..."
    npx prisma migrate deploy --schema=database/prisma/schema.prisma || {
        print_error "Failed to run test database migrations"
        exit 1
    }
    
    # Run Jest tests
    print_warning "Running Jest tests..."
    npm test -- --verbose --coverage || {
        print_error "Backend tests failed"
        exit 1
    }
    
    print_success "Backend tests completed successfully"
}

# Run frontend tests
run_frontend_tests() {
    print_header "Running Frontend Tests"
    
    cd frontend
    
    # Run Vitest tests
    print_warning "Running Vitest tests..."
    npm run test:run || {
        print_error "Frontend tests failed"
        cd ..
        exit 1
    }
    
    cd ..
    print_success "Frontend tests completed successfully"
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    # Start services if not running
    print_warning "Ensuring services are running for integration tests..."
    docker-compose -f docker-compose.dev.yml up -d postgres redis
    
    # Wait for services to be ready
    sleep 5
    
    # Run API integration tests
    if [ -f "scripts/test-api.sh" ]; then
        print_warning "Running API integration tests..."
        bash scripts/test-api.sh || {
            print_error "Integration tests failed"
            exit 1
        }
        print_success "Integration tests completed successfully"
    else
        print_warning "API integration tests script not found, skipping..."
    fi
}

# Generate coverage reports
generate_coverage() {
    print_header "Generating Coverage Reports"
    
    # Backend coverage
    if [ -d "coverage" ]; then
        print_success "Backend coverage report generated in ./coverage/lcov-report/index.html"
    fi
    
    # Frontend coverage
    if [ -d "frontend/coverage" ]; then
        print_success "Frontend coverage report generated in ./frontend/coverage/index.html"
    fi
    
    # Combined coverage summary
    echo ""
    echo -e "${BLUE}Coverage Summary:${NC}"
    echo "Backend: Check ./coverage/lcov-report/index.html"
    echo "Frontend: Check ./frontend/coverage/index.html"
}

# Main execution
main() {
    print_header "Interactive Learning Platform - Test Suite"
    echo "Running Phase 1: Foundation Tests"
    echo ""
    
    # Parse command line arguments
    SKIP_SERVICES=false
    RUN_BACKEND=true
    RUN_FRONTEND=true
    RUN_INTEGRATION=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-services)
                SKIP_SERVICES=true
                shift
                ;;
            --backend-only)
                RUN_FRONTEND=false
                RUN_INTEGRATION=false
                shift
                ;;
            --frontend-only)
                RUN_BACKEND=false
                RUN_INTEGRATION=false
                shift
                ;;
            --integration-only)
                RUN_BACKEND=false
                RUN_FRONTEND=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-services     Skip service checks"
                echo "  --backend-only      Run only backend tests"
                echo "  --frontend-only     Run only frontend tests"
                echo "  --integration-only  Run only integration tests"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check services unless skipped
    if [ "$SKIP_SERVICES" = false ]; then
        check_services
    fi
    
    # Run tests based on options
    if [ "$RUN_BACKEND" = true ]; then
        run_backend_tests
    fi
    
    if [ "$RUN_FRONTEND" = true ]; then
        run_frontend_tests
    fi
    
    if [ "$RUN_INTEGRATION" = true ]; then
        run_integration_tests
    fi
    
    # Generate coverage reports
    generate_coverage
    
    print_header "Test Execution Complete"
    print_success "All tests passed successfully!"
    echo ""
    echo "Phase 1: Foundation tests are complete."
    echo "Next steps:"
    echo "  1. Review coverage reports"
    echo "  2. Address any gaps in test coverage"
    echo "  3. Proceed to Phase 2: Core Coverage"
}

# Execute main function with all arguments
main "$@"