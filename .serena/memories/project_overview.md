# Interactive Learning Platform - Project Overview

## Purpose
Interactive video-based learning system that pauses at key milestones to present AI-generated questions. Students must answer correctly to continue, creating an engaging and validated learning experience.

## Architecture
- **Multi-Agent Development System**: 7 specialized agents (Agent Lead, Backend, Frontend, Database, Testing, DevOps, Docs Writer)
- **Multi-Role Platform**: Students, Teachers, and Administrators with role-based access control
- **Video-Centric Learning**: Interactive video player with milestone-based question overlays
- **AI Integration**: Multi-provider AI (OpenAI, Claude) for automated question generation
- **Multi-Tenant Architecture**: Supports multiple organizations/schools on single platform

## Key Features
- Interactive video player with milestone pause/resume functionality
- AI-generated questions with teacher approval workflows
- Cross-device session persistence and progress tracking
- Real-time analytics and reporting dashboards
- Educational compliance (GDPR, accessibility)
- Multi-provider AI integration with configurable providers

## Directory Structure
```
education-platform/
├── src/                    # Backend TypeScript source code
│   ├── config/            # Environment and database configuration
│   ├── controllers/       # HTTP request handlers
│   ├── middleware/        # Express middleware (auth, security, logging)
│   ├── models/           # Data models and types
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic and external integrations
│   ├── utils/            # Helper utilities
│   ├── validators/       # Input validation schemas
│   └── index.ts         # Application entry point
├── database/             # Database-related files
│   ├── prisma/          # Prisma schema and migrations
│   └── seeds/           # Database seeding scripts
├── frontend/            # React frontend application
├── tests/              # Test suites
├── scripts/            # Development and deployment scripts
├── logs/               # Application logs
├── uploads/            # File uploads storage
├── .claude/            # Claude Code agent configurations
└── dist/               # Compiled TypeScript output
```