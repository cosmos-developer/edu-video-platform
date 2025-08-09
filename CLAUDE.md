# Interactive Learning Platform - Multi-Agent Development System

This project uses a sophisticated multi-agent coding architecture for educational technology development. Claude Code can operate in different specialized agent modes for focused development tasks.

## Multi-Agent Architecture

The system consists of 7 specialized agents that work in coordination:

1. **Agent Lead** (`.claude/agents/agent-lead.txt`) - Orchestration layer that manages all other agents
2. **Backend Agent** (`.claude/agents/backend-agent.txt`) - Node.js/TypeScript API development  
3. **Frontend Agent** (`.claude/agents/frontend-agent.txt`) - React/TypeScript UI development
4. **Database Agent** (`.claude/agents/database-agent.txt`) - PostgreSQL schema and optimization
5. **Testing Agent** (`.claude/agents/testing-agent.txt`) - Comprehensive testing strategies
6. **DevOps Agent** (`.claude/agents/devops-agent.txt`) - Deployment, Docker, and cloud infrastructure
7. **Docs Writer Agent** (`.claude/agents/docs-writer-agent.txt`) - Documentation and guides

## Agent Invocation Protocol

When working with multiple agents, use this format:
```
@[AGENT_NAME] - TASK: [specific task]
CONTEXT: [relevant background]
DEPENDENCIES: [what this task depends on]
DELIVERABLES: [expected outputs]
PRIORITY: [high/medium/low]
```

## Platform Overview

Interactive Learning Platform built with:
- **Backend**: Node.js/TypeScript with Express.js
- **Frontend**: React/TypeScript with interactive video components
- **Database**: PostgreSQL with educational data modeling
- **Storage**: Google Cloud Storage for video content
- **AI Integration**: Multi-provider (OpenAI, Claude) question generation
- **Authentication**: JWT with role-based access (student/teacher/admin)

## Key Features

- Interactive video player with milestone-based learning
- AI-generated questions with teacher approval workflows  
- Multi-role dashboards and progress tracking
- Cross-device session persistence
- Educational compliance (GDPR, accessibility)
- Real-time analytics and reporting

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production  
npm run build

# Run tests
npm test

# Database migrations
npm run db:migrate

