import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { environment } from '../../config/environment';

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    requestId?: string;
    timestamp: string;
  };
}

// Main error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response
) => {
  const requestId = req.headers['x-request-id'] as string;
  
  // Log the error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    requestId,
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle different error types
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code || 'APPLICATION_ERROR';
    message = error.message;
    details = error.details;
  }
  
  // Prisma errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    code = prismaError.code;
    message = prismaError.message;
    details = prismaError.details;
  }
  
  // Prisma validation errors
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid data provided';
    details = { validation: 'Invalid data format or missing required fields' };
  }
  
  // Zod validation errors
  else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = {
      validation: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    };
  }
  
  // JWT errors
  else if (error instanceof JsonWebTokenError) {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  else if (error instanceof TokenExpiredError) {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  
  // Multer errors (file upload)
  else if (error.name === 'MulterError') {
    const multerError = handleMulterError(error as any);
    statusCode = multerError.statusCode;
    code = multerError.code;
    message = multerError.message;
    details = multerError.details;
  }
  
  // Syntax errors (JSON parsing)
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  
  // Type errors
  else if (error instanceof TypeError) {
    statusCode = 400;
    code = 'TYPE_ERROR';
    message = 'Invalid data type provided';
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  // Add stack trace in development
  if (environment.server.isDevelopment) {
    errorResponse.error.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Handle Prisma-specific errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return {
        statusCode: 409,
        code: 'DUPLICATE_RECORD',
        message: 'A record with this data already exists',
        details: {
          field: error.meta?.target,
          constraint: 'unique_violation'
        }
      };
    
    case 'P2025': // Record not found
      return {
        statusCode: 404,
        code: 'RECORD_NOT_FOUND',
        message: 'The requested record was not found',
        details: {
          cause: error.meta?.cause
        }
      };
    
    case 'P2003': // Foreign key constraint violation
      return {
        statusCode: 400,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Referenced record does not exist',
        details: {
          field: error.meta?.field_name
        }
      };
    
    case 'P2014': // Invalid ID
      return {
        statusCode: 400,
        code: 'INVALID_ID',
        message: 'Invalid record ID provided',
        details: {
          field: error.meta?.field_name
        }
      };
    
    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: {
          code: error.code,
          meta: error.meta
        }
      };
  }
}

// Handle Multer (file upload) errors
function handleMulterError(error: any) {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 413,
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the allowed limit',
        details: {
          maxSize: environment.security.maxFileSize
        }
      };
    
    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        code: 'TOO_MANY_FILES',
        message: 'Too many files uploaded',
        details: {
          maxCount: error.limit
        }
      };
    
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        code: 'UNEXPECTED_FILE',
        message: 'Unexpected file field',
        details: {
          field: error.field
        }
      };
    
    default:
      return {
        statusCode: 400,
        code: 'FILE_UPLOAD_ERROR',
        message: 'File upload failed',
        details: {
          error: error.message
        }
      };
  }
}