-- Add MilestoneType enum
CREATE TYPE "MilestoneType" AS ENUM ('PAUSE', 'QUIZ', 'CHECKPOINT');

-- Add type column to Milestone table
ALTER TABLE "milestones" ADD COLUMN "type" "MilestoneType" DEFAULT 'CHECKPOINT';

-- Create MilestoneProgress table
CREATE TABLE "milestone_progress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_progress_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for session-milestone combination
CREATE UNIQUE INDEX "milestone_progress_sessionId_milestoneId_key" ON "milestone_progress"("sessionId", "milestoneId");

-- Add indexes
CREATE INDEX "milestone_progress_sessionId_idx" ON "milestone_progress"("sessionId");
CREATE INDEX "milestone_progress_milestoneId_idx" ON "milestone_progress"("milestoneId");

-- Add foreign key constraints
ALTER TABLE "milestone_progress" ADD CONSTRAINT "milestone_progress_sessionId_fkey" 
    FOREIGN KEY ("sessionId") REFERENCES "student_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "milestone_progress" ADD CONSTRAINT "milestone_progress_milestoneId_fkey" 
    FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add sessionId column to question_attempts table
ALTER TABLE "question_attempts" ADD COLUMN "sessionId" TEXT;

-- Add foreign key constraint for sessionId
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_sessionId_fkey" 
    FOREIGN KEY ("sessionId") REFERENCES "student_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update existing milestones to have QUIZ type if they have questions
UPDATE "milestones" m
SET "type" = 'QUIZ'
WHERE EXISTS (
    SELECT 1 FROM "questions" q WHERE q."milestoneId" = m."id"
);