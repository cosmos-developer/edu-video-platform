# Modular Monolith Architecture

This codebase follows a modular monolith architecture pattern, organizing code by business domains rather than technical layers.

## Module Structure

Each module follows Domain-Driven Design (DDD) principles with the following layers:

```
module/
├── domain/           # Core business logic and entities
│   ├── entities/     # Domain entities and value objects
│   ├── repositories/ # Repository interfaces (ports)
│   └── services/     # Domain services
├── application/      # Application services and use cases
│   ├── services/     # Application services orchestrating domain logic
│   └── usecases/     # Use case implementations
├── infrastructure/   # External dependencies and implementations
│   ├── repositories/ # Repository implementations (adapters)
│   └── external/     # External service integrations
├── interfaces/       # Entry points to the module
│   ├── http/         # REST API controllers and routes
│   ├── graphql/      # GraphQL resolvers (if applicable)
│   └── events/       # Event handlers and publishers
└── index.ts          # Module public API

```

## Modules

### 1. User Module (`/user`)
Handles user management, authentication, and authorization.
- **Entities**: User, Role, Permission
- **Services**: AuthService, UserService, JWTService
- **Use Cases**: Register, Login, UpdateProfile, ManageRoles

### 2. Content Module (`/content`)
Manages educational content including lessons, videos, and milestones.
- **Entities**: Lesson, Video, VideoGroup, Milestone
- **Services**: LessonService, VideoService, MilestoneService
- **Use Cases**: CreateLesson, UploadVideo, SetMilestone

### 3. Assessment Module (`/assessment`)
Handles questions, quizzes, and grading.
- **Entities**: Question, QuestionOption, QuestionAttempt, Grade
- **Services**: QuestionService, GradingService
- **Use Cases**: CreateQuestion, SubmitAnswer, CalculateGrade

### 4. Progress Module (`/progress`)
Tracks student progress and learning sessions.
- **Entities**: StudentSession, Progress, MilestoneProgress
- **Services**: SessionService, ProgressService
- **Use Cases**: StartSession, UpdateProgress, CompleteM ilestone

### 5. AI Integration Module (`/ai-integration`)
Integrates with AI providers for content generation.
- **Entities**: AIConfiguration, AIUsageLog
- **Services**: AIQuestionGenerator, AIContentAnalyzer
- **Use Cases**: GenerateQuestions, AnalyzeContent

### 6. Analytics Module (`/analytics`)
Provides reporting and analytics capabilities.
- **Entities**: AnalyticsEvent, Report
- **Services**: AnalyticsService, ReportingService
- **Use Cases**: TrackEvent, GenerateReport, GetDashboardMetrics

### 7. Shared Module (`/shared`)
Contains cross-cutting concerns and shared utilities.
- **Common**: Base entities, value objects, exceptions
- **Utils**: Validators, formatters, helpers
- **Infrastructure**: Database connections, middleware

## Module Communication

Modules communicate through well-defined interfaces:

1. **Direct Dependency**: Import and use another module's public API
2. **Event-Driven**: Publish and subscribe to domain events
3. **Shared Kernel**: Use common types and utilities from shared module

## Design Principles

1. **High Cohesion**: Related functionality stays together within a module
2. **Loose Coupling**: Modules depend on interfaces, not implementations
3. **Clear Boundaries**: Each module has a well-defined public API
4. **Domain Focus**: Business logic is centralized in the domain layer
5. **Testability**: Each layer can be tested independently

## Migration from Layered Architecture

This modular structure replaces the previous technical layering:
- `controllers/` → Distributed to each module's `interfaces/http/`
- `services/` → Split between `domain/services/` and `application/services/`
- `routes/` → Distributed to each module's `interfaces/http/routes.ts`
- `middleware/` → Moved to `shared/infrastructure/middleware/`
- `types/` → Distributed to each module's `domain/types/`