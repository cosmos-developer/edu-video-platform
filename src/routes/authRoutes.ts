import { Router, Request, Response } from 'express';
import authService from '../services/auth/authService';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation/validateRequest';
import { logger } from '../utils/logger';
import { authenticate, AuthenticatedRequest } from '../middleware/auth/authMiddleware';
import { AppError } from '../types';

const router = Router();

// Validation schemas
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER'])
    .withMessage('Role must be STUDENT or TEACHER')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Routes

// POST /api/auth/login - User login
router.post('/login',
  loginValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login({ email, password });

      logger.info(`User logged in: ${email}`, {
        userId: result.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.json({
        success: true,
        data: {
          user: result.user,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// POST /api/auth/register - User registration
router.post('/register',
  registerValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const registrationData = req.body;
      
      const result = await authService.register(registrationData);

      logger.info(`User registered: ${registrationData.email}`, {
        userId: result.user?.id,
        role: result.user?.role,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        },
        message: 'Registration successful'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh',
  refreshTokenValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: {
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// POST /api/auth/logout - User logout
router.post('/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // In a more sophisticated implementation, you would invalidate the refresh token
      // For now, we just log the logout event
      logger.info(`User logged out: ${req.user!.email}`, {
        userId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// GET /api/auth/me - Get current user profile
router.get('/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          tenantId: user.tenantId,
          lastLoginAt: user.lastLoginAt,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;