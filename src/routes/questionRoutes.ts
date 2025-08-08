import { Router, Response } from 'express'
import { body } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam, validateCUIDBody } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
import { QuestionService } from '../services/QuestionService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// POST /api/questions - Create new question for milestone (teachers only)
router.post('/',
  validateCUIDBody('milestoneId', 'Valid milestone ID is required'),
  body('type').isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK', 'MATCHING', 'ORDERING']).withMessage('Invalid question type'),
  body('text').notEmpty().trim().withMessage('Question text is required'),
  body('explanation').optional().trim(),
  body('hints').optional().isArray().withMessage('Hints must be an array'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('points').optional().isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('passThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Pass threshold must be between 0 and 1'),
  body('questionData').notEmpty().withMessage('Question data is required'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const questionData = {
        milestoneId: req.body.milestoneId,
        type: req.body.type,
        text: req.body.text,
        explanation: req.body.explanation,
        hints: req.body.hints,
        difficulty: req.body.difficulty,
        points: req.body.points,
        passThreshold: req.body.passThreshold,
        questionData: req.body.questionData
      }

      const question = await QuestionService.createQuestion(questionData, req.user!)

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question created successfully'
      })

    } catch (error: any) {
      console.error('Error creating question:', error)
      
      if (error.message === 'Milestone not found') {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found'
        })
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      if (error.message.includes('Question data') || error.message.includes('must have')) {
        return res.status(400).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create question'
      })
    }
  }
)

// GET /api/questions/milestone/:milestoneId - Get all questions for a milestone
router.get('/milestone/:milestoneId',
  validateCUIDParam('milestoneId', 'Invalid milestone ID'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const questions = await QuestionService.getQuestionsByMilestone(req.params.milestoneId, req.user!.id)

      res.json({
        success: true,
        data: questions
      })

    } catch (error: any) {
      console.error('Error fetching questions:', error)
      
      if (error.message === 'Milestone not found or access denied') {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found or access denied'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch questions'
      })
    }
  }
)

// GET /api/questions/:id - Get specific question
router.get('/:id',
  validateCUIDParam('id', 'Invalid question ID'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const question = await QuestionService.getQuestionById(req.params.id, req.user!.id)

      if (!question) {
        return res.status(404).json({
          success: false,
          error: 'Question not found or access denied'
        })
      }

      res.json({
        success: true,
        data: question
      })

    } catch (error) {
      console.error('Error fetching question:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch question'
      })
    }
  }
)

// PUT /api/questions/:id - Update question (creator or admin only)
router.put('/:id',
  validateCUIDParam('id', 'Invalid question ID'),
  body('text').optional().notEmpty().trim().withMessage('Question text cannot be empty'),
  body('explanation').optional().trim(),
  body('hints').optional().isArray().withMessage('Hints must be an array'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('points').optional().isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('passThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Pass threshold must be between 0 and 1'),
  body('status').optional().isIn(['DRAFT', 'APPROVED', 'ARCHIVED']).withMessage('Invalid status'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const updateData = {
        text: req.body.text,
        explanation: req.body.explanation,
        hints: req.body.hints,
        difficulty: req.body.difficulty,
        points: req.body.points,
        passThreshold: req.body.passThreshold,
        questionData: req.body.questionData,
        status: req.body.status
      }

      const question = await QuestionService.updateQuestion(
        req.params.id,
        updateData,
        req.user!
      )

      res.json({
        success: true,
        data: question,
        message: 'Question updated successfully'
      })

    } catch (error: any) {
      console.error('Error updating question:', error)
      
      if (error.message === 'Question not found') {
        return res.status(404).json({
          success: false,
          error: 'Question not found'
        })
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      if (error.message.includes('Question data') || error.message.includes('must have')) {
        return res.status(400).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update question'
      })
    }
  }
)

// DELETE /api/questions/:id - Delete question (creator or admin only)
router.delete('/:id',
  validateCUIDParam('id', 'Invalid question ID'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      await QuestionService.deleteQuestion(req.params.id, req.user!)

      res.json({
        success: true,
        message: 'Question deleted successfully'
      })

    } catch (error: any) {
      console.error('Error deleting question:', error)
      
      if (error.message === 'Question not found') {
        return res.status(404).json({
          success: false,
          error: 'Question not found'
        })
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete question'
      })
    }
  }
)

// POST /api/questions/:id/approve - Approve question (teachers only)
router.post('/:id/approve',
  validateCUIDParam('id', 'Invalid question ID'),
  body('reviewNotes').optional().trim(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const question = await QuestionService.approveQuestion(
        req.params.id,
        req.user!,
        req.body.reviewNotes
      )

      res.json({
        success: true,
        data: question,
        message: 'Question approved successfully'
      })

    } catch (error: any) {
      console.error('Error approving question:', error)
      
      if (error.message === 'Question not found') {
        return res.status(404).json({
          success: false,
          error: 'Question not found'
        })
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to approve question'
      })
    }
  }
)

// GET /api/questions/templates - Get question type templates (for UI reference)
router.get('/templates',
  async (_req: AuthenticatedRequest, res) => {
    try {
      const templates = QuestionService.getQuestionTemplates()

      res.json({
        success: true,
        data: templates,
        message: 'Question templates retrieved successfully'
      })

    } catch (error) {
      console.error('Error fetching question templates:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch question templates'
      })
    }
  }
)

export default router