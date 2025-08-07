# Tech Stack and Dependencies

## Core Technologies
- **Runtime**: Node.js >= 18.0.0
- **Language**: TypeScript with strict configuration
- **Backend Framework**: Express.js with comprehensive middleware stack
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React/TypeScript (separate application)
- **Real-time**: Socket.IO for real-time features
- **File Storage**: Google Cloud Storage for video content
- **Authentication**: JWT with bcrypt password hashing

## Key Dependencies

### Backend Core
- `express` - Web application framework
- `prisma` + `@prisma/client` - Database ORM and client
- `typescript` - Type-safe JavaScript
- `tsx` - TypeScript execution and watch mode
- `zod` - Runtime type validation
- `dotenv` - Environment variable management

### Security & Middleware
- `helmet` - Security headers middleware
- `cors` - Cross-origin resource sharing
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token handling
- `compression` - Response compression
- `morgan` - HTTP request logging

### AI & External Services
- `openai` - OpenAI API integration
- `@anthropic-ai/sdk` - Claude API integration
- `@google-cloud/storage` - Google Cloud Storage
- `axios` - HTTP client for external APIs

### Utilities
- `winston` - Structured logging
- `multer` - File upload handling
- `redis` - Caching and session storage
- `node-cron` - Scheduled tasks
- `uuid` - Unique identifier generation
- `socket.io` - WebSocket communication

### Development Tools
- `@typescript-eslint/*` - TypeScript ESLint configuration
- `jest` + `@types/jest` - Testing framework
- `supertest` - HTTP testing
- `nodemon` - Development file watching
- `prisma` - Database migrations and studio

## TypeScript Configuration
- Target: ES2022 with strict type checking
- Module system: CommonJS
- Path aliases for clean imports (`@/*` patterns)
- Declaration files and source maps enabled
- Strict null checks and function types
- No unused locals or parameters enforced