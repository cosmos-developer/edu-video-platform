import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { environment } from '../../config/environment';

/**
 * Session validation middleware - Checks if user session is still valid
 */
export const validateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(); // Skip if not authenticated
  }

  try {
    const userId = req.user.id;
    const sessionTimeout = environment.session.timeoutMinutes * 60 * 1000; // Convert to milliseconds
    const now = new Date();
    
    // Check if user's last activity was within session timeout
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true }
    });

    if (!user || !user.lastLoginAt) {
      logger.warn('Session validation failed - no last login time', { userId });
      return next();
    }

    const lastActivity = new Date(user.lastLoginAt);
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

    if (timeSinceLastActivity > sessionTimeout) {
      logger.info('Session expired due to inactivity', {
        userId,
        lastActivity: lastActivity.toISOString(),
        sessionTimeout: `${environment.session.timeoutMinutes} minutes`
      });
      
      // Don't update lastLoginAt here as session is expired
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired due to inactivity',
          timestamp: now.toISOString()
        }
      });
    }

    // Update last activity time for active sessions
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: now }
    });

    logger.debug('Session validated and updated', {
      userId,
      lastActivity: lastActivity.toISOString()
    });

    next();
  } catch (error) {
    logger.error('Session validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
      requestId: req.headers['x-request-id']
    });
    
    // Don't fail the request for session validation errors
    next();
  }
};

/**
 * Concurrent session limit middleware
 */
export const checkConcurrentSessions = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next();
  }

  try {
    const userId = req.user.id;
    const maxConcurrentSessions = 3; // Allow maximum 3 concurrent sessions
    const sessionTimeout = environment.session.timeoutMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - sessionTimeout);

    // Count active student sessions for this user
    const activeSessions = await prisma.studentSession.count({
      where: {
        studentId: userId,
        lastSeenAt: {
          gte: cutoffTime
        },
        status: 'ACTIVE'
      }
    });

    if (activeSessions > maxConcurrentSessions) {
      logger.warn('Too many concurrent sessions', {
        userId,
        activeSessions,
        maxAllowed: maxConcurrentSessions
      });

      // Optionally, you could terminate the oldest sessions here
      // For now, just warn and continue
    }

    next();
  } catch (error) {
    logger.error('Concurrent session check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
      requestId: req.headers['x-request-id']
    });
    
    next();
  }
};

/**
 * Device fingerprinting middleware for session security
 */
export const captureDeviceInfo = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next();
  }

  try {
    // Capture device and browser information
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Add device info to request for use in other middleware/controllers
    (req as any).deviceInfo = deviceInfo;

    logger.debug('Device information captured', {
      userId: req.user.id,
      deviceInfo,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Device info capture error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      requestId: req.headers['x-request-id']
    });
    
    next();
  }
};

/**
 * Session cleanup middleware - Removes expired sessions periodically
 */
export const cleanupExpiredSessions = async () => {
  try {
    const sessionTimeout = environment.session.timeoutMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - sessionTimeout);

    // Clean up expired student sessions
    const deletedSessions = await prisma.studentSession.deleteMany({
      where: {
        lastSeenAt: {
          lt: cutoffTime
        },
        status: {
          in: ['ACTIVE', 'PAUSED']
        }
      }
    });

    if (deletedSessions.count > 0) {
      logger.info('Cleaned up expired sessions', {
        deletedCount: deletedSessions.count,
        cutoffTime: cutoffTime.toISOString()
      });
    }

    // Also update user last login times for users who haven't been active
    await prisma.user.updateMany({
      where: {
        lastLoginAt: {
          lt: cutoffTime
        }
      },
      data: {
        lastLoginAt: null
      }
    });

  } catch (error) {
    logger.error('Session cleanup error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};