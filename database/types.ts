// Interactive Learning Platform Database Types
// TypeScript type definitions for the PostgreSQL schema
// Generated: 2025-08-07

// ========================================
// ENUM TYPES
// ========================================

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export enum LessonStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum VideoStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
  MATCHING = 'MATCHING',
  ORDERING = 'ORDERING'
}

export enum QuestionStatus {
  AI_GENERATED = 'AI_GENERATED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  CORRECT = 'CORRECT',
  INCORRECT = 'INCORRECT',
  PARTIAL = 'PARTIAL',
  TIMEOUT = 'TIMEOUT'
}

export enum GradeStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRY_ALLOWED = 'RETRY_ALLOWED'
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD'
}

export enum AIProvider {
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE',
  GOOGLE_PALM = 'GOOGLE_PALM',
  CUSTOM = 'CUSTOM'
}

// ========================================
// BASE ENTITY INTERFACES
// ========================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimestampedEntity extends BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// USER MANAGEMENT TYPES
// ========================================

export interface User extends TimestampedEntity {
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
  emailVerified?: Date;
  lastLoginAt?: Date;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface UserPreference extends TimestampedEntity {
  userId: string;
  autoplay: boolean;
  playbackSpeed: number;
  subtitles: boolean;
  theme: string;
  language: string;
  emailNotifications: boolean;
  progressNotifications: boolean;
  allowAnalytics: boolean;
  customSettings?: Record<string, any>;
}

// ========================================
// CONTENT HIERARCHY TYPES
// ========================================

export interface Lesson extends TimestampedEntity {
  title: string;
  description?: string;
  thumbnail?: string;
  status: LessonStatus;
  order?: number;
  tenantId?: string;
  createdById: string;
  objectives: string[];
  estimatedTime?: number;
  difficulty?: string;
  tags: string[];
  metadata?: Record<string, any>;
  publishedAt?: Date;
}

export interface VideoGroup extends TimestampedEntity {
  lessonId: string;
  title: string;
  description?: string;
  order: number;
}

export interface Video extends TimestampedEntity {
  videoGroupId: string;
  title: string;
  description?: string;
  order: number;
  status: VideoStatus;
  gcsPath?: string;
  gcsUrl?: string;
  duration?: number;
  size?: bigint;
  mimeType?: string;
  processingStatus?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  uploadedAt?: Date;
  processedAt?: Date;
}

export interface Milestone extends TimestampedEntity {
  videoId: string;
  timestamp: number;
  title: string;
  description?: string;
  order: number;
  isRequired: boolean;
  retryLimit: number;
}

// ========================================
// QUESTION MANAGEMENT TYPES
// ========================================

export interface QuestionData {
  // For Multiple Choice
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  
  // For True/False
  correctAnswer?: boolean;
  
  // For Short Answer
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  
  // For Fill in the Blank
  blanks?: Array<{
    position: number;
    acceptedAnswers: string[];
  }>;
  
  // For Matching
  pairs?: Array<{
    left: string;
    right: string;
  }>;
  
  // For Ordering
  items?: Array<{
    id: string;
    text: string;
    correctOrder: number;
  }>;
  
  // Common fields
  maxAttempts?: number;
  timeLimit?: number; // in seconds
  partialCredit?: boolean;
}

export interface Question extends TimestampedEntity {
  milestoneId: string;
  type: QuestionType;
  status: QuestionStatus;
  text: string;
  explanation?: string;
  hints: string[];
  difficulty?: string;
  questionData: QuestionData;
  aiModel?: string;
  aiPrompt?: string;
  aiConfidence?: number;
  aiMetadata?: Record<string, any>;
  points: number;
  passThreshold: number;
  reviewedById?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// ========================================
// SESSION AND PROGRESS TYPES
// ========================================

export interface DeviceInfo {
  platform: string;
  browser: string;
  version: string;
  mobile: boolean;
  screenResolution?: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  engineVersion: string;
}

export interface StudentSession extends TimestampedEntity {
  studentId: string;
  videoId: string;
  status: SessionStatus;
  currentPosition: number;
  lastMilestoneId?: string;
  completedMilestones: string[];
  deviceInfo?: DeviceInfo;
  browserInfo?: BrowserInfo;
  ipAddress?: string;
  userAgent?: string;
  sessionData?: Record<string, any>;
  startedAt: Date;
  lastSeenAt: Date;
  completedAt?: Date;
}

export interface ProgressData {
  milestoneProgress?: Record<string, {
    completed: boolean;
    attempts: number;
    score: number;
    timeSpent: number;
  }>;
  
