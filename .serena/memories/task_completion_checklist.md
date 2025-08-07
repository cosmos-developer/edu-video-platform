# Task Completion Checklist

## Required Commands After Any Code Changes

### 1. Type Checking (MANDATORY)
```bash
npm run type-check
```
- **Purpose**: Ensures TypeScript type safety and catches compilation errors
- **When**: After ANY code modification
- **Failure Action**: Fix all TypeScript errors before proceeding

### 2. Linting (MANDATORY)
```bash
npm run lint
```
- **Purpose**: Enforces code style and catches potential issues
- **Automatic Fix**: Use `npm run lint:fix` for auto-fixable issues
- **When**: After ANY code modification
- **Failure Action**: Fix all linting errors manually or with auto-fix

### 3. Testing (MANDATORY)
```bash
npm test
```
- **Purpose**: Validates functionality and prevents regressions
- **Coverage**: Use `npm run test:coverage` for coverage reports
- **When**: After ANY functional changes
- **Failure Action**: Fix failing tests before considering task complete

### 4. Build Verification (RECOMMENDED)
```bash
npm run build
```
- **Purpose**: Confirms production build succeeds
- **When**: After significant changes or before deployment
- **Failure Action**: Resolve build errors

## Pre-Commit Checklist

### Code Quality Gates
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] All ESLint issues fixed (`npm run lint`)
- [ ] All tests passing (`npm test`)
- [ ] Build succeeds without warnings (`npm run build`)

### Database Changes
- [ ] Prisma client regenerated if schema changed (`npm run db:generate`)
- [ ] Migration created and tested (`npm run db:migrate`)
- [ ] Seed data updated if needed (`npm run db:seed`)

### Security Checklist
- [ ] No sensitive data (passwords, API keys) in code
- [ ] Input validation implemented for new endpoints
- [ ] Authentication/authorization checks in place
- [ ] Rate limiting configured for new public endpoints

### Educational Platform Specific
- [ ] Multi-role access control tested
- [ ] Video milestone functionality validated
- [ ] AI integration error handling implemented
- [ ] Cross-device session persistence working
- [ ] Progress tracking updates correctly

## Development Environment Validation

### Docker Environment
```bash
# Ensure development environment is running
npm run dev:up

# Check container health
npm run dev:logs

# Test API endpoints
npm run dev:test
```

### Database Integrity
```bash
# Verify database connection
npm run db:studio

# Check migration status
npx prisma migrate status --schema=database/prisma/schema.prisma

# Validate seed data
npm run db:seed
```

## Performance Considerations
- [ ] Database queries optimized with proper indexes
- [ ] Large file uploads handled efficiently
- [ ] Video streaming performance tested
- [ ] Concurrent user load considered
- [ ] Memory leaks checked for long-running processes

## Documentation Updates
- [ ] API changes documented
- [ ] New environment variables added to `.env.example`
- [ ] README updated if setup process changed
- [ ] Type interfaces documented for complex data structures

## Multi-Agent Coordination
- [ ] Agent dependencies identified and communicated
- [ ] Integration points tested between agents
- [ ] Quality gates passed before handoff to next agent
- [ ] Progress tracked and reported to Agent Lead