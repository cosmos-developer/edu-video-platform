import { Router, Response } from 'express'
import { body } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam, validateCUIDBody } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
// import { roleMiddleware } from '../middleware/role' // TODO: Create this middleware
import { MilestoneService } from '../services/MilestoneService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// POST /api/milestones - Create milestone for video (teachers only)
router.post('/',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDBody('videoId', 'Valid video ID is required'),
  body('timestamp').isNumeric().withMessage('Timestamp must be a number'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('isRequired').optional().isBoolean().withMessage('isRequired must be boolean'),
  body('retryLimit').optional().isInt({ min: 1 }).withMessage('Retry limit must be a positive integer'),
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

      const milestoneData = {
        videoId: req.body.videoId,
        timestamp: Number(req.body.timestamp),
        title: req.body.title,
        description: req.body.description || null,
        isRequired: req.body.isRequired,
        retryLimit: req.body.retryLimit
      }

      const milestone = await MilestoneService.createMilestone(milestoneData, req.user!)

      res.status(201).json({
        success: true,
        data: milestone,
        message: 'Milestone created successfully'
      })

    } catch (error: any) {
      console.error('Error creating milestone:', error)
      
      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        })
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      if (error.message.includes('Milestone already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create milestone'
      })
    }
  }
)

// GET /api/milestones/video/:videoId - Get all milestones for a video
router.get('/video/:videoId',
  validateCUIDParam('videoId', 'Invalid video ID'),
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

      const milestones = await MilestoneService.getMilestonesByVideo(req.params.videoId, req.user!.id)

      res.json({
        success: true,
        data: milestones
      })

    } catch (error: any) {
      console.error('Error fetching milestones:', error)
      
      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch milestones'
      })
    }
  }
)

// PUT /api/milestones/:id - Update milestone (creator or admin only)
router.put('/:id',
  validateCUIDParam('id', 'Invalid milestone ID'),
  body('timestamp').optional().isNumeric().withMessage('Timestamp must be a number'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('isRequired').optional().isBoolean().withMessage('isRequired must be boolean'),
  body('retryLimit').optional().isInt({ min: 1 }).withMessage('Retry limit must be a positive integer'),
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
        timestamp: req.body.timestamp ? Number(req.body.timestamp) : undefined,
        title: req.body.title,
        description: req.body.description,
        isRequired: req.body.isRequired,
        retryLimit: req.body.retryLimit
      }

      const milestone = await MilestoneService.updateMilestone(
        req.params.id,
        updateData,
        req.user!
      )

      res.json({
        success: true,
        data: milestone,
        message: 'Milestone updated successfully'
      })

    } catch (error: any) {
      console.error('Error updating milestone:', error)
      
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

      if (error.message.includes('Milestone already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update milestone'
      })
    }
  }
)

// DELETE /api/milestones/:id - Delete milestone (creator or admin only)
router.delete('/:id',
  validateCUIDParam('id', 'Invalid milestone ID'),
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

      await MilestoneService.deleteMilestone(req.params.id, req.user!)

      res.json({
        success: true,
        message: 'Milestone deleted successfully'
      })

    } catch (error: any) {
      console.error('Error deleting milestone:', error)
      
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

      return res.status(500).json({
        success: false,
        error: 'Failed to delete milestone'
      })
    }
  }
)

// POST /api/milestones/:id/questions - Add question to milestone (creator or admin only)
router.post('/:id/questions',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDParam('id', 'Invalid milestone ID'),
  body('type').isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK']).withMessage('Invalid question type'),
  body('text').notEmpty().trim().withMessage('Question text is required'),
  body('explanation').optional().trim(),
  body('hints').optional().isArray().withMessage('Hints must be an array'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
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
        milestoneId: req.params.id,
        type: req.body.type,
        text: req.body.text,
        explanation: req.body.explanation || null,
        hints: req.body.hints || [],
        difficulty: req.body.difficulty || null,
        questionData: req.body.questionData
      }

      const question = await MilestoneService.addQuestionToMilestone(questionData, req.user!)

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question added successfully'
      })

    } catch (error: any) {
      console.error('Error adding question:', error)
      
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

      return res.status(500).json({
        success: false,
        error: 'Failed to add question'
      })
    }
  }
)

export default router