import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { performance } from 'perf_hooks';

interface RequestWithTiming extends Request {
  startTime?: number;
}

export const requestLogger = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  req.startTime = startTime;
  
  // Get request details
  const requestId = req.headers['x-request-id'] as string;
  const userAgent = req.headers['user-agent'];
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  const userId = (req as any).user?.id;
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: realIp,
    userAgent,
    userId: userId || 'anonymous',
    contentLength: req.headers['content-length'],
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100; // Round to 2 decimal places
    
    // Determine log level based on status code
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logLevel = 'warn';
    } else if (res.statusCode >= 500) {
      logLevel = 'error';
    }
    
    // Log response
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      ip: realIp,
      userId: userId || 'anonymous',
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        userId: userId || 'anonymous'
      });
    }
    
    // Call original end method and return its result
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};