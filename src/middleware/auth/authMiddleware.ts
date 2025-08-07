import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { jwtService } from '../../services/auth/jwtService';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../types';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: UserRole;
    tenantId?: string;
    status: string;
    lastLoginAt?: Date;
    emailVerified?: Date;
    createdAt: Date;
  };
}

/**
 * Authentication middleware - Verifies JWT token and adds user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify token
    const payload = jwtService.verifyAccessToken(token);
    
    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        status: true,
        tenantId: true,
        lastLoginAt: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403);
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || undefined,
      role: user.role,
      status: user.status.toString(),
      tenantId: user.tenantId || undefined,
      lastLoginAt: user.lastLoginAt || undefined,
      emailVerified: user.emailVerified || undefined,
      createdAt: user.createdAt
    };

    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      requestId: req.headers['x-request-id'],
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id'],
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (error instanceof AppError) {
      return next(error);
    }

    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Optional authentication middleware - Adds user to request if token is present
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next(); // No token provided, continue without user
    }

    // Verify token
    const payload = jwtService.verifyAccessToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        status: true,
        tenantId: true,
        lastLoginAt: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username || undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar || undefined,
        role: user.role,
        status: user.status.toString(),
        tenantId: user.tenantId || undefined,
        lastLoginAt: user.lastLoginAt || undefined,
        emailVerified: user.emailVerified || undefined,
        createdAt: user.createdAt
      };
    }

    next();
  } catch (error) {
    // In optional auth, we don't fail the request for invalid tokens
    logger.debug('Optional authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id']
    });
    
    next();
  }
};

/**
 * Role-based authorization middleware factory
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method
      });

      return next(new AppError('Insufficient permissions', 403));
    }

    logger.debug('Authorization successful', {
      userId: req.user.id,
      userRole: req.user.role,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Resource ownership check middleware factory
 */
export const authorizeOwnership = (resourceIdParam: string = 'id') => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;
    
    // Admin users can access any resource
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // For students and teachers, they can only access their own resources
    if (resourceIdParam === 'userId' || resourceIdParam === 'studentId') {
      if (resourceId !== userId) {
        logger.warn('Authorization failed - resource ownership violation', {
          userId,
          resourceId,
          requestId: req.headers['x-request-id'],
          path: req.path
        });

        return next(new AppError('Access denied', 403));
      }
    }

    next();
  };
};

/**
 * Tenant isolation middleware
 */
export const authorizeTenant = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  // Admin users can access all tenants
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // For multi-tenant scenarios, ensure user can only access their tenant's data
  const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (tenantId && req.user.tenantId && tenantId !== req.user.tenantId) {
    logger.warn('Authorization failed - tenant isolation violation', {
      userId: req.user.id,
      userTenantId: req.user.tenantId,
      requestedTenantId: tenantId,
      requestId: req.headers['x-request-id']
    });

    return next(new AppError('Access denied', 403));
  }

  next();
};

/**
 * API Key authentication middleware (for service-to-service calls)
 */
export const authenticateApiKey = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(new AppError('API key required', 401));
  }

  // In a real implementation, you would validate the API key against a database
  // For now, we'll use a simple environment variable check
  const validApiKey = process.env.INTERNAL_API_KEY;
  
  if (!validApiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      providedKey: apiKey.substring(0, 8) + '...',
      requestId: req.headers['x-request-id'],
      ip: req.ip
    });

    return next(new AppError('Invalid API key', 401));
  }

  // Set internal request flag
  req.headers['x-internal-request'] = 'true';
  
  next();
};