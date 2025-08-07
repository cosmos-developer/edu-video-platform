import { Request } from 'express';
import { UserRole, UserStatus } from '@prisma/client';

// Authentication types
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenantId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Video processing types
export interface VideoUploadMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  duration?: number;
}

export interface VideoProcessingJob {
  videoId: string;
  gcsPath: string;
  metadata: VideoUploadMetadata;
}

// AI Provider types
export interface AIProvider {
  name: string;
  generateQuestion(prompt: string, context: QuestionGenerationContext): Promise<GeneratedQuestion>;
  validateConfiguration(): Promise<boolean>;
}

export interface QuestionGenerationContext {
  lessonTitle: string;
  videoTitle: string;
  milestoneDescription: string;
  difficulty: string;
  questionType: string;
  existingQuestions?: string[];
}

export interface GeneratedQuestion {
  text: string;
  type: string;
  questionData: any;
  explanation?: string;
  hints?: string[];
  confidence: number;
  metadata?: any;
}

// Session management types
export interface SessionData {
  id: string;
  userId: string;
  videoId: string;
  currentPosition: number;
  lastMilestoneId?: string;
  completedMilestones: string[];
  deviceInfo?: any;
  lastSeenAt: Date;
}

// Analytics types
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  data: any;
  context?: any;
  timestamp: Date;
}

// Progress tracking types
export interface ProgressUpdate {
  studentId: string;
  lessonId: string;
  videoId?: string;
  milestoneId?: string;
  completionPercent: number;
  timeSpent: number;
  score?: number;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// File upload types
export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  destination: string;
}

// Database transaction types
export type TransactionCallback<T> = (tx: any) => Promise<T>;

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidatedRequest<T = any> extends Request {
  validatedData?: T;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  status?: string[];
  role?: UserRole[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  difficulty?: string[];
}

// Audit log types
export interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

// Email types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

// Configuration types
export interface SystemConfiguration {
  key: string;
  value: any;
  description?: string;
  category?: string;
  isPublic?: boolean;
}