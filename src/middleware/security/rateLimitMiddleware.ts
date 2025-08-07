import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { environment } from '../../config/environment';
import { logger } from '../../utils/logger';

// Custom key generator for rate limiting
const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get real IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return `ip:${ip}`;
};

// Custom skip function
const skipFunction = (req: Request): boolean => {
  // Skip rate limiting for health checks
  if (req.path === '/health') {
    return true;
  }
  
  // Skip for internal requests (if they have special header)
  if (req.headers['x-internal-request'] === 'true') {
    return true;
  }
  
  return false;
};

// Rate limit exceeded handler
const rateLimitHandler = (req: Request, res: Response) => {
  const identifier = keyGenerator(req);
  logger.warn(`Rate limit exceeded for ${identifier} on ${req.method} ${req.path}`, {
    identifier,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(environment.rateLimit.windowMs / 1000)
    }
  });
};

// Default rate limit configuration
export const rateLimitMiddleware = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.maxRequests,
  keyGenerator,
  skip: skipFunction,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});

// Stricter rate limit for authentication endpoints
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator,
  skip: skipFunction,
  handler: (req: Request, res: Response) => {
    const identifier = keyGenerator(req);
    logger.warn(`Auth rate limit exceeded for ${identifier}`, {
      identifier,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: 900 // 15 minutes
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit for file uploads
export const uploadRateLimitMiddleware = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  keyGenerator,
  skip: skipFunction,
  handler: (req: Request, res: Response) => {
    const identifier = keyGenerator(req);
    logger.warn(`Upload rate limit exceeded for ${identifier}`, {
      identifier,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads. Please try again in an hour.',
        retryAfter: 3600 // 1 hour
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit for AI API requests
export const aiRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
  keyGenerator,
  skip: skipFunction,
  handler: (req: Request, res: Response) => {
    const identifier = keyGenerator(req);
    logger.warn(`AI rate limit exceeded for ${identifier}`, {
      identifier,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(429).json({
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: 'AI service rate limit exceeded. Please try again in a minute.',
        retryAfter: 60
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});