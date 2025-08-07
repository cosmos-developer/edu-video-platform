import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth/authMiddleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation/validateRequest';

const router = Router();

// Validation schemas
const createUserValidation = [
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
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Role must be STUDENT, TEACHER, or ADMIN'),
  body('tenantId')
    .optional()
    .isString()
    .withMessage('Tenant ID must be a string')
];

const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Role must be STUDENT, TEACHER, or ADMIN'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
    .withMessage('Status must be ACTIVE, INACTIVE, SUSPENDED, or PENDING_VERIFICATION')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const preferencesValidation = [
  body('autoplay')
    .optional()
    .isBoolean()
    .withMessage('Autoplay must be a boolean'),
  body('playbackSpeed')
    .optional()
    .isFloat({ min: 0.25, max: 3.0 })
    .withMessage('Playback speed must be between 0.25 and 3.0'),
  body('subtitles')
    .optional()
    .isBoolean()
    .withMessage('Subtitles must be a boolean'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Language must be 2-10 characters'),
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('progressNotifications')
    .optional()
    .isBoolean()
    .withMessage('Progress notifications must be a boolean'),
  body('allowAnalytics')
    .optional()
    .isBoolean()
    .withMessage('Allow analytics must be a boolean')
];

const userIdValidation = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Role must be STUDENT, TEACHER, or ADMIN'),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
    .withMessage('Status must be ACTIVE, INACTIVE, SUSPENDED, or PENDING_VERIFICATION')
];

// Routes

// GET /api/users - Get all users (Admin only)
router.get('/', 
  authenticate,
  authorize(['ADMIN']),
  paginationValidation,
  validateRequest,
  userController.getAllUsers
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  authenticate,
  userIdValidation,
  validateRequest,
  userController.getUserById
);

// POST /api/users - Create new user (Admin only)
router.post('/',
  authenticate,
  authorize(['ADMIN']),
  createUserValidation,
  validateRequest,
  userController.createUser
);

// PUT /api/users/:id - Update user
router.put('/:id',
  authenticate,
  userIdValidation,
  updateUserValidation,
  validateRequest,
  userController.updateUser
);

// POST /api/users/:id/change-password - Change password
router.post('/:id/change-password',
  authenticate,
  userIdValidation,
  changePasswordValidation,
  validateRequest,
  userController.changePassword
);

// PUT /api/users/:id/preferences - Update user preferences
router.put('/:id/preferences',
  authenticate,
  userIdValidation,
  preferencesValidation,
  validateRequest,
  userController.updatePreferences
);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id',
  authenticate,
  authorize(['ADMIN']),
  userIdValidation,
  validateRequest,
  userController.deleteUser
);

export default router;