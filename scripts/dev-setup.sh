#!/bin/bash
# Development Environment Setup Script

set -e

echo "🚀 Setting up Interactive Learning Platform Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from development template...${NC}"
    cp .env.development .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${BLUE}ℹ️  .env file already exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p logs uploads database/backups

# Generate Prisma client
echo -e "${YELLOW}🔨 Generating Prisma client...${NC}"
npm run db:generate

# Build and start services
echo -e "${YELLOW}🐳 Building and starting Docker services...${NC}"
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${YELLOW}🏥 Checking service health...${NC}"

# Check PostgreSQL
if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d interactive_learning; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
fi

# Check Redis
if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis is not ready${NC}"
fi

# Check Backend API
if curl -f http://localhost:3000/health &> /dev/null; then
    echo -e "${GREEN}✅ Backend API is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API is starting up...${NC}"
fi

# Check Frontend
if curl -f http://localhost:3001 &> /dev/null; then
    echo -e "${GREEN}✅ Frontend is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is starting up...${NC}"
fi

echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
echo -e "${BLUE}📋 Available services:${NC}"
echo -e "  • Frontend App: http://localhost:3001"
echo -e "  • Backend API: http://localhost:3000"
echo -e "  • Database Admin (Adminer): http://localhost:8080"
echo -e "  • Redis Admin (RedisInsight): http://localhost:8001"
echo -e "  • PostgreSQL: localhost:5432"
echo -e "  • Redis: localhost:6379"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo -e "  • npm run dev:up    - Start all services"
echo -e "  • npm run dev:down  - Stop all services"
echo -e "  • npm run dev:logs  - View service logs"
echo -e "  • npm run dev:reset - Reset and rebuild everything"