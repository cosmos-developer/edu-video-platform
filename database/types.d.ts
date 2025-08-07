export declare enum UserRole {
    STUDENT = "STUDENT",
    TEACHER = "TEACHER",
    ADMIN = "ADMIN"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED",
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
}
export declare enum LessonStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED"
}
export declare enum VideoStatus {
    UPLOADING = "UPLOADING",
    PROCESSING = "PROCESSING",
    READY = "READY",
    ERROR = "ERROR"
}
export declare enum QuestionType {
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    TRUE_FALSE = "TRUE_FALSE",
    SHORT_ANSWER = "SHORT_ANSWER",
    FILL_IN_BLANK = "FILL_IN_BLANK",
    MATCHING = "MATCHING",
    ORDERING = "ORDERING"
}
export declare enum QuestionStatus {
    AI_GENERATED = "AI_GENERATED",
    PENDING_REVIEW = "PENDING_REVIEW",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    NEEDS_REVISION = "NEEDS_REVISION"
}
export declare enum SessionStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    COMPLETED = "COMPLETED",
    ABANDONED = "ABANDONED"
}
export declare enum AttemptStatus {
    IN_PROGRESS = "IN_PROGRESS",
    SUBMITTED = "SUBMITTED",
    CORRECT = "CORRECT",
    INCORRECT = "INCORRECT",
    PARTIAL = "PARTIAL",
    TIMEOUT = "TIMEOUT"
}
export declare enum GradeStatus {
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    RETRY_ALLOWED = "RETRY_ALLOWED"
}
export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    VIEW = "VIEW",
    DOWNLOAD = "DOWNLOAD",
    UPLOAD = "UPLOAD"
}
export declare enum AIProvider {
    OPENAI = "OPENAI",
    CLAUDE = "CLAUDE",
    GOOGLE_PALM = "GOOGLE_PALM",
    CUSTOM = "CUSTOM"
}
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface TimestampedEntity extends BaseEntity {
    createdAt: Date;
    updatedAt: Date;
}
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
export interface QuestionData {
    options?: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
    }>;
    correctAnswer?: boolean;
    acceptedAnswers?: string[];
    caseSensitive?: boolean;
    blanks?: Array<{
        position: number;
        acceptedAnswers: string[];
    }>;
    pairs?: Array<{
        left: string;
        right: string;
    }>;
    items?: Array<{
        id: string;
        text: string;
        correctOrder: number;
    }>;
    maxAttempts?: number;
    timeLimit?: number;
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
export interface AttemptData {
    startTime: Date;
    endTime?: Date;
    hintsViewed: number;
    timeSpentReading: number;
    timeSpentAnswering: number;
    confidence?: number;
    difficulty?: number;
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
export interface AnalyticsEventData {
    videoId?: string;
    position?: number;
    duration?: number;
    playbackSpeed?: number;
    quality?: string;
    questionId?: string;
    questionType?: QuestionType;
    attemptNumber?: number;
    correct?: boolean;
    timeSpent?: number;
    hintsUsed?: number;
    fromPage?: string;
    toPage?: string;
    navigationTime?: number;
    loadTime?: number;
    errorType?: string;
    errorMessage?: string;
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
export interface AIParameters {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    model?: string;
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
export interface TeacherDashboardData {
    totalLessons: number;
    publishedLessons: number;
    totalStudents: number;
    averageCompletion: number;
    recentActivity: AnalyticsEvent[];
    popularLessons: (Lesson & {
        studentCount: number;
        averageScore: number;
    })[];
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
export type { BaseEntity, TimestampedEntity, User, UserPreference, Lesson, VideoGroup, Video, Milestone, Question, QuestionData, StudentSession, StudentProgress, ProgressData, QuestionAttempt, Grade, GradeBreakdown, AnalyticsEvent, AnalyticsEventData, AnalyticsContext, SystemConfig, AuditLog, AuditChanges, AuditMetadata, AIConfiguration, AIParameters, AIUsageLog, AIUsageMetadata, Paginated, PaginationParams, FilterParams, ApiResponse, ApiError, ValidationError, UserWithPreferences, LessonWithDetails, VideoWithMilestones, QuestionWithAttempts, StudentProgressWithGrades, SessionWithVideo, TeacherDashboardData, StudentDashboardData, AdminDashboardData, DeviceInfo, BrowserInfo, AttemptData };
//# sourceMappingURL=types.d.ts.map