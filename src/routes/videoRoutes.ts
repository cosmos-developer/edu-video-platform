import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth/authMiddleware'
// import { roleMiddleware } from '../middleware/role' // TODO: Create this middleware
import { VideoService } from '../services/VideoService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/videos - Get all video groups with videos (paginated)
router.get('/', 
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim().withMessage('Search must be a string'),
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

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const search = req.query.search as string || ''

      const result = await VideoService.getVideoGroups({
        page,
        limit,
        search,
        userId: req.user!.id
      })

      res.json({
        success: true,
        data: result.videoGroups,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching video groups:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video groups'
      })
    }
  }
)

// GET /api/videos/groups/:id - Get specific video group with videos
router.get('/groups/:id',
  param('id').isUUID().withMessage('Invalid group ID'),
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

      const videoGroup = await VideoService.getVideoGroupById(req.params.id, req.user!.id)

      if (!videoGroup) {
        return res.status(404).json({
          success: false,
          error: 'Video group not found'
        })
      }

      res.json({
        success: true,
        data: videoGroup
      })

    } catch (error) {
      console.error('Error fetching video group:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video group'
      })
    }
  }
)

// POST /api/videos/groups - Create new video group (teachers only)
router.post('/groups',
  // roleMiddleware(['TEACHER', 'ADMIN']), // TODO: Implement role middleware
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
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

      const videoGroupData = {
        title: req.body.title,
        description: req.body.description || null,
        tags: req.body.tags || [],
        isPublic: req.body.isPublic ?? true,
        createdBy: req.user!.id
      }

      const videoGroup = await VideoService.createVideoGroup(videoGroupData)

      res.status(201).json({
        success: true,
        data: videoGroup,
        message: 'Video group created successfully'
      })

    } catch (error) {
      console.error('Error creating video group:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create video group'
      })
    }
  }
)

// PUT /api/videos/groups/:id - Update video group (creator or admin only)
router.put('/groups/:id',
  param('id').isUUID().withMessage('Invalid group ID'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
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
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        isPublic: req.body.isPublic
      }

      const videoGroup = await VideoService.updateVideoGroup(
        req.params.id,
        updateData,
        req.user!
      )

      res.json({
        success: true,
        data: videoGroup,
        message: 'Video group updated successfully'
      })

    } catch (error: any) {
      console.error('Error updating video group:', error)
      
      if (error.message === 'Video group not found') {
        return res.status(404).json({
          success: false,
          error: 'Video group not found'
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
        error: 'Failed to update video group'
      })
    }
  }
)

// POST /api/videos/groups/:groupId/videos - Add video to group (creator or admin only)
router.post('/groups/:groupId/videos',
  param('groupId').isUUID().withMessage('Invalid group ID'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('videoUrl').isURL().withMessage('Valid video URL is required'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('thumbnailUrl').optional().isURL().withMessage('Invalid thumbnail URL'),
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

      const videoData = {
        title: req.body.title,
        description: req.body.description || null,
        videoUrl: req.body.videoUrl,
        duration: req.body.duration || null,
        thumbnailUrl: req.body.thumbnailUrl || null,
        videoGroupId: req.params.groupId,
        uploadedBy: req.user!.id
      }

      const video = await VideoService.createVideo(videoData, req.user!)

      res.status(201).json({
        success: true,
        data: video,
        message: 'Video added successfully'
      })

    } catch (error: any) {
      console.error('Error creating video:', error)
      
      if (error.message === 'Video group not found') {
        return res.status(404).json({
          success: false,
          error: 'Video group not found'
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
        error: 'Failed to create video'
      })
    }
  }
)

// GET /api/videos/:id - Get specific video with milestones
router.get('/:id',
  param('id').isUUID().withMessage('Invalid video ID'),
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

      const video = await VideoService.getVideoById(req.params.id, req.user!.id)

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        })
      }

      res.json({
        success: true,
        data: video
      })

    } catch (error) {
      console.error('Error fetching video:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video'
      })
    }
  }
)

// PUT /api/videos/:id - Update video (uploader or admin only)
router.put('/:id',
  param('id').isUUID().withMessage('Invalid video ID'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('videoUrl').optional().isURL().withMessage('Invalid video URL'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('thumbnailUrl').optional().isURL().withMessage('Invalid thumbnail URL'),
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
        title: req.body.title,
        description: req.body.description,
        videoUrl: req.body.videoUrl,
        duration: req.body.duration,
        thumbnailUrl: req.body.thumbnailUrl
      }

      const video = await VideoService.updateVideo(
        req.params.id,
        updateData,
        req.user!
      )

      res.json({
        success: true,
        data: video,
        message: 'Video updated successfully'
      })

    } catch (error: any) {
      console.error('Error updating video:', error)
      
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

      res.status(500).json({
        success: false,
        error: 'Failed to update video'
      })
    }
  }
)

// DELETE /api/videos/:id - Delete video (uploader or admin only)
router.delete('/:id',
  param('id').isUUID().withMessage('Invalid video ID'),
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

      await VideoService.deleteVideo(req.params.id, req.user!)

      res.json({
        success: true,
        message: 'Video deleted successfully'
      })

    } catch (error: any) {
      console.error('Error deleting video:', error)
      
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

      res.status(500).json({
        success: false,
        error: 'Failed to delete video'
      })
    }
  }
)

export default router