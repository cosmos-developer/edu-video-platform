import { Router } from 'express'
import { body, query } from 'express-validator'
import { validationResult } from 'express-validator'
import { validateCUIDParam, validateCUIDBody } from '../utils/validators'
import { authenticate } from '../middleware/auth/authMiddleware'
// import { roleMiddleware } from '../middleware/role' // TODO: Create this middleware
import { VideoService } from '../services/VideoService'
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware'
import { uploadVideoMiddleware, handleUploadErrors } from '../middleware/upload/videoUploadMiddleware'
import { VideoProcessingService } from '../services/VideoProcessingService'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

const router = Router()

// Custom authentication middleware for video streaming that supports query params
const streamingAuthenticate = async (req: AuthenticatedRequest, res: any, next: any) => {
  // Try header authentication first
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      // Map userId to id for consistency with regular auth
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role
      }
      return next()
    } catch (error) {
      // Fall through to query param auth
    }
  }
  
  // Try query parameter authentication for video streaming
  const token = req.query.token as string
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      // Map userId to id for consistency with regular auth
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role
      }
      console.log('Streaming auth successful:', req.user)
      return next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      })
    }
  }
  
  // No valid authentication found
  return res.status(401).json({
    success: false,
    error: 'Authentication required'
  })
}

// Apply authentication middleware to all routes except streaming
router.use((req, res, next) => {
  // Skip authentication middleware for streaming endpoint
  if (req.path.match(/\/[^\/]+\/stream$/)) {
    return next()
  }
  return authenticate(req, res, next)
})

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
  validateCUIDParam('id', 'Invalid group ID'),
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
  validateCUIDBody('lessonId', 'Valid lesson ID is required'),
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
        description: req.body.description || null
      }

      const videoGroup = await VideoService.createVideoGroup(videoGroupData, req.body.lessonId)

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
  validateCUIDParam('id', 'Invalid group ID'),
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

// POST /api/videos/groups/:groupId/videos - Upload video to group (creator or admin only)
router.post('/groups/:groupId/videos',
  uploadVideoMiddleware, // Handle file upload first
  handleUploadErrors, // Handle upload errors
  validateCUIDParam('groupId', 'Invalid group ID'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
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

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Video file is required'
        })
      }

      const videoData = {
        title: req.body.title,
        description: req.body.description || null,
        videoGroupId: req.params.groupId,
        uploadedBy: req.user!.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.filename, // Store just the filename
        mimeType: req.file.mimetype
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
  validateCUIDParam('id', 'Invalid video ID'),
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

// PUT /api/videos/:id - Update video metadata (uploader or admin only)
router.put('/:id',
  validateCUIDParam('id', 'Invalid video ID'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
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
        description: req.body.description
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
  validateCUIDParam('id', 'Invalid video ID'),
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

// GET /api/videos/:id/stream - Stream video file (authenticated users with access)
router.get('/:id/stream',
  streamingAuthenticate, // Use custom auth middleware for streaming
  validateCUIDParam('id', 'Invalid video ID'),
  async (req: AuthenticatedRequest, res) => {
    // Set CORS headers specifically for video streaming
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3002');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const videoPath = await VideoService.getVideoStreamPath(req.params.id, req.user!.id)
      console.log('Video streaming request:', {
        videoId: req.params.id,
        userId: req.user!.id,
        videoPath
      })

      if (!videoPath) {
        console.error('Video not found in database or access denied')
        return res.status(404).json({
          success: false,
          error: 'Video not found or access denied'
        })
      }

      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        console.error('Video file not found on disk:', videoPath)
        return res.status(404).json({
          success: false,
          error: 'Video file not found'
        })
      }

      const stat = fs.statSync(videoPath)
      const fileSize = stat.size
      const range = req.headers.range

      if (range) {
        // Handle range requests for video streaming
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = (end - start) + 1
        const file = fs.createReadStream(videoPath, { start, end })

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4'
        }

        res.writeHead(206, head)
        file.pipe(res)
      } else {
        // Send entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': VideoProcessingService.getMimeType(videoPath)
        }

        res.writeHead(200, head)
        fs.createReadStream(videoPath).pipe(res)
      }

    } catch (error) {
      console.error('Error streaming video:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to stream video'
      })
    }
  }
)

// GET /api/videos/:id/thumbnail - Serve video thumbnail (authenticated users with access)
router.get('/:id/thumbnail',
  validateCUIDParam('id', 'Invalid video ID'),
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

      const thumbnailPath = await VideoService.getThumbnailStreamPath(req.params.id, req.user!.id)

      if (!thumbnailPath) {
        return res.status(404).json({
          success: false,
          error: 'Thumbnail not found or access denied'
        })
      }

      // Check if file exists
      if (!fs.existsSync(thumbnailPath)) {
        return res.status(404).json({
          success: false,
          error: 'Thumbnail file not found'
        })
      }

      // Send thumbnail file
      res.sendFile(path.resolve(thumbnailPath))

    } catch (error) {
      console.error('Error serving thumbnail:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to serve thumbnail'
      })
    }
  }
)

export default router