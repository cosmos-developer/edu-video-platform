# Suggested Commands for Development

## Development Workflow
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## Database Operations
```bash
# Generate Prisma client after schema changes
npm run db:generate

# Run database migrations in development
npm run db:migrate

# Deploy migrations to production
npm run db:deploy

# Open Prisma Studio for database management
npm run db:studio

# Seed database with initial data
npm run db:seed

# Reset database (WARNING: destructive)
npm run db:reset

# Push schema changes without migration
npm run db:push
```

## Code Quality & Testing
```bash
# Run TypeScript type checking
npm run type-check

# Lint code with ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Docker Development Environment
```bash
# Set up development environment
npm run dev:setup

# Start Docker containers (PostgreSQL, Redis)
npm run dev:up

# Stop Docker containers
npm run dev:down

# View Docker logs
npm run dev:logs

# Restart Docker containers
npm run dev:restart

# Reset Docker environment (WARNING: destroys data)
npm run dev:reset

# Start only database and Redis containers
npm run dev:db-only

# Clean up Docker resources
npm run dev:clean

# Test API endpoints
npm run dev:test
```

## Task Completion Commands
After completing any development task, always run these commands to ensure code quality:

```bash
# 1. Type checking (REQUIRED)
npm run type-check

# 2. Linting (REQUIRED)
npm run lint

# 3. Run tests (REQUIRED)
npm test

# 4. If tests pass, build the project
npm run build
```

## System Utilities (macOS/Darwin)
```bash
# File operations
ls -la          # List files with details
find . -name    # Find files by name
grep -r         # Search in files recursively
cp -r           # Copy directories recursively
mv              # Move/rename files
rm -rf          # Remove directories recursively

# Git operations
git status      # Check repository status
git add .       # Stage all changes
git commit -m   # Commit with message
git push        # Push to remote
git pull        # Pull from remote
git branch      # List branches
```

## Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Ensure proper Node.js version
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```