import { Router } from 'express'
import { body, param } from 'express-validator'
import { validationResult } from 'express-validator'
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
  body('videoId').isUUID().withMessage('Valid video ID is required'),
  body('timestamp').isInt({ min: 0 }).withMessage('Timestamp must be a positive integer'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('type').isIn(['PAUSE', 'QUIZ', 'CHECKPOINT']).withMessage('Invalid milestone type'),
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

      const milestoneData = {
        videoId: req.body.videoId,
        timestamp: req.body.timestamp,
        title: req.body.title,
        description: req.body.description || null,
        type: req.body.type
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

      res.status(500).json({
        success: false,
        error: 'Failed to create milestone'
      })
    }
  }
)

// GET /api/milestones/video/:videoId - Get all milestones for a video
router.get('/video/:videoId',
  param('videoId').isUUID().withMessage('Invalid video ID'),
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

      res.status(500).json({
        success: false,
        error: 'Failed to fetch milestones'
      })
    }
  }
)

// PUT /api/milestones/:id - Update milestone (creator or admin only)
router.put('/:id',
  param('id').isUUID().withMessage('Invalid milestone ID'),
  body('timestamp').optional().isInt({ min: 0 }).withMessage('Timestamp must be a positive integer'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('type').optional().isIn(['PAUSE', 'QUIZ', 'CHECKPOINT']).withMessage('Invalid milestone type'),
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

      const updateData = {
        timestamp: req.body.timestamp,
        title: req.body.title,
        description: req.body.description,
        type: req.body.type
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

      res.status(500).json({
        success: false,
        error: 'Failed to update milestone'
      })
    }
  }
)

// DELETE /api/milestones/:id - Delete milestone (creator or admin only)
router.delete('/:id',
  param('id').isUUID().withMessage('Invalid milestone ID'),
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

      res.status(500).json({
        success: false,
        error: 'Failed to delete milestone'
      })
    }
  }
)

// POST /api/milestones/:id/questions - Add question to milestone (creator or admin only)
router.post('/:id/questions',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  param('id').isUUID().withMessage('Invalid milestone ID'),
  body('type').isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']).withMessage('Invalid question type'),
  body('question').notEmpty().trim().withMessage('Question text is required'),
  body('explanation').optional().trim(),
  body('options').optional().isArray().withMessage('Options must be an array'),
  body('correctAnswer').notEmpty().trim().withMessage('Correct answer is required'),
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

      const questionData = {
        milestoneId: req.params.id,
        type: req.body.type,
        question: req.body.question,
        explanation: req.body.explanation || null,
        options: req.body.options || [],
        correctAnswer: req.body.correctAnswer
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

      res.status(500).json({
        success: false,
        error: 'Failed to add question'
      })
    }
  }
)

export default router