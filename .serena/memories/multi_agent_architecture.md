# Multi-Agent Architecture Guide

## Agent Specializations

### 1. Agent Lead (Orchestration)
- **Role**: Coordinates all other agents and manages task dependencies
- **Responsibilities**: 
  - Requirement analysis and task breakdown
  - Dependency mapping across agents
  - Parallel coordination for efficiency
  - Integration management and quality validation
  - Progress tracking with milestone indicators

### 2. Backend Agent (Node.js/TypeScript)
- **Role**: Server-side development and API implementation
- **Focus Areas**:
  - Educational APIs and authentication systems
  - Video milestone tracking and streaming optimization
  - AI integration layer with configurable providers (OpenAI, Claude)
  - Multi-tenant architecture with role-based permissions
- **Technologies**: Express.js, Prisma, PostgreSQL, JWT, Socket.IO

### 3. Frontend Agent (React/TypeScript)
- **Role**: User interface development
- **Focus Areas**:
  - Interactive video player with educational overlays
  - Role-based dashboards (student/teacher/admin)
  - Mobile-responsive educational interfaces
  - Real-time progress tracking and analytics displays
- **Technologies**: React, TypeScript, responsive design

### 4. Database Agent (PostgreSQL)
- **Role**: Database design and optimization
- **Focus Areas**:
  - Educational data modeling (users, lessons, progress)
  - Video metadata and milestone optimization
  - Multi-tenant data isolation patterns
  - Learning analytics and reporting schemas
- **Technologies**: PostgreSQL, Prisma Schema, migrations

### 5. Testing Agent (Quality Assurance)
- **Role**: Comprehensive testing strategies
- **Focus Areas**:
  - Video interaction and milestone validation
  - Educational workflow testing (complete learning paths)
  - Multi-role authorization and access control testing
  - Performance testing for concurrent video streaming
- **Technologies**: Jest, Supertest, load testing tools

### 6. DevOps Agent (Infrastructure)
- **Role**: Deployment and infrastructure management
- **Focus Areas**:
  - Docker containerization for educational platform services
  - Local development environment automation with Docker Compose
  - Google Cloud Platform deployment and infrastructure as code
  - CI/CD pipelines with automated testing and security scanning
  - Monitoring and observability for educational platform health
- **Technologies**: Docker, GCP, CI/CD, monitoring tools

### 7. Docs Writer Agent (Documentation)
- **Role**: Comprehensive documentation creation
- **Focus Areas**:
  - User guides for teachers, students, and administrators
  - Developer documentation for TypeScript/React/Node.js stack
  - Educational compliance and accessibility guides
  - API documentation and deployment procedures

## Agent Invocation Protocol

### Standard Format
```
@[AGENT_NAME] - TASK: [specific task]
CONTEXT: [relevant background]
DEPENDENCIES: [what this task depends on]
DELIVERABLES: [expected outputs]
PRIORITY: [high/medium/low]
```

### Example Multi-Agent Coordination
```
@database-agent - TASK: Add lesson prerequisite system to schema
CONTEXT: Teachers need to set learning path dependencies
DEPENDENCIES: Current schema analysis complete
DELIVERABLES: Updated Prisma schema with prerequisite relationships
PRIORITY: high

@backend-agent - TASK: Implement prerequisite validation APIs
CONTEXT: Enforce learning path requirements
DEPENDENCIES: Database schema updated with prerequisites
DELIVERABLES: API endpoints for prerequisite checking and enforcement
PRIORITY: high

@frontend-agent - TASK: Create prerequisite selection UI for teachers
CONTEXT: Teachers need interface to set course dependencies
DEPENDENCIES: Backend prerequisite APIs implemented
DELIVERABLES: React components for prerequisite management
PRIORITY: high

@testing-agent - TASK: Validate prerequisite enforcement workflows
CONTEXT: Ensure learning path dependencies work correctly
DEPENDENCIES: Frontend and backend prerequisite features complete
DELIVERABLES: Test suites for prerequisite functionality
PRIORITY: medium
```

## Development Phases & Dependencies

### Phase 1: Foundation (Database + Backend)
**Critical Path**: Database schema → Backend APIs → Frontend contracts

**Database Agent Tasks**:
- Multi-role educational schema design
- Multi-tenant data isolation patterns
- Migration scripts with zero-downtime strategy
- Optimized indexes for video and progress queries

**Backend Agent Tasks**:
- JWT authentication with role-based middleware
- Core user management APIs
- Google Cloud Storage integration
- Video milestone tracking APIs

### Phase 2: Interactive Learning (Frontend + AI)
**Critical Path**: Core APIs → Video player → AI integration → Question workflows

**Frontend Agent Tasks**:
- Interactive video player with milestone functionality
- Role-based dashboards and responsive interfaces
- Question overlay components

**Backend Agent Tasks**:
- Multi-AI provider abstraction layer
- Question generation with approval workflows
- Real-time progress tracking endpoints
- Video streaming optimization

### Phase 3: Quality & Deployment
**Critical Path**: Feature completion → Testing → Containerization → Deployment → Documentation

**Testing Agent Tasks**:
- Comprehensive educational workflow testing
- Multi-role authorization testing
- Performance testing for concurrent users

**DevOps Agent Tasks**:
- Docker containerization
- Local development environment
- GCP infrastructure and CI/CD
- Monitoring and observability

**Docs Writer Agent Tasks**:
- User guides for all roles
- Developer documentation
- Deployment and infrastructure guides

## Integration Points & Quality Gates

### Critical Integration Points
1. **Video + AI Workflow**: Player → Milestone detection → AI questions → Approval
2. **Multi-Tenant Architecture**: Database isolation → Backend authorization → Frontend UI
3. **Real-Time Analytics**: Database tracking → Backend APIs → Frontend dashboards
4. **Cross-Device Sessions**: Database persistence → Backend management → Frontend sync

### Quality Gates
- **Before Phase 2**: Database validated, authentication tested, GCS integration confirmed
- **Before Phase 3**: Video player functional, AI workflow operational, dashboards active
- **Before Production**: End-to-end workflows tested, performance benchmarks met, security audited