# Code quality checks
npm run lint
npm run typecheck
```

## Troubleshooting & Common Issues

**📋 For recurring development issues, see:** [`docs/COMMON_ERRORS.md`](./docs/COMMON_ERRORS.md)

This document catalogs common errors and their solutions, including:
- BigInt serialization issues in API responses
- Prisma query optimization problems
- Authentication and CORS issues
- Database migration challenges
- Memory leaks and performance issues

Always check this guide when encountering errors to save debugging time.

## Agent Specializations

### Backend Agent Focus
- Educational APIs and authentication systems
- Video milestone tracking and streaming optimization
- AI integration layer with configurable providers
- Multi-tenant architecture with role-based permissions

### Frontend Agent Focus  
- Interactive video player with educational overlays
- Role-based dashboards (student/teacher/admin)
- Mobile-responsive educational interfaces
- Real-time progress tracking and analytics displays

### Database Agent Focus
- Educational data modeling (users, lessons, progress)
- Video metadata and milestone optimization
- Multi-tenant data isolation patterns
- Learning analytics and reporting schemas

### Testing Agent Focus
- Video interaction and milestone validation
- Educational workflow testing (complete learning paths)
- Multi-role authorization and access control testing
- Performance testing for concurrent video streaming

### DevOps Agent Focus
- Docker containerization for educational platform services
- Local development environment automation with Docker Compose
- Google Cloud Platform deployment and infrastructure as code
- CI/CD pipelines with automated testing and security scanning
- Monitoring and observability for educational platform health
- Database migration automation and disaster recovery procedures

### Docs Writer Agent Focus
- User guides for teachers, students, and administrators
- Developer documentation for TypeScript/React/Node.js stack
- Educational compliance and accessibility guides
- API documentation and deployment procedures

## Development Plan & Orchestration

### **Phase 1: Foundation (Database + Backend)**
Priority: HIGH | Duration: 2-3 sprints

**Database Agent Tasks:**
- Design PostgreSQL schema for multi-role educational platform (users, lessons, videos, milestones, questions, progress)
- Implement multi-tenant data isolation with role-based access patterns
- Create migration scripts with zero-downtime deployment strategy
- Optimize indexes for video milestone lookups and progress queries

**Backend Agent Tasks:**
- Implement JWT authentication with role-based authorization middleware
- Build core APIs for user management (student/teacher/admin roles)
- Integrate Google Cloud Storage for video upload and metadata management
- Create video milestone tracking and session persistence APIs

**Dependencies:** Database schema → Backend APIs → Frontend contracts

### **Phase 2: Interactive Learning (Frontend + AI Integration)**
Priority: HIGH | Duration: 3-4 sprints

**Frontend Agent Tasks:**
- Build interactive video player with milestone pause/resume functionality
- Create role-based dashboards (student progress, teacher analytics, admin management)
- Implement question overlay components with multiple question types
- Develop responsive interfaces for cross-device learning continuity

**Backend Agent Tasks:**
- Implement multi-AI provider abstraction layer (OpenAI, Claude)
- Create question generation workflow with teacher approval process
- Build real-time progress tracking and analytics endpoints
- Optimize video streaming performance for concurrent users

**Dependencies:** Core APIs → Video player → AI integration → Question workflows

### **Phase 3: Quality Assurance, Deployment & Documentation**
Priority: MEDIUM | Duration: 2-3 sprints

**Testing Agent Tasks:**
- Create comprehensive test suites for educational workflows (video → questions → progress)
- Implement multi-role authorization and access control testing
- Build performance tests for concurrent video streaming and user sessions
- Validate AI integration and question generation quality

**DevOps Agent Tasks:**
- Create Docker containerization for Node.js backend, React frontend, PostgreSQL database
- Build local development environment with Docker Compose and hot-reload
- Design Google Cloud Platform infrastructure for production deployment
- Implement CI/CD pipelines with automated testing and deployment workflows
- Set up monitoring, logging, and alerting for educational platform observability

**Docs Writer Agent Tasks:**
- Create user guides for teachers (content creation, video annotation, question approval)
- Write student tutorials for interactive learning and progress tracking
- Document admin interfaces for user management and system configuration
- Produce developer guides for TypeScript/React/Node.js/PostgreSQL stack
- Document deployment procedures and infrastructure setup

**Dependencies:** Feature completion → Testing validation → Containerization → Deployment → Documentation

### **Critical Integration Points**

1. **Video + AI Workflow**: Frontend player → Backend milestone detection → AI question generation → Teacher approval
2. **Multi-Tenant Architecture**: Database isolation → Backend authorization → Frontend role-based UI
3. **Real-Time Analytics**: Database tracking → Backend APIs → Frontend dashboards
4. **Cross-Device Sessions**: Database persistence → Backend session management → Frontend state sync

### **Quality Gates & Risk Mitigation**

**Before Phase 2:**
- Database schema validated with sample data
- Authentication system tested with all roles
- Google Cloud Storage integration confirmed

**Before Phase 3:**
- Interactive video player functional with milestone detection
- AI question generation workflow operational
- Multi-role dashboards displaying real-time data

**Before Production:**
- All educational workflows tested end-to-end
- Performance benchmarks met for concurrent users
- Security audit completed for educational data protection

## Multi-Agent Coordination Protocol

The Agent Lead coordinates all specialized agents through:
- **Requirement Analysis**: Break down user requests into atomic, agent-specific tasks
- **Dependency Mapping**: Identify task relationships and execution order across agents
- **Parallel Coordination**: Execute independent tasks simultaneously for maximum efficiency
- **Integration Management**: Coordinate handoffs between agents (Database → Backend → Frontend)
- **Quality Validation**: Ensure deliverables work together before proceeding to next phase
- **Progress Tracking**: Monitor task completion across all agents with clear milestone indicators

### **Agent Invocation Examples**

**Complex Feature Development:**
```
@database-agent - TASK: Add lesson prerequisite system to schema
@backend-agent - TASK: Implement prerequisite validation APIs
@frontend-agent - TASK: Create prerequisite selection UI for teachers
@testing-agent - TASK: Validate prerequisite enforcement workflows
```

**Performance Optimization:**
```
@database-agent - TASK: Optimize video metadata queries with indexes
@backend-agent - TASK: Implement video streaming cache layer
@frontend-agent - TASK: Add progressive video loading
@testing-agent - TASK: Load test concurrent video streaming
@devops-agent - TASK: Configure CDN and auto-scaling for video delivery
```

**Deployment Workflow:**
```
@devops-agent - TASK: Create Docker containers for all services
@database-agent - TASK: Provide database migration scripts
@backend-agent - TASK: Configure environment variables and health checks
@frontend-agent - TASK: Build optimized production assets
@testing-agent - TASK: Validate deployment in staging environment
```

Use the Agent Lead to orchestrate complex features requiring multiple agents, ensuring proper sequencing, integration validation, and quality gates throughout development.