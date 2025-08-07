import { Router } from 'express'
import { body } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
// import { roleMiddleware } from '../middleware/role' // TODO: Create this middleware
import { AIQuestionService } from '../services/AIQuestionService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/ai/providers - Get available AI providers
router.get('/providers', 
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  (_req: AuthenticatedRequest, res) => {
    try {
      const providers = AIQuestionService.getAvailableProviders()
      res.json({
        success: true,
        data: {
          providers,
          hasAISupport: providers.length > 0
        }
      })
    } catch (error) {
      console.error('Error getting AI providers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get AI providers'
      })
    }
  }
)

// POST /api/ai/generate-questions - Generate questions from content
router.post('/generate-questions',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  body('videoTitle').notEmpty().trim().withMessage('Video title is required'),
  body('content').notEmpty().trim().withMessage('Content is required'),
  body('questionCount').optional().isInt({ min: 1, max: 10 }).withMessage('Question count must be between 1 and 10'),
  body('questionTypes').optional().isArray().withMessage('Question types must be an array'),
  body('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD']).withMessage('Invalid difficulty level'),
  body('provider').optional().isIn(['OPENAI', 'CLAUDE']).withMessage('Invalid AI provider'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const result = await AIQuestionService.generateQuestions({
        videoTitle: req.body.videoTitle,
        videoDescription: req.body.videoDescription,
        content: req.body.content,
        questionCount: req.body.questionCount || 3,
        questionTypes: req.body.questionTypes || ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
        difficulty: req.body.difficulty || 'MEDIUM',
        provider: req.body.provider
      })

      res.json({
        success: true,
        data: result,
        message: 'Questions generated successfully'
      })

    } catch (error: any) {
      console.error('Error generating questions:', error)
      
      // Handle specific error types
      if (error.message.includes('No AI provider')) {
        return res.status(503).json({
          success: false,
          error: 'AI service unavailable',
          message: 'No AI providers are currently configured'
        })
      }

      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return res.status(503).json({
          success: false,
          error: 'AI service configuration error',
          message: 'AI provider authentication failed'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to generate questions',
        message: error.message || 'An unexpected error occurred'
      })
    }
  }
)

// POST /api/ai/generate-for-milestone/:milestoneId - Generate questions for existing milestone
router.post('/generate-for-milestone/:milestoneId',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDParam('milestoneId', 'Invalid milestone ID'),
  body('content').optional().trim(),
  body('questionCount').optional().isInt({ min: 1, max: 10 }).withMessage('Question count must be between 1 and 10'),
  body('questionTypes').optional().isArray().withMessage('Question types must be an array'),
  body('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD']).withMessage('Invalid difficulty level'),
  body('provider').optional().isIn(['OPENAI', 'CLAUDE']).withMessage('Invalid AI provider'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      await AIQuestionService.generateQuestionsForMilestone(req.params.milestoneId, {
        videoTitle: '', // Will be retrieved from milestone
        content: req.body.content,
        questionCount: req.body.questionCount || 3,
        questionTypes: req.body.questionTypes || ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
        difficulty: req.body.difficulty || 'MEDIUM',
        provider: req.body.provider
      })

      res.json({
        success: true,
        message: 'Questions generated and added to milestone successfully'
      })

    } catch (error: any) {
      console.error('Error generating questions for milestone:', error)
      
      if (error.message === 'Milestone not found') {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found'
        })
      }

      if (error.message.includes('No AI provider')) {
        return res.status(503).json({
          success: false,
          error: 'AI service unavailable'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to generate questions for milestone',
        message: error.message || 'An unexpected error occurred'
      })
    }
  }
)

// POST /api/ai/generate-milestone-with-questions/:videoId - Generate milestone and questions from content
router.post('/generate-milestone-with-questions/:videoId',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDParam('videoId', 'Invalid video ID'),
  body('videoTitle').notEmpty().trim().withMessage('Video title is required'),
  body('content').notEmpty().trim().withMessage('Content is required'),
  body('questionCount').optional().isInt({ min: 1, max: 10 }).withMessage('Question count must be between 1 and 10'),
  body('questionTypes').optional().isArray().withMessage('Question types must be an array'),
  body('difficulty').optional().isIn(['EASY', 'MEDIUM', 'HARD']).withMessage('Invalid difficulty level'),
  body('provider').optional().isIn(['OPENAI', 'CLAUDE']).withMessage('Invalid AI provider'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const result = await AIQuestionService.generateMilestoneWithQuestions(req.params.videoId, {
        videoTitle: req.body.videoTitle,
        videoDescription: req.body.videoDescription,
        content: req.body.content,
        questionCount: req.body.questionCount || 3,
        questionTypes: req.body.questionTypes || ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
        difficulty: req.body.difficulty || 'MEDIUM',
        provider: req.body.provider
      })

      res.json({
        success: true,
        data: result,
        message: 'Milestone and questions generated successfully'
      })

    } catch (error: any) {
      console.error('Error generating milestone with questions:', error)
      
      if (error.message.includes('No AI provider')) {
        return res.status(503).json({
          success: false,
          error: 'AI service unavailable'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to generate milestone with questions',
        message: error.message || 'An unexpected error occurred'
      })
    }
  }
)

export default router