  videoProgress?: Record<string, {
    watchTime: number;
    completionPercentage: number;
    lastPosition: number;
  }>;
  
  learningPath?: {
    currentStep: number;
    totalSteps: number;
    recommendedNext?: string[];
  };
  
  preferences?: {
    playbackSpeed: number;
    preferredQuestionTypes: QuestionType[];
  };
}

export interface StudentProgress extends TimestampedEntity {
  studentId: string;
  lessonId: string;
  isCompleted: boolean;
  completionPercent: number;
  totalTimeSpent: number;
  totalMilestones: number;
  completedMilestones: number;
  averageScore: number;
  totalAttempts: number;
  successfulAttempts: number;
  progressData?: ProgressData;
  startedAt: Date;
  completedAt?: Date;
}

// ========================================
// GRADING AND ASSESSMENT TYPES
// ========================================

export interface AttemptData {
  startTime: Date;
  endTime?: Date;
  hintsViewed: number;
  timeSpentReading: number;
  timeSpentAnswering: number;
  confidence?: number; // Self-reported confidence
  difficulty?: number; // Self-reported difficulty
}

export interface QuestionAttempt extends TimestampedEntity {
  studentId: string;
  questionId: string;
  status: AttemptStatus;
  attemptNumber: number;
  studentAnswer: Record<string, any>;
  isCorrect?: boolean;
  score: number;
  timeSpent: number;
  hintsUsed: string[];
  feedback?: string;
  attemptData?: AttemptData;
  submittedAt?: Date;
}

export interface GradeBreakdown {
  milestones?: Record<string, {
    totalPoints: number;
    earnedPoints: number;
    percentage: number;
    attempts: number;
  }>;
  
  questionTypes?: Record<QuestionType, {
    totalQuestions: number;
    correctAnswers: number;
    averageScore: number;
  }>;
  
  timeMetrics?: {
    totalTime: number;
    averageTimePerQuestion: number;
    efficiency: number;
  };
  
