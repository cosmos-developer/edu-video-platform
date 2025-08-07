# Code Style and Conventions

## TypeScript Configuration
- **Strict Mode**: All TypeScript strict options enabled
- **Target**: ES2022 with modern JavaScript features
- **Module**: CommonJS for Node.js compatibility
- **Path Aliases**: Clean imports using `@/*` patterns for organized code structure

## Code Structure Patterns

### Directory Organization
```typescript
src/
├── config/         // Environment, database, and system configuration
├── controllers/    // HTTP request handlers (thin layer)
├── middleware/     // Express middleware (auth, security, logging, error handling)
├── models/         // Data models and TypeScript interfaces
├── routes/         // API route definitions and routing logic
├── services/       // Business logic and external service integrations
├── utils/          // Helper utilities and common functions
├── validators/     // Input validation schemas (likely using Zod)
└── types/          // TypeScript type definitions
```

### Import Patterns
```typescript
// External libraries first
import express from 'express';
import { PrismaClient } from '@prisma/client';

// Internal imports with path aliases
import { environment } from '@/config/environment';
import { logger } from '@/utils/logger';
import { AuthService } from '@/services/auth';
```

### Express.js Application Structure
- **Security-First**: Helmet, CORS, rate limiting as standard middleware
- **Comprehensive Logging**: Morgan for HTTP requests, Winston for application logs
- **Error Handling**: Centralized error handling with custom middleware
- **Modular Routes**: Separate route files imported into main routes index
- **Socket.IO Integration**: Real-time features with proper CORS configuration

## Naming Conventions

### Files and Directories
- **camelCase** for TypeScript files: `userController.ts`
- **kebab-case** for configuration: `.env.development`
- **Descriptive names** that indicate purpose: `errorHandler.ts`, `rateLimitMiddleware.ts`

### Variables and Functions
- **camelCase** for variables and functions
- **PascalCase** for classes and interfaces
- **UPPER_SNAKE_CASE** for constants and environment variables

### Database Schema (Prisma)
- **PascalCase** for model names: `User`, `VideoMilestone`
- **camelCase** for field names: `firstName`, `createdAt`
- **UPPER_CASE** for enums: `UserRole`, `UserStatus`

## TypeScript Best Practices

### Type Safety
```typescript
// Strict typing with interfaces
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

// Runtime validation with Zod (likely pattern based on dependencies)
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});
```

### Error Handling
```typescript
// Structured error responses
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

### Async/Await Pattern
```typescript
// Consistent async/await usage (no callbacks or .then chains)
export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw new AppError('User fetch failed', 500);
  }
};
```

## Security Patterns
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API endpoint protection
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Security Headers**: Helmet middleware for security headers

## Database Patterns
- **Multi-tenant Architecture**: Tenant isolation in data models
- **Soft Deletes**: Avoid hard deletion of user data
- **Audit Fields**: createdAt, updatedAt, deletedAt tracking
- **Relationship Modeling**: Clear foreign key relationships
- **Migration-First**: Schema changes through Prisma migrations

## Logging and Monitoring
- **Structured Logging**: Winston with JSON format for production
- **Request Logging**: Morgan for HTTP request/response tracking
- **Error Context**: Include relevant context in error logs
- **Performance Tracking**: Log execution times for critical operations