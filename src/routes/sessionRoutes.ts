import { Router, Response } from 'express'
import { body, query } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam, validateCUIDBody } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
import { VideoSessionService } from '../services/VideoSessionService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// POST /api/sessions/start - Start or resume video session
router.post('/start',
  validateCUIDBody('videoId', 'Valid video ID is required'),
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

      const session = await VideoSessionService.startSession(
        req.body.videoId,
        req.user!.id
      )

      res.json({
        success: true,
        data: session,
        message: 'Video session started'
      })

    } catch (error: any) {
      console.error('Error starting session:', error)
      
      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to start video session'
      })
    }
  }
)

// PUT /api/sessions/:sessionId/progress - Update session progress
router.put('/:sessionId/progress',
  validateCUIDParam('sessionId', 'Invalid session ID'),
  body('currentTime').isNumeric().withMessage('Current time must be a number'),
  body('totalWatchTime').optional().isNumeric().withMessage('Total watch time must be a number'),
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

      const progressData = {
        currentPosition: Math.floor(Number(req.body.currentTime)),
        totalWatchTime: req.body.totalWatchTime ? Math.floor(Number(req.body.totalWatchTime)) : undefined
      }

      const session = await VideoSessionService.updateProgress(
        req.params.sessionId,
        progressData,
        req.user!.id
      )

      res.json({
        success: true,
        data: session,
        message: 'Progress updated'
      })

    } catch (error: any) {
      console.error('Error updating progress:', error)
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
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
        error: 'Failed to update progress'
      })
    }
  }
)

// POST /api/sessions/:sessionId/milestone - Mark milestone as reached
router.post('/:sessionId/milestone',
  validateCUIDParam('sessionId', 'Invalid session ID'),
  validateCUIDBody('milestoneId', 'Valid milestone ID is required'),
  body('timestamp').isNumeric().withMessage('Timestamp must be a number'),
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

      const result = await VideoSessionService.markMilestoneReached(
        req.params.sessionId,
        req.body.milestoneId,
        Math.floor(Number(req.body.timestamp)),
        req.user!.id
      )

      res.json({
        success: true,
        data: result,
        message: 'Milestone marked as reached'
      })

    } catch (error: any) {
      console.error('Error marking milestone:', error)
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        })
      }

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
        error: 'Failed to mark milestone'
      })
    }
  }
)

// POST /api/sessions/:sessionId/question - Submit question answer
router.post('/:sessionId/question',
  validateCUIDParam('sessionId', 'Invalid session ID'),
  validateCUIDBody('questionId', 'Valid question ID is required'),
  body('answer').notEmpty().trim().withMessage('Answer is required'),
  validateCUIDBody('milestoneId', 'Valid milestone ID is required'),
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

      const answerData = {
        questionId: req.body.questionId,
        answer: req.body.answer,
        milestoneId: req.body.milestoneId
      }

      const result = await VideoSessionService.submitAnswer(
        req.params.sessionId,
        answerData,
        req.user!.id
      )

      res.json({
        success: true,
        data: result,
        message: 'Answer submitted successfully'
      })

    } catch (error: any) {
      console.error('Error submitting answer:', error)
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        })
      }

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
        error: 'Failed to submit answer'
      })
    }
  }
)

// PUT /api/sessions/:sessionId/complete - Mark session as completed
router.put('/:sessionId/complete',
  validateCUIDParam('sessionId', 'Invalid session ID'),
  body('finalTime').isNumeric().withMessage('Final time must be a number'),
  body('totalWatchTime').isNumeric().withMessage('Total watch time must be a number'),
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

      const completionData = {
        finalTime: Math.floor(Number(req.body.finalTime)),
        totalWatchTime: Math.floor(Number(req.body.totalWatchTime))
      }

      const session = await VideoSessionService.completeSession(
        req.params.sessionId,
        completionData,
        req.user!.id
      )

      res.json({
        success: true,
        data: session,
        message: 'Session completed successfully'
      })

    } catch (error: any) {
      console.error('Error completing session:', error)
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
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
        error: 'Failed to complete session'
      })
    }
  }
)

// GET /api/sessions/video/:videoId - Get user's session for a specific video
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

      const session = await VideoSessionService.getSessionByVideo(
        req.params.videoId,
        req.user!.id
      )

      res.json({
        success: true,
        data: session
      })

    } catch (error: any) {
      console.error('Error fetching session:', error)
      
      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch session'
      })
    }
  }
)

// GET /api/sessions/user - Get user's video sessions (paginated)
router.get('/user',
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED']).withMessage('Invalid status'),
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

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const status = req.query.status as string

      const result = await VideoSessionService.getUserSessions({
        studentId: req.user!.id,
        page,
        limit,
        status
      })

      res.json({
        success: true,
        data: result.sessions,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching user sessions:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions'
      })
    }
  }
)

export default router