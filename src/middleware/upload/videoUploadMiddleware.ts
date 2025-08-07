import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Supported video formats
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv',
  'video/webm'
]

// Maximum file size (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024

// Video upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'videos')
const THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails')

// Ensure upload directories exist
const ensureUploadDirectories = async () => {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
  
  try {
    await fs.access(THUMBNAIL_DIR)
  } catch {
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true })
  }
}

// Initialize directories on module load
ensureUploadDirectories().catch(console.error)

// Multer storage configuration for videos
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureUploadDirectories()
      cb(null, UPLOAD_DIR)
    } catch (error) {
      cb(error as Error | null, '')
    }
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = uuidv4()
    const fileExtension = path.extname(file.originalname)
    const fileName = `${uniqueSuffix}${fileExtension}`
    cb(null, fileName)
  }
})

// File filter for videos only
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (SUPPORTED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type. Supported types: ${SUPPORTED_VIDEO_TYPES.join(', ')}`))
  }
}

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one video file at a time
  }
})

// Middleware for single video upload
export const uploadVideoMiddleware = upload.single('video')

// Middleware for handling multer errors
export const handleUploadErrors = (error: any, _req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 500MB.'
        })
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected field name. Use "video" field for video upload.'
        })
      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${error.message}`
        })
    }
  }
  
  if (error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    })
  }
  
  next(error)
}

// Utility function to get video file path
export const getVideoFilePath = (filename: string): string => {
  return path.join(UPLOAD_DIR, filename)
}

// Utility function to get thumbnail file path
export const getThumbnailFilePath = (filename: string): string => {
  return path.join(THUMBNAIL_DIR, filename)
}

// Utility function to delete video file
export const deleteVideoFile = async (filename: string): Promise<void> => {
  try {
    const filePath = getVideoFilePath(filename)
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Error deleting video file:', error)
  }
}

// Utility function to delete thumbnail file
export const deleteThumbnailFile = async (filename: string): Promise<void> => {
  try {
    const filePath = getThumbnailFilePath(filename)
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Error deleting thumbnail file:', error)
  }
}

export { UPLOAD_DIR, THUMBNAIL_DIR, SUPPORTED_VIDEO_TYPES, MAX_FILE_SIZE }