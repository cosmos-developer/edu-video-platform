# Interactive Learning Platform - Database Schema

A comprehensive PostgreSQL database schema designed for a multi-tenant, video-based interactive learning platform with AI-generated questions and real-time progress tracking.

## 🏗️ Architecture Overview

### Core Design Principles

1. **Multi-Tenancy**: Support for isolated data across multiple organizations/tenants
2. **Role-Based Access**: Hierarchical permissions (Students, Teachers, Admins)
3. **Scalable Performance**: Optimized indexes for concurrent video streaming and analytics
4. **AI Integration**: Comprehensive workflow for AI-generated questions with human review
5. **Cross-Device Continuity**: Session persistence across devices and browsers
6. **Real-Time Analytics**: Event tracking for learning analytics and system monitoring

### Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: Prisma (TypeScript)
- **Extensions**: UUID, pg_trgm (text search), btree_gin (JSONB indexing)

## 📊 Schema Structure

### 1. User Management & Authentication

#### Tables:
- **`users`**: Core user data with multi-tenant support
- **`user_preferences`**: Personalization settings and learning preferences

#### Features:
- Email verification workflow
- Role-based permissions (Student, Teacher, Admin)
- Multi-tenant data isolation
- Comprehensive user preferences

### 2. Content Hierarchy

```
Lessons (Course level)
  └── Video Groups (Chapters)
      └── Videos (Individual content)
          └── Milestones (Interactive checkpoints)
              └── Questions (AI-generated assessments)
```

#### Tables:
- **`lessons`**: Top-level content organization
- **`video_groups`**: Logical grouping of related videos
- **`videos`**: Individual video content with Google Cloud Storage integration
- **`milestones`**: Interactive checkpoints within videos
- **`questions`**: AI-generated questions with approval workflow

#### Features:
- Google Cloud Storage integration for video files
- Flexible metadata storage (JSONB)
- Content versioning and approval workflow
- Rich text search capabilities

### 3. AI Question Management

#### Workflow:
1. **Generation**: AI creates questions based on video content and milestones
2. **Review**: Teachers review and approve/reject AI-generated questions
3. **Configuration**: Teachers set retry limits and grading criteria
4. **Deployment**: Approved questions become active in lessons

#### Tables:
- **`questions`**: Question content with AI metadata
- **`ai_configurations`**: AI provider settings and parameters
- **`ai_usage_logs`**: Cost tracking and performance monitoring

#### Supported Question Types:
- Multiple Choice
- True/False
- Short Answer
- Fill in the Blank
- Matching
- Ordering

### 4. Student Progress & Session Management

#### Tables:
- **`student_sessions`**: Cross-device session continuity
- **`student_progress`**: Overall lesson progress tracking
- **`question_attempts`**: Detailed attempt history
- **`grades`**: Comprehensive grading with configurable retry limits

#### Features:
- Real-time progress synchronization
- Cross-device session persistence
- Detailed attempt analytics
- Configurable retry limits
- Partial credit scoring

### 5. Analytics & Reporting

#### Tables:
- **`analytics_events`**: Comprehensive event tracking
- **`audit_logs`**: System audit trail
- **`system_configs`**: Dynamic system configuration

#### Event Types:
- Video playback events
- Question interactions
- Navigation tracking
- Performance metrics
- Error tracking

## 🚀 Performance Optimization

### Critical Indexes

1. **Video Streaming**:
   - Fast milestone lookup during playback
   - Efficient video metadata retrieval
   - Google Cloud Storage path optimization

2. **Student Progress**:
   - Cross-device session queries
   - Real-time progress updates
   - Completion tracking

3. **Analytics**:
   - Time-series event queries
   - User behavior analysis
   - Teacher dashboard metrics

4. **AI Workflow**:
   - Question review queue optimization
   - AI usage cost tracking
   - Performance monitoring

### JSONB Optimization

Strategic use of JSONB fields for:
- Question data flexibility across different types
- Video metadata and processing information
- Student progress tracking details
- Analytics event data
- User preferences and settings

## 📋 Setup Instructions

### 1. Install Dependencies

```bash
npm install prisma @prisma/client
npm install -D prisma-dbml-generator
```

### 2. Configure Database

```bash
# Set environment variable
export DATABASE_URL="postgresql://username:password@localhost:5432/learning_platform"
```

### 3. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with sample data
npx prisma db seed
```

### 4. Verify Setup

```bash
# Open Prisma Studio
npx prisma studio
```

## 🌱 Sample Data

The seed script creates:

- **3 Demo Users**: Admin, Teacher, Student (Password: `Demo123!`)
- **1 Complete Lesson**: With video, milestones, and questions
- **AI Configuration**: Default OpenAI setup
- **Sample Progress**: Partial student completion
- **Analytics Events**: User interaction tracking
- **System Configs**: Default platform settings

### Demo Login Credentials

| Role    | Email               | Password  |
|---------|---------------------|-----------|
| Admin   | admin@example.com   | Demo123!  |
| Teacher | teacher@example.com | Demo123!  |
| Student | student@example.com | Demo123!  |

## 🔍 Key Queries & Operations

### 1. Student Dashboard Query

```sql
-- Get student's active lessons with progress
SELECT 
    l.title,
    l.thumbnail,
    sp.completion_percent,
    sp.average_score,
    sp.updated_at as last_activity
FROM student_progress sp
JOIN lessons l ON sp.lesson_id = l.id
WHERE sp.student_id = $1 
  AND sp.completion_percent > 0
ORDER BY sp.updated_at DESC;
```

### 2. Video Milestone Lookup

```sql
-- Get milestones for video playback
SELECT 
    m.id,
    m.timestamp,
    m.title,
    m.is_required,
    COUNT(q.id) as question_count
FROM milestones m
LEFT JOIN questions q ON m.id = q.milestone_id 
  AND q.status = 'APPROVED'
WHERE m.video_id = $1
ORDER BY m.timestamp ASC;
```

### 3. Teacher Analytics Query

```sql
-- Get lesson performance analytics
SELECT 
    l.title,
    COUNT(DISTINCT sp.student_id) as enrolled_students,
    AVG(sp.completion_percent) as avg_completion,
    AVG(sp.average_score) as avg_score,
    AVG(sp.total_time_spent) as avg_time_spent
FROM lessons l
LEFT JOIN student_progress sp ON l.id = sp.lesson_id
WHERE l.created_by_id = $1
GROUP BY l.id, l.title
ORDER BY enrolled_students DESC;
```

### 4. AI Usage Cost Tracking

```sql
-- Monthly AI usage and cost summary
SELECT 
    DATE_TRUNC('month', created_at) as month,
    request_type,
    COUNT(*) as total_requests,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as total_cost,
    AVG(response_time) as avg_response_time
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY month, request_type
ORDER BY month DESC, total_cost DESC;
```

## 🔧 Configuration Management

### System Configuration

Dynamic configuration through `system_configs` table:

```typescript
// Video upload settings
await prisma.systemConfig.findUnique({
  where: { key: 'video.maxFileSize' }
});

// AI provider settings
await prisma.systemConfig.findUnique({
  where: { key: 'ai.defaultProvider' }
});

// Grading configuration
await prisma.systemConfig.findUnique({
  where: { key: 'grading.passingThreshold' }
});
```

### AI Provider Configuration

Support for multiple AI providers with dynamic switching:

```typescript
// Get active AI configuration
const aiConfig = await prisma.aIConfiguration.findFirst({
  where: { 
    isActive: true,
    provider: 'OPENAI'
  }
});
```

## 🛡️ Security Features

### 1. Multi-Tenancy
- Data isolation through `tenantId` fields
- Row-level security policies
- Tenant-specific user management

### 2. Audit Logging
- Comprehensive action tracking
- Change history preservation
- Security event monitoring

### 3. Data Protection
- Encrypted sensitive fields
- GDPR compliance support
- Secure session management

## 📈 Monitoring & Observability

### 1. Performance Metrics
- Query execution times
- Index usage statistics
- Connection pool monitoring

### 2. Business Metrics
- Student engagement rates
- Content completion statistics
- AI generation success rates

### 3. System Health
- Error rate tracking
- Response time monitoring
- Resource utilization

## 🚦 Best Practices

### 1. Query Optimization
- Use appropriate indexes for common queries
- Leverage JSONB indexes for flexible data
- Monitor query performance regularly

### 2. Data Consistency
- Use transactions for related operations
- Implement proper foreign key constraints
- Validate data integrity regularly

### 3. Scalability
- Partition large tables by date/tenant
- Implement read replicas for analytics
- Use connection pooling

## 📝 Migration Strategy

### Development Workflow
1. Make schema changes in Prisma schema
2. Generate migration: `npx prisma migrate dev`
3. Review generated SQL
4. Test with sample data

### Production Deployment
1. Backup database
2. Run migrations: `npx prisma migrate deploy`
3. Verify data integrity
4. Monitor performance

## 🤝 Contributing

When modifying the schema:

1. **Document Changes**: Update this README
2. **Update Types**: Regenerate TypeScript types
3. **Migration Review**: Review generated SQL carefully
4. **Index Optimization**: Consider query performance impact
5. **Seed Data**: Update seed scripts if needed

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Performance Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [JSONB Best Practices](https://www.postgresql.org/docs/current/datatype-json.html)

---

*Generated for Interactive Learning Platform Database Schema v1.0.0*