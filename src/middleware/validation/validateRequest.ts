import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../../utils/logger';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
    return;
  }

  next();
};