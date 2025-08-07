# Database Schema Design Document

## Executive Summary

The Interactive Learning Platform database schema is designed to support a comprehensive video-based learning system with AI-generated questions, multi-tenancy, and real-time progress tracking. The schema prioritizes performance, scalability, and flexibility while maintaining data integrity and security.

## Design Decisions & Rationale

### 1. Multi-Tenancy Architecture

**Decision**: Implemented shared database with tenant isolation via `tenantId` fields
**Rationale**: 
- Cost-effective for moderate scale (1-1000 tenants)
- Simpler maintenance and backups
- Easier cross-tenant analytics when needed
- Row-Level Security (RLS) can be added later if needed

**Alternative Considered**: Database per tenant
**Why Rejected**: Higher operational overhead, complex analytics, resource inefficiency

### 2. Content Hierarchy Design

**Decision**: 4-level hierarchy: Lessons → Video Groups → Videos → Milestones → Questions
**Rationale**:
- Mirrors natural content organization
- Supports flexible course structures
- Allows for granular progress tracking
- Enables content reuse across lessons

**Key Benefits**:
- Teachers can organize content logically
- Students see clear learning progression
- Analytics can operate at multiple levels
- Supports both linear and branching content paths

### 3. JSONB Usage Strategy

**Decision**: Strategic use of JSONB for flexible, evolving data structures
**Implementation**:
- Question data (supports multiple question types)
- Video metadata (resolution, codecs, processing info)
- Student progress details (milestone-specific tracking)
- Analytics event data (flexible event schemas)
- User preferences (customizable settings)

**Rationale**:
- Prevents schema fragmentation
- Supports rapid feature development
- Enables complex querying with GIN indexes
- Maintains type safety with validation layers

### 4. Question Type Flexibility

**Decision**: Single `questions` table with type-specific data in JSONB
**Rationale**:
- Eliminates table explosion (6 question types = 1 table vs 6 tables)
- Consistent API interface
- Simplified relationship management
- Easy addition of new question types

**Type-Specific Data Structure**:
```typescript
interface QuestionData {
  // Multiple Choice
  options?: { id: string; text: string; isCorrect: boolean }[];
  
  // True/False
  correctAnswer?: boolean;
  
  // Short Answer
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  
  // Additional types...
}
```

### 5. AI Integration Architecture

**Decision**: Comprehensive AI workflow with human oversight
**Components**:
- AI configurations (multiple providers)
- Usage tracking (cost monitoring)
- Question generation workflow
- Human review and approval

**Benefits**:
- Cost control and monitoring
- Quality assurance through human review
- Provider flexibility (OpenAI, Claude, etc.)
- Detailed usage analytics

### 6. Session Management Design

**Decision**: Comprehensive cross-device session tracking
**Features**:
- Device fingerprinting
- Real-time position synchronization
- Milestone completion tracking
- Session state persistence

**Technical Implementation**:
- Unique constraint on (studentId, videoId)
- Last-seen timestamp for cleanup
- Device info for analytics
- JSONB for flexible session data

### 7. Performance Optimization Strategy

#### Index Strategy
1. **Composite Indexes**: For common multi-column queries
2. **Partial Indexes**: For filtered queries (active sessions, recent events)
3. **GIN Indexes**: For JSONB and array columns
4. **Text Search Indexes**: For content discovery

#### Critical Performance Paths
1. **Video Milestone Lookup**: `idx_milestones_video_timestamp`
2. **Student Progress**: `idx_student_progress_student_completion`
3. **Cross-Device Sync**: `idx_student_sessions_student_active`
4. **Teacher Analytics**: `idx_teacher_content_analytics`

### 8. Analytics Architecture

**Decision**: Event-driven analytics with flexible schema
**Benefits**:
- Real-time learning analytics
- Detailed user behavior tracking
- Performance monitoring
- A/B testing support

**Event Categories**:
- Learning events (video_start, milestone_reached, question_attempt)
- Navigation events (page_view, click_tracking)
- Performance events (load_time, error_occurred)
- System events (login, logout, session_timeout)

### 9. Grading System Design

**Decision**: Flexible grading with configurable retry limits
**Features**:
- Point-based scoring
- Partial credit support
- Retry limit configuration
- Grade breakdown analytics
- Multiple grading strategies

**Implementation Details**:
- Total/earned points tracking
- Percentage calculation
- Letter grade mapping
- Attempt counting
- Detailed breakdown in JSONB

### 10. Audit Logging Strategy

**Decision**: Comprehensive audit trail for security and compliance
**Scope**:
- All data modifications
- Authentication events
- Administrative actions
- System configuration changes

**Benefits**:
- GDPR compliance support
- Security monitoring
- Change history tracking
- Debugging and troubleshooting

## Scalability Considerations

### 1. Horizontal Scaling Strategies

**Read Replicas**: Analytics and reporting queries
**Partitioning**: Time-based partitioning for analytics_events and audit_logs
**Caching**: Redis for frequently accessed configuration and user data

### 2. Data Archival Strategy

**Hot Data**: Active sessions, current progress (< 90 days)
**Warm Data**: Completed lessons, historical progress (90 days - 2 years)
**Cold Data**: Archived analytics, old audit logs (> 2 years)

### 3. Performance Monitoring

**Key Metrics**:
- Query execution times
- Index usage statistics
- Table size growth
- Connection pool utilization
- Cache hit rates

## Security Architecture

### 1. Data Protection

**Encryption**: Sensitive fields (passwords, API keys)
**Access Control**: Role-based permissions
**Audit Logging**: All sensitive operations
**Data Minimization**: GDPR-compliant data retention

### 2. Multi-Tenant Security

**Data Isolation**: TenantId-based filtering
**API Security**: Tenant validation middleware
**Cross-Tenant Leaks**: Prevented through application logic

### 3. SQL Injection Prevention

**Parameterized Queries**: Prisma ORM protection
**Input Validation**: Zod schema validation
**Least Privilege**: Database user permissions

## Migration Strategy

### 1. Development Workflow

```bash
# 1. Schema changes in schema.prisma
# 2. Generate migration
npx prisma migrate dev --name descriptive_name

# 3. Review generated SQL
# 4. Test with seed data
# 5. Update TypeScript types
```

### 2. Production Deployment

```bash
# 1. Backup production database
# 2. Deploy in maintenance window
npx prisma migrate deploy

# 3. Verify data integrity
# 4. Monitor performance
```

### 3. Rollback Strategy

- Maintain backwards-compatible changes when possible
- Keep migration rollback scripts
- Database backup before major changes

## Monitoring and Observability

### 1. Database Metrics

**Performance Metrics**:
- Query response times
- Index hit ratios
- Lock contention
- Connection pool usage

**Business Metrics**:
- Student engagement rates
- Content completion rates
- AI generation success rates
- System error rates

### 2. Alerting Strategy

**Critical Alerts**:
- Database connection failures
- Query timeout increases
- Disk space warnings
- Replication lag

**Business Alerts**:
- Drop in user engagement
- AI generation failures
- Video processing errors

## Future Enhancements

### 1. Advanced Features

**Machine Learning**:
- Personalized learning paths
- Question difficulty adjustment
- Content recommendations

**Real-time Features**:
- Live video sessions
- Collaborative learning
- Real-time chat

### 2. Scalability Improvements

**Microservices Architecture**:
- Separate video processing service
- Dedicated analytics service
- AI service isolation

**Advanced Caching**:
- CDN for video content
- Application-level caching
- Database query caching

## Conclusion

The Interactive Learning Platform database schema provides a robust foundation for a comprehensive video-based learning system. The design balances performance, flexibility, and maintainability while supporting advanced features like AI-generated questions and real-time analytics.

Key strengths:
- Scalable multi-tenant architecture
- Flexible content hierarchy
- Comprehensive analytics and monitoring
- Strong security and audit capabilities
- Performance-optimized query patterns

The schema is designed to evolve with the platform's needs while maintaining data integrity and optimal performance.

---

*Database Schema Design Document v1.0.0*
*Interactive Learning Platform*