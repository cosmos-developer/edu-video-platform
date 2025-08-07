-- Interactive Learning Platform - Initial Database Schema
-- PostgreSQL Migration Script
-- Generated: 2025-08-07

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For better JSONB indexing

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERROR');
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK', 'MATCHING', 'ORDERING');
CREATE TYPE "QuestionStatus" AS ENUM ('AI_GENERATED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'CORRECT', 'INCORRECT', 'PARTIAL', 'TIMEOUT');
CREATE TYPE "GradeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY_ALLOWED');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'DOWNLOAD', 'UPLOAD');
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'CLAUDE', 'GOOGLE_PALM', 'CUSTOM');

-- ========================================
-- CORE TABLES
-- ========================================

-- Users table with multi-tenant support
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "passwordHash" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- User preferences for personalization
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoplay" BOOLEAN NOT NULL DEFAULT true,
    "playbackSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "subtitles" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "progressNotifications" BOOLEAN NOT NULL DEFAULT true,
    "allowAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "customSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- Lessons - top level content organization
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER,
    "tenantId" TEXT,
    "createdById" TEXT NOT NULL,
    "objectives" TEXT[],
    "estimatedTime" INTEGER,
    "difficulty" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- Video groups within lessons
CREATE TABLE "video_groups" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_groups_pkey" PRIMARY KEY ("id")
);

-- Individual videos with Google Cloud Storage integration
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "videoGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'UPLOADING',
    "gcsPath" TEXT,
    "gcsUrl" TEXT,
    "duration" INTEGER,
    "size" BIGINT,
    "mimeType" TEXT,
    "processingStatus" TEXT,
    "thumbnailUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- Milestones within videos for interactive questions
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "retryLimit" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- AI-generated questions with approval workflow
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'AI_GENERATED',
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "hints" TEXT[],
    "difficulty" TEXT,
    "questionData" JSONB NOT NULL,
    "aiModel" TEXT,
    "aiPrompt" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiMetadata" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "passThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- Student sessions for cross-device continuity
CREATE TABLE "student_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastMilestoneId" TEXT,
    "completedMilestones" TEXT[],
    "deviceInfo" JSONB,
    "browserInfo" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "student_sessions_pkey" PRIMARY KEY ("id")
);

-- Overall student progress per lesson
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
    "totalMilestones" INTEGER NOT NULL DEFAULT 0,
    "completedMilestones" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "successfulAttempts" INTEGER NOT NULL DEFAULT 0,
    "progressData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- Individual question attempts with detailed tracking
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attemptNumber" INTEGER NOT NULL,
    "studentAnswer" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" TEXT[],
    "feedback" TEXT,
    "attemptData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- Grades with configurable retry limits
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentProgressId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "earnedPoints" INTEGER NOT NULL DEFAULT 0,
    "percentageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "letterGrade" TEXT,
    "status" "GradeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "remainingAttempts" INTEGER NOT NULL DEFAULT 0,
    "gradeBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- Analytics events for comprehensive tracking
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTime" INTEGER,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- System configuration management
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- Comprehensive audit logging
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AI API configuration management
CREATE TABLE "ai_configurations" (
    "id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT,
    "endpoint" TEXT,
    "model" TEXT NOT NULL,
    "parameters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER,
    "maxTokens" INTEGER,
    "costPerToken" DOUBLE PRECISION,
    "monthlyBudget" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

-- AI usage tracking for cost and performance monitoring
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "tokensUsed" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,
    "responseTime" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "userId" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- UNIQUE CONSTRAINTS
-- ========================================

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");
CREATE UNIQUE INDEX "student_sessions_studentId_videoId_key" ON "student_sessions"("studentId", "videoId");
CREATE UNIQUE INDEX "student_progress_studentId_lessonId_key" ON "student_progress"("studentId", "lessonId");

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "video_groups" ADD CONSTRAINT "video_groups_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_videoGroupId_fkey" FOREIGN KEY ("videoGroupId") REFERENCES "video_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_studentProgressId_fkey" FOREIGN KEY ("studentProgressId") REFERENCES "student_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;