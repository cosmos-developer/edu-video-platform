-- Interactive Learning Platform - Performance Optimization Indexes
-- PostgreSQL Index Creation Script
-- Generated: 2025-08-07

-- ========================================
-- USER MANAGEMENT INDEXES
-- ========================================

-- User lookup and authentication indexes
CREATE INDEX "idx_users_email_hash" ON "users" USING hash ("email");
CREATE INDEX "idx_users_role_status" ON "users"("role", "status");
CREATE INDEX "idx_users_tenant_role" ON "users"("tenantId", "role") WHERE "tenantId" IS NOT NULL;
CREATE INDEX "idx_users_last_login" ON "users"("lastLoginAt") WHERE "lastLoginAt" IS NOT NULL;
CREATE INDEX "idx_users_created_at" ON "users"("createdAt");

-- User preferences fast lookup
CREATE INDEX "idx_user_preferences_theme_lang" ON "user_preferences"("theme", "language");

-- ========================================
-- CONTENT HIERARCHY INDEXES
-- ========================================

-- Lesson management and discovery
CREATE INDEX "idx_lessons_status_published" ON "lessons"("status", "publishedAt") WHERE "status" = 'PUBLISHED';
CREATE INDEX "idx_lessons_creator_tenant" ON "lessons"("createdById", "tenantId");
CREATE INDEX "idx_lessons_order_status" ON "lessons"("order", "status") WHERE "order" IS NOT NULL;
CREATE INDEX "idx_lessons_tags_gin" ON "lessons" USING gin ("tags");
CREATE INDEX "idx_lessons_difficulty_time" ON "lessons"("difficulty", "estimatedTime") WHERE "difficulty" IS NOT NULL;

-- Video group ordering
CREATE INDEX "idx_video_groups_lesson_order" ON "video_groups"("lessonId", "order");

-- Video management and streaming optimization
CREATE INDEX "idx_videos_group_order_status" ON "videos"("videoGroupId", "order", "status");
CREATE INDEX "idx_videos_status_processed" ON "videos"("status", "processedAt");
CREATE INDEX "idx_videos_gcs_path" ON "videos"("gcsPath") WHERE "gcsPath" IS NOT NULL;
CREATE INDEX "idx_videos_duration" ON "videos"("duration") WHERE "duration" IS NOT NULL;

-- Critical milestone lookup for video playback
CREATE INDEX "idx_milestones_video_timestamp" ON "milestones"("videoId", "timestamp");
CREATE INDEX "idx_milestones_video_order" ON "milestones"("videoId", "order");
CREATE INDEX "idx_milestones_required" ON "milestones"("videoId", "isRequired") WHERE "isRequired" = true;

-- ========================================
-- QUESTION AND AI WORKFLOW INDEXES
-- ========================================

-- Question management and review workflow
CREATE INDEX "idx_questions_milestone_status" ON "questions"("milestoneId", "status");
CREATE INDEX "idx_questions_status_created" ON "questions"("status", "createdAt");
CREATE INDEX "idx_questions_ai_model_confidence" ON "questions"("aiModel", "aiConfidence") WHERE "aiModel" IS NOT NULL;
CREATE INDEX "idx_questions_type_difficulty" ON "questions"("type", "difficulty") WHERE "difficulty" IS NOT NULL;
CREATE INDEX "idx_questions_review_pending" ON "questions"("status", "createdAt") WHERE "status" IN ('AI_GENERATED', 'PENDING_REVIEW');

-- Question data JSONB optimization
CREATE INDEX "idx_questions_data_gin" ON "questions" USING gin ("questionData");
CREATE INDEX "idx_questions_ai_metadata_gin" ON "questions" USING gin ("aiMetadata") WHERE "aiMetadata" IS NOT NULL;

-- ========================================
-- STUDENT PROGRESS AND SESSION INDEXES
-- ========================================

-- Critical session management for cross-device sync
CREATE INDEX "idx_student_sessions_student_active" ON "student_sessions"("studentId", "status") WHERE "status" IN ('ACTIVE', 'PAUSED');
CREATE INDEX "idx_student_sessions_video_active" ON "student_sessions"("videoId", "status") WHERE "status" = 'ACTIVE';
CREATE INDEX "idx_student_sessions_last_seen" ON "student_sessions"("lastSeenAt") WHERE "status" IN ('ACTIVE', 'PAUSED');
CREATE INDEX "idx_student_sessions_completed" ON "student_sessions"("completedAt") WHERE "completedAt" IS NOT NULL;

-- Session data optimization
CREATE INDEX "idx_student_sessions_device_gin" ON "student_sessions" USING gin ("deviceInfo") WHERE "deviceInfo" IS NOT NULL;
CREATE INDEX "idx_student_sessions_milestones_gin" ON "student_sessions" USING gin ("completedMilestones");

-- Student progress tracking optimization
CREATE INDEX "idx_student_progress_student_completion" ON "student_progress"("studentId", "completionPercent");
CREATE INDEX "idx_student_progress_lesson_completed" ON "student_progress"("lessonId", "isCompleted");
CREATE INDEX "idx_student_progress_completion_time" ON "student_progress"("completionPercent", "totalTimeSpent");
CREATE INDEX "idx_student_progress_score" ON "student_progress"("averageScore") WHERE "averageScore" > 0;

-- Progress data JSONB optimization
CREATE INDEX "idx_student_progress_data_gin" ON "student_progress" USING gin ("progressData") WHERE "progressData" IS NOT NULL;

-- ========================================
-- GRADING AND ASSESSMENT INDEXES
-- ========================================

-- Question attempt analysis
CREATE INDEX "idx_question_attempts_student_question" ON "question_attempts"("studentId", "questionId", "attemptNumber");
CREATE INDEX "idx_question_attempts_question_correct" ON "question_attempts"("questionId", "isCorrect");
CREATE INDEX "idx_question_attempts_student_submitted" ON "question_attempts"("studentId", "submittedAt") WHERE "submittedAt" IS NOT NULL;
CREATE INDEX "idx_question_attempts_status_time" ON "question_attempts"("status", "timeSpent");

-- Attempt data optimization
CREATE INDEX "idx_question_attempts_answer_gin" ON "question_attempts" USING gin ("studentAnswer");
CREATE INDEX "idx_question_attempts_hints_gin" ON "question_attempts" USING gin ("hintsUsed");

-- Grade management and reporting
CREATE INDEX "idx_grades_student_status" ON "grades"("studentId", "status");
CREATE INDEX "idx_grades_progress_finalized" ON "grades"("studentProgressId", "finalizedAt");
CREATE INDEX "idx_grades_percentage_letter" ON "grades"("percentageScore", "letterGrade");
CREATE INDEX "idx_grades_attempts_remaining" ON "grades"("totalAttempts", "remainingAttempts");

-- Grade breakdown JSONB optimization
CREATE INDEX "idx_grades_breakdown_gin" ON "grades" USING gin ("gradeBreakdown") WHERE "gradeBreakdown" IS NOT NULL;

-- ========================================
-- ANALYTICS AND REPORTING INDEXES
-- ========================================

-- Real-time analytics optimization
CREATE INDEX "idx_analytics_events_user_time" ON "analytics_events"("userId", "timestamp") WHERE "userId" IS NOT NULL;
CREATE INDEX "idx_analytics_events_session_time" ON "analytics_events"("sessionId", "timestamp") WHERE "sessionId" IS NOT NULL;
CREATE INDEX "idx_analytics_events_type_time" ON "analytics_events"("eventType", "timestamp");
CREATE INDEX "idx_analytics_events_hourly" ON "analytics_events"(DATE_TRUNC('hour', "timestamp"));
CREATE INDEX "idx_analytics_events_daily" ON "analytics_events"(DATE_TRUNC('day', "timestamp"));

-- Event data optimization for complex queries
CREATE INDEX "idx_analytics_events_data_gin" ON "analytics_events" USING gin ("eventData");
CREATE INDEX "idx_analytics_events_context_gin" ON "analytics_events" USING gin ("context") WHERE "context" IS NOT NULL;

-- Performance monitoring
CREATE INDEX "idx_analytics_events_processing_time" ON "analytics_events"("processingTime") WHERE "processingTime" IS NOT NULL;

-- ========================================
-- SYSTEM ADMINISTRATION INDEXES
-- ========================================

-- System configuration management
CREATE INDEX "idx_system_configs_category_public" ON "system_configs"("category", "isPublic") WHERE "category" IS NOT NULL;
CREATE INDEX "idx_system_configs_updated" ON "system_configs"("updatedAt");

-- Audit trail optimization
CREATE INDEX "idx_audit_logs_user_action_time" ON "audit_logs"("userId", "action", "createdAt") WHERE "userId" IS NOT NULL;
CREATE INDEX "idx_audit_logs_resource_time" ON "audit_logs"("resource", "resourceId", "createdAt") WHERE "resourceId" IS NOT NULL;
CREATE INDEX "idx_audit_logs_action_time" ON "audit_logs"("action", "createdAt");
CREATE INDEX "idx_audit_logs_daily" ON "audit_logs"(DATE_TRUNC('day', "createdAt"));

-- Audit data optimization
CREATE INDEX "idx_audit_logs_changes_gin" ON "audit_logs" USING gin ("changes") WHERE "changes" IS NOT NULL;
CREATE INDEX "idx_audit_logs_metadata_gin" ON "audit_logs" USING gin ("metadata") WHERE "metadata" IS NOT NULL;

-- ========================================
-- AI MANAGEMENT INDEXES
-- ========================================

-- AI configuration management
CREATE INDEX "idx_ai_configs_provider_active" ON "ai_configurations"("provider", "isActive");
CREATE INDEX "idx_ai_configs_active_model" ON "ai_configurations"("isActive", "model") WHERE "isActive" = true;

-- AI usage tracking and cost analysis
CREATE INDEX "idx_ai_usage_config_time" ON "ai_usage_logs"("configurationId", "createdAt");
CREATE INDEX "idx_ai_usage_type_success_time" ON "ai_usage_logs"("requestType", "success", "createdAt");
CREATE INDEX "idx_ai_usage_cost_time" ON "ai_usage_logs"("cost", "createdAt") WHERE "cost" IS NOT NULL;
CREATE INDEX "idx_ai_usage_tokens_time" ON "ai_usage_logs"("tokensUsed", "createdAt");
CREATE INDEX "idx_ai_usage_daily" ON "ai_usage_logs"(DATE_TRUNC('day', "createdAt"));
CREATE INDEX "idx_ai_usage_monthly" ON "ai_usage_logs"(DATE_TRUNC('month', "createdAt"));

-- AI performance monitoring
CREATE INDEX "idx_ai_usage_response_time" ON "ai_usage_logs"("responseTime");
CREATE INDEX "idx_ai_usage_errors" ON "ai_usage_logs"("success", "errorMessage") WHERE "success" = false;

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Teacher dashboard optimization
CREATE INDEX "idx_teacher_content_analytics" ON "lessons"("createdById", "status", "publishedAt") WHERE "status" = 'PUBLISHED';

-- Student dashboard optimization
CREATE INDEX "idx_student_active_progress" ON "student_progress"("studentId", "isCompleted", "updatedAt");

-- Video streaming optimization
CREATE INDEX "idx_video_streaming" ON "videos"("status", "gcsUrl", "duration") WHERE "status" = 'READY' AND "gcsUrl" IS NOT NULL;

-- Question workflow optimization
CREATE INDEX "idx_question_workflow" ON "questions"("status", "createdAt", "reviewedAt");

-- Session continuity optimization
CREATE INDEX "idx_session_continuity" ON "student_sessions"("studentId", "videoId", "status", "lastSeenAt");

-- Performance analytics
CREATE INDEX "idx_performance_analytics" ON "question_attempts"("questionId", "isCorrect", "timeSpent", "submittedAt") WHERE "submittedAt" IS NOT NULL;

-- ========================================
-- PARTIAL INDEXES FOR EFFICIENCY
-- ========================================

-- Active user sessions only
CREATE INDEX "idx_active_user_sessions" ON "student_sessions"("studentId", "lastSeenAt") 
WHERE "status" IN ('ACTIVE', 'PAUSED') AND "lastSeenAt" > (CURRENT_TIMESTAMP - INTERVAL '24 hours');

-- Recent analytics events only (last 30 days)
CREATE INDEX "idx_recent_analytics" ON "analytics_events"("eventType", "timestamp") 
WHERE "timestamp" > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Failed AI requests for debugging
CREATE INDEX "idx_failed_ai_requests" ON "ai_usage_logs"("configurationId", "requestType", "createdAt", "errorMessage") 
WHERE "success" = false AND "createdAt" > (CURRENT_TIMESTAMP - INTERVAL '7 days');

-- ========================================
-- TEXT SEARCH OPTIMIZATION
-- ========================================

-- Full-text search on lessons
CREATE INDEX "idx_lessons_text_search" ON "lessons" USING gin (
    to_tsvector('english', COALESCE("title", '') || ' ' || COALESCE("description", ''))
);

-- Full-text search on questions
CREATE INDEX "idx_questions_text_search" ON "questions" USING gin (
    to_tsvector('english', COALESCE("text", '') || ' ' || COALESCE("explanation", ''))
);

-- Video search optimization
CREATE INDEX "idx_videos_text_search" ON "videos" USING gin (
    to_tsvector('english', COALESCE("title", '') || ' ' || COALESCE("description", ''))
);