  difficultyAnalysis?: Record<string, {
    questions: number;
    averageScore: number;
    averageTime: number;
  }>;
}

export interface Grade extends TimestampedEntity {
  studentId: string;
  studentProgressId: string;
  totalPoints: number;
  earnedPoints: number;
  percentageScore: number;
  letterGrade?: string;
  status: GradeStatus;
  totalAttempts: number;
  remainingAttempts: number;
  gradeBreakdown?: GradeBreakdown;
  finalizedAt?: Date;
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface AnalyticsEventData {
  // Video events
  videoId?: string;
  position?: number;
  duration?: number;
  playbackSpeed?: number;
  quality?: string;
  
  // Question events
  questionId?: string;
  questionType?: QuestionType;
  attemptNumber?: number;
  correct?: boolean;
  timeSpent?: number;
  hintsUsed?: number;
  
  // Navigation events
  fromPage?: string;
  toPage?: string;
  navigationTime?: number;
  
  // Performance events
  loadTime?: number;
  errorType?: string;
  errorMessage?: string;
  
  // User interaction events
  clickTarget?: string;
  scrollDepth?: number;
  keyboardShortcut?: string;
}

export interface AnalyticsContext {
  sessionId?: string;
  deviceType: string;
  browserName: string;
  browserVersion: string;
  screenResolution: string;
  connectionType?: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  referrer?: string;
  experimentVariant?: string;
}

export interface AnalyticsEvent extends BaseEntity {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventData: AnalyticsEventData;
  context?: AnalyticsContext;
  timestamp: Date;
  processingTime?: number;
}

// ========================================
// SYSTEM ADMINISTRATION TYPES
// ========================================

export interface SystemConfig extends TimestampedEntity {
  key: string;
  value: Record<string, any>;
  description?: string;
  category?: string;
  isPublic: boolean;
}

export interface AuditChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
  fields?: string[];
}

export interface AuditMetadata {
  source: string;
  reason?: string;
  batchId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLog extends BaseEntity {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: AuditChanges;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ========================================
// AI MANAGEMENT TYPES
// ========================================

export interface AIParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  model?: string;
  
  // Custom parameters for different providers
  custom?: Record<string, any>;
}

export interface AIConfiguration extends TimestampedEntity {
  provider: AIProvider;
  name: string;
  apiKey?: string;
  endpoint?: string;
  model: string;
  parameters?: AIParameters;
  isActive: boolean;
  rateLimit?: number;
  maxTokens?: number;
  costPerToken?: number;
  monthlyBudget?: number;
}

export interface AIUsageMetadata {
  requestId?: string;
  model?: string;
  context?: string;
  promptLength?: number;
  responseLength?: number;
  generationSettings?: AIParameters;
  qualityScore?: number;
}

export interface AIUsageLog extends BaseEntity {
  configurationId: string;
  requestType: string;
  prompt?: string;
  response?: string;
  tokensUsed: number;
  cost?: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  userId?: string;
  resourceId?: string;
  metadata?: AIUsageMetadata;
  createdAt: Date;
}

// ========================================
// UTILITY TYPES
// ========================================

export type Paginated<T> = {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface FilterParams {
  search?: string;
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  [key: string]: any;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  validationErrors?: ValidationError[];
  statusCode: number;
}

// ========================================
// RELATIONSHIP TYPES (for joins)
// ========================================

export interface UserWithPreferences extends User {
  userPreferences?: UserPreference;
}

export interface LessonWithDetails extends Lesson {
  createdBy: User;
  videoGroups: (VideoGroup & {
    videos: Video[];
  })[];
}

export interface VideoWithMilestones extends Video {
  milestones: (Milestone & {
    questions: Question[];
  })[];
}

export interface QuestionWithAttempts extends Question {
  attempts: QuestionAttempt[];
}

export interface StudentProgressWithGrades extends StudentProgress {
  grades: Grade[];
  lesson: Lesson;
}

export interface SessionWithVideo extends StudentSession {
  video: Video & {
    videoGroup: VideoGroup & {
      lesson: Lesson;
    };
  };
}

// ========================================
// DASHBOARD AND ANALYTICS TYPES
// ========================================

export interface TeacherDashboardData {
  totalLessons: number;
  publishedLessons: number;
  totalStudents: number;
  averageCompletion: number;
  recentActivity: AnalyticsEvent[];
  popularLessons: (Lesson & { studentCount: number; averageScore: number })[];
  questionApprovalQueue: Question[];
}

export interface StudentDashboardData {
  enrolledLessons: number;
  completedLessons: number;
  totalProgress: number;
  averageScore: number;
  recentSessions: StudentSession[];
  recommendations: Lesson[];
  achievements: any[];
}

export interface AdminDashboardData {
  totalUsers: Record<UserRole, number>;
  systemHealth: {
    activeUsers: number;
    activeSessions: number;
    systemLoad: number;
    errorRate: number;
  };
  contentStats: {
    totalLessons: number;
    totalVideos: number;
    totalQuestions: number;
    pendingReviews: number;
  };
  aiUsage: {
    monthlyTokens: number;
    monthlyCost: number;
    successRate: number;
    averageResponseTime: number;
  };
}

// ========================================
// EXPORT ALL TYPES
// ========================================

export type {
  // Re-export all interfaces and types for easier importing
  BaseEntity,
  TimestampedEntity,
  User,
  UserPreference,
  Lesson,
  VideoGroup,
  Video,
  Milestone,
  Question,
  QuestionData,
  StudentSession,
  StudentProgress,
  ProgressData,
  QuestionAttempt,
  Grade,
  GradeBreakdown,
  AnalyticsEvent,
  AnalyticsEventData,
  AnalyticsContext,
  SystemConfig,
  AuditLog,
  AuditChanges,
  AuditMetadata,
  AIConfiguration,
  AIParameters,
  AIUsageLog,
  AIUsageMetadata,
  Paginated,
  PaginationParams,
  FilterParams,
  ApiResponse,
  ApiError,
  ValidationError,
  UserWithPreferences,
  LessonWithDetails,
  VideoWithMilestones,
  QuestionWithAttempts,
  StudentProgressWithGrades,
  SessionWithVideo,
  TeacherDashboardData,
  StudentDashboardData,
  AdminDashboardData,
  DeviceInfo,
  BrowserInfo,
  AttemptData
};