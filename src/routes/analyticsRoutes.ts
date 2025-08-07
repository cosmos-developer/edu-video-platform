import { Router } from 'express'
import { query } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam, validateCUIDQuery } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
// import { roleMiddleware } from '../middleware/role' // TODO: Create this middleware
import { AnalyticsService } from '../services/AnalyticsService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/analytics/video/:videoId/stats - Get video analytics stats
router.get('/video/:videoId/stats',
  validateCUIDParam('videoId', 'Invalid video ID'),
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

      const stats = await AnalyticsService.getVideoStats(req.params.videoId, req.user!)

      res.json({
        success: true,
        data: stats
      })

    } catch (error: any) {
      console.error('Error fetching video stats:', error)
      
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

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch video statistics'
      })
    }
  }
)

// GET /api/analytics/video/:videoId/progress - Get video progress data
router.get('/video/:videoId/progress',
  validateCUIDParam('videoId', 'Invalid video ID'),
  query('timeRange').optional().isIn(['day', 'week', 'month', 'all']).withMessage('Invalid time range'),
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

      const timeRange = req.query.timeRange as string || 'week'
      const progressData = await AnalyticsService.getVideoProgressData(
        req.params.videoId, 
        timeRange,
        req.user!
      )

      res.json({
        success: true,
        data: progressData
      })

    } catch (error: any) {
      console.error('Error fetching video progress:', error)
      
      if (error.message === 'Video not found' || error.message === 'Access denied') {
        return res.status(error.message === 'Video not found' ? 404 : 403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch video progress data'
      })
    }
  }
)

// GET /api/analytics/student/:studentId/progress - Get student progress (teachers/admins only)
router.get('/student/:studentId/progress',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDParam('studentId', 'Invalid student ID'),
  validateCUIDQuery('videoGroupId', 'Invalid video group ID'),
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

      const videoGroupId = req.query.videoGroupId as string
      const progressData = await AnalyticsService.getStudentProgress(
        req.params.studentId,
        videoGroupId,
        req.user!
      )

      res.json({
        success: true,
        data: progressData
      })

    } catch (error: any) {
      console.error('Error fetching student progress:', error)
      
      if (error.message === 'Student not found' || error.message === 'Access denied') {
        return res.status(error.message === 'Student not found' ? 404 : 403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch student progress'
      })
    }
  }
)

// GET /api/analytics/lesson/:lessonId/overview - Get lesson analytics overview (teachers/admins only)
router.get('/lesson/:lessonId/overview',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  validateCUIDParam('lessonId', 'Invalid lesson ID'),
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

      const overview = await AnalyticsService.getLessonOverview(req.params.lessonId, req.user!)

      res.json({
        success: true,
        data: overview
      })

    } catch (error: any) {
      console.error('Error fetching lesson overview:', error)
      
      if (error.message === 'Lesson not found' || error.message === 'Access denied') {
        return res.status(error.message === 'Lesson not found' ? 404 : 403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch lesson overview'
      })
    }
  }
)

// GET /api/analytics/dashboard/teacher - Get teacher dashboard analytics
router.get('/dashboard/teacher',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Create this middleware
  async (req: AuthenticatedRequest, res) => {
    try {
      const dashboardData = await AnalyticsService.getTeacherDashboard(req.user!)

      res.json({
        success: true,
        data: dashboardData
      })

    } catch (error) {
      console.error('Error fetching teacher dashboard:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch teacher dashboard data'
      })
    }
  }
)

// GET /api/analytics/dashboard/student - Get student dashboard analytics
router.get('/dashboard/student',
  async (req: AuthenticatedRequest, res) => {
    try {
      const dashboardData = await AnalyticsService.getStudentDashboard(req.user!)

      res.json({
        success: true,
        data: dashboardData
      })

    } catch (error) {
      console.error('Error fetching student dashboard:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch student dashboard data'
      })
    }
  }
)

// GET /api/analytics/engagement/heatmap/:videoId - Get engagement heatmap for video
router.get('/engagement/heatmap/:videoId',
  validateCUIDParam('videoId', 'Invalid video ID'),
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

      const heatmapData = await AnalyticsService.getEngagementHeatmap(req.params.videoId, req.user!)

      res.json({
        success: true,
        data: heatmapData
      })

    } catch (error: any) {
      console.error('Error fetching engagement heatmap:', error)
      
      if (error.message === 'Video not found' || error.message === 'Access denied') {
        return res.status(error.message === 'Video not found' ? 404 : 403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch engagement heatmap'
      })
    }
  }
)

// GET /api/analytics/questions/:milestoneId/performance - Get question performance analytics
router.get('/questions/:milestoneId/performance',
  validateCUIDParam('milestoneId', 'Invalid milestone ID'),
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

      const performance = await AnalyticsService.getQuestionPerformance(req.params.milestoneId, req.user!)

      res.json({
        success: true,
        data: performance
      })

    } catch (error: any) {
      console.error('Error fetching question performance:', error)
      
      if (error.message === 'Milestone not found' || error.message === 'Access denied') {
        return res.status(error.message === 'Milestone not found' ? 404 : 403).json({
          success: false,
          error: error.message
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch question performance'
      })
    }
  }
)

export default router