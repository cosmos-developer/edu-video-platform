import { Router, Response } from 'express';
import { lessonController } from '../controllers/lessonController';
import { authenticate, authorize } from '../middleware/auth/authMiddleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation/validateRequest';

const router = Router();

// Validation schemas
const createLessonValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  body('objectives')
    .optional()
    .isArray()
    .withMessage('Objectives must be an array'),
  body('objectives.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each objective must be 1-500 characters'),
  body('estimatedTime')
    .optional()
    .isInt({ min: 1, max: 10080 })
    .withMessage('Estimated time must be between 1 and 10080 minutes (1 week)'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be 1-50 characters'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

const updateLessonValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  body('objectives')
    .optional()
    .isArray()
    .withMessage('Objectives must be an array'),
  body('objectives.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each objective must be 1-500 characters'),
  body('estimatedTime')
    .optional()
    .isInt({ min: 1, max: 10080 })
    .withMessage('Estimated time must be between 1 and 10080 minutes'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be 1-50 characters'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('Status must be DRAFT, PUBLISHED, or ARCHIVED')
];

const lessonIdValidation = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Lesson ID is required')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('Status must be DRAFT, PUBLISHED, or ARCHIVED'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  query('createdById')
    .optional()
    .isString()
    .withMessage('Created by ID must be a string')
];

// Routes

// GET /api/lessons - Get all lessons
router.get('/',
  authenticate,
  queryValidation,
  validateRequest,
  lessonController.getAllLessons
);

// GET /api/lessons/:id - Get lesson by ID
router.get('/:id',
  authenticate,
  lessonIdValidation,
  validateRequest,
  lessonController.getLessonById
);

// POST /api/lessons - Create new lesson (Teacher/Admin only)
router.post('/',
  authenticate,
  authorize(['TEACHER', 'ADMIN']),
  createLessonValidation,
  validateRequest,
  lessonController.createLesson
);

// PUT /api/lessons/:id - Update lesson (Teacher/Admin only)
router.put('/:id',
  authenticate,
  authorize(['TEACHER', 'ADMIN']),
  lessonIdValidation,
  updateLessonValidation,
  validateRequest,
  lessonController.updateLesson
);

// POST /api/lessons/:id/publish - Publish lesson (Teacher/Admin only)
router.post('/:id/publish',
  authenticate,
  authorize(['TEACHER', 'ADMIN']),
  lessonIdValidation,
  validateRequest,
  lessonController.publishLesson
);

// POST /api/lessons/:id/archive - Archive lesson (Teacher/Admin only)
router.post('/:id/archive',
  authenticate,
  authorize(['TEACHER', 'ADMIN']),
  lessonIdValidation,
  validateRequest,
  lessonController.archiveLesson
);

// DELETE /api/lessons/:id - Delete lesson (Teacher/Admin only)
router.delete('/:id',
  authenticate,
  authorize(['TEACHER', 'ADMIN']),
  lessonIdValidation,
  validateRequest,
  lessonController.deleteLesson
);

export default router;