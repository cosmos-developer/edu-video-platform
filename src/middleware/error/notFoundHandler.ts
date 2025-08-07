import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  
  // Log the 404 error
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id || 'anonymous'
  });

  // Send 404 response
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId,
      timestamp: new Date().toISOString()
    }
  });
};