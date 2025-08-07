# Development Environment Setup

This guide will help you set up the Interactive Learning Platform for local development using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 18+ (for running scripts locally)
- Git

## Quick Start

### 1. Automatic Setup
```bash
npm run dev:setup
```

This script will:
- Create environment configuration
- Generate Prisma client
- Build and start all Docker services
- Initialize the database with schema and sample data
- Verify all services are healthy

### 2. Manual Setup (Alternative)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.development .env

# Generate Prisma client
npm run db:generate

# Start all services
npm run dev:up

# View logs (optional)
npm run dev:logs
```

## Services

The development environment includes:

| Service | Port | Description | Admin URL |
|---------|------|-------------|-----------|
| **Backend API** | 3000 | Node.js/TypeScript API with hot-reload | http://localhost:3000 |
| **PostgreSQL** | 5432 | Database with educational platform schema | - |
| **Redis** | 6379 | Session storage and caching | - |
| **Adminer** | 8080 | Database administration interface | http://localhost:8080 |
| **RedisInsight** | 8001 | Redis administration interface | http://localhost:8001 |

## Development Commands

### Docker Services
```bash
# Start all services
npm run dev:up

# Stop all services
npm run dev:down

# Restart all services
npm run dev:restart

# View real-time logs
npm run dev:logs

# Reset everything (clean slate)
npm run dev:reset

# Start only database services
npm run dev:db-only

# Clean up Docker resources
npm run dev:clean
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Reset database and run migrations
npm run db:reset

# Open Prisma Studio
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Development
```bash
# Run backend with hot-reload (inside container)
npm run dev

# Build TypeScript
npm run build

# Type checking
npm run type-check

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Teacher",
    "role": "TEACHER"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Password123"
  }'
```

### User Management
```bash
# Get current user profile (requires authentication)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# List users (admin only)
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Lesson Management
```bash
# Create a new lesson (teacher/admin)
curl -X POST http://localhost:3000/api/v1/lessons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Introduction to React",
    "description": "Learn the basics of React development",
    "difficulty": "beginner",
    "estimatedTime": 120,
    "objectives": ["Understand React components", "Learn JSX syntax"]
  }'

# List all lessons
curl -X GET http://localhost:3000/api/v1/lessons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Access

### Using Adminer (Web Interface)
1. Open http://localhost:8080
2. Login with:
   - **System**: PostgreSQL
   - **Server**: postgres
   - **Username**: postgres
   - **Password**: postgres_dev_password
   - **Database**: interactive_learning

### Using CLI
```bash
# Connect to PostgreSQL container
docker exec -it interactive-learning-db psql -U postgres -d interactive_learning

# Example queries
\dt  -- List tables
SELECT * FROM users LIMIT 5;
SELECT * FROM lessons WHERE status = 'PUBLISHED';
```

## Redis Access

### Using RedisInsight (Web Interface)
1. Open http://localhost:8001
2. Add database:
   - **Host**: redis
   - **Port**: 6379
   - **Password**: redis_dev_password

### Using CLI
```bash
# Connect to Redis container
docker exec -it interactive-learning-redis redis-cli -a redis_dev_password

# Example commands
PING
KEYS *
GET some_key
```

## Environment Variables

Key environment variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5432/interactive_learning?schema=public"

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production_2024
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_2024

# Redis
REDIS_URL=redis://:redis_dev_password@localhost:6379

# AI APIs (optional for testing)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## Troubleshooting

### Services Not Starting
```bash
# Check Docker status
docker ps

# View service logs
npm run dev:logs

# Restart specific service
docker-compose -f docker-compose.dev.yml restart backend
```

### Database Connection Issues
```bash
# Check PostgreSQL health
docker exec interactive-learning-db pg_isready -U postgres -d interactive_learning

# Reset database
npm run dev:reset
```

### Port Conflicts
If you have port conflicts, update the ports in `docker-compose.dev.yml`:

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Use different host port
```

### Clean Reset
```bash
# Nuclear option - clean everything
npm run dev:clean
npm run dev:setup
```

## Development Workflow

1. **Start Development Environment**:
   ```bash
   npm run dev:setup
   ```

2. **Develop and Test**:
   - Backend code changes trigger hot-reload
   - Use API endpoints to test functionality
   - Monitor logs with `npm run dev:logs`

3. **Database Changes**:
   - Modify Prisma schema in `database/prisma/schema.prisma`
   - Run `npm run db:migrate` to create migration
   - Test with sample data using `npm run db:seed`

4. **Debugging**:
   - Check service health at http://localhost:3000/health
   - Use Adminer for database inspection
   - View container logs for troubleshooting

5. **Cleanup**:
   ```bash
   npm run dev:down  # Stop services
   npm run dev:clean # Full cleanup
   ```

## Next Steps

Once your development environment is running:

1. **Test the API** using the provided curl commands
2. **Create sample data** using the seed script
3. **Explore the database** using Adminer
4. **Monitor services** using the logs
5. **Start developing** new features with hot-reload

The development environment provides a complete local setup that mirrors production infrastructure while maintaining fast development cycles.