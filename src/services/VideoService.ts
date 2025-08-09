import { PrismaClient } from '@prisma/client'
import { User } from '../types/auth'
import { VideoProcessingService } from './VideoProcessingService'
import { getVideoFilePath, getThumbnailFilePath, deleteVideoFile, deleteThumbnailFile } from '../middleware/upload/videoUploadMiddleware'
import path from 'path'

const prisma = new PrismaClient()

interface CreateVideoGroupData {
  title: string
  description: string | null
  tags: string[]
  isPublic: boolean
  createdBy: string
}

interface UpdateVideoGroupData {
  title?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

interface CreateVideoData {
  title: string
  description: string | null
  videoGroupId: string
  // uploadedBy field removed - using uploadedAt timestamp instead
  // File upload data
  filename?: string
  originalName?: string
  filePath?: string
  mimeType?: string
}

interface UpdateVideoData {
  title?: string
  description?: string
  filename?: string
  filePath?: string
  mimeType?: string
  duration?: number
  thumbnailPath?: string
}

interface GetVideoGroupsOptions {
  page: number
  limit: number
  search: string
  userId: string
}

export class VideoService {
  static async getVideoGroups(options: GetVideoGroupsOptions) {
    const { page, limit, search, userId } = options
    const offset = (page - 1) * limit

    // Build where clause for search and access control
    const whereClause = {
      AND: [
        // Access control through lesson relationship
        {
          lesson: {
            OR: [
              { createdById: userId },
              {
                studentProgress: {
                  some: {
                    studentId: userId
                  }
                }
              }
            ]
          }
        },
        // Search filter
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as any } },
            { description: { contains: search, mode: 'insensitive' as any } }
          ]
        } : {}
      ]
    }

    const [videoGroups, total] = await Promise.all([
      prisma.videoGroup.findMany({
        where: whereClause,
        include: {
          videos: {
            orderBy: { order: 'asc' },
            include: {
              _count: {
                select: { milestones: true }
              }
            }
          },
          lesson: {
            select: {
              id: true,
              title: true,
              createdById: true
            }
          },
          _count: {
            select: { videos: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.videoGroup.count({ where: whereClause })
    ])

    return {
      videoGroups,
      total
    }
  }

  static async getVideoGroupById(groupId: string, userId: string) {
    try {
      const videoGroup = await prisma.videoGroup.findFirst({
        where: {
          id: groupId,
          lesson: {
            OR: [
              { createdById: userId },
              {
                studentProgress: {
                  some: {
                    studentId: userId
                  }
                }
              }
            ]
          }
        },
        include: {
          videos: {
            orderBy: { order: 'asc' },
            include: {
              // Include milestones with their questions
              milestones: {
                orderBy: { timestamp: 'asc' },
                include: {
                  questions: {
                    orderBy: { createdAt: 'asc' }
                  },
                  _count: {
                    select: { questions: true }
                  }
                }
              },
              _count: {
                select: { 
                  milestones: true,
                  studentSessions: true 
                }
              }
            }
          },
          lesson: {
            select: {
              id: true,
              title: true,
              createdById: true
            }
          },
          _count: {
            select: { videos: true }
          }
        }
      })

      return videoGroup
    } catch (error: any) {
      console.error('Error in getVideoGroupById:', error)
      throw new Error(`Failed to fetch video group: ${error.message}`)
    }
  }

  static async createVideoGroup(data: CreateVideoGroupData, lessonId: string) {
    // Get the next order number for this lesson
    const maxOrder = await prisma.videoGroup.aggregate({
      where: { lessonId },
      _max: { order: true }
    })

    const nextOrder = (maxOrder._max.order || 0) + 1

    const videoGroup = await prisma.videoGroup.create({
      data: {
        title: data.title,
        description: data.description,
        lessonId,
        order: nextOrder
      },
      include: {
        videos: {
          orderBy: { order: 'asc' }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: { videos: true }
        }
      }
    })

    return videoGroup
  }

  static async updateVideoGroup(groupId: string, data: UpdateVideoGroupData, user: User) {
    // Check if video group exists and user has permission
    const existingGroup = await prisma.videoGroup.findUnique({
      where: { id: groupId },
      include: {
        lesson: true
      }
    })

    if (!existingGroup) {
      throw new Error('Video group not found')
    }

    // Check permissions - only lesson creator or admin can update
    if (existingGroup.lesson.createdById !== user.id && user.role !== 'ADMIN') {
      throw new Error('Access denied')
    }

    // Filter out undefined values
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description

    const videoGroup = await prisma.videoGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        videos: {
          orderBy: { order: 'asc' }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: { videos: true }
        }
      }
    })

    return videoGroup
  }

  static async createVideo(data: CreateVideoData, user: User) {
    try {
      // Check if video group exists and user has permission
      const videoGroup = await prisma.videoGroup.findUnique({
        where: { id: data.videoGroupId },
        include: {
          lesson: true
        }
      })

      if (!videoGroup) {
        throw new Error('Video group not found')
      }

      // Check permissions - only lesson creator or admin can add videos
      if (videoGroup.lesson.createdById !== user.id && user.role !== 'ADMIN') {
        throw new Error('Access denied')
      }

      // Get the next order number
      const maxOrder = await prisma.video.aggregate({
        where: { videoGroupId: data.videoGroupId },
        _max: { order: true }
      })

      const nextOrder = (maxOrder._max.order || 0) + 1

      // Process video to extract metadata
      let duration: number | null = null
      let size: number | null = null
      let thumbnailPath: string | null = null

      if (data.filePath) {
        try {
          console.log('📹 Processing video metadata for:', data.filePath)
          
          // Get full file path for processing
          const fullVideoPath = getVideoFilePath(data.filePath)
          console.log('📂 Full video path:', fullVideoPath)
          
          // Extract video metadata (duration, dimensions, etc.)
          const metadata = await VideoProcessingService.getVideoMetadata(fullVideoPath)
          duration = metadata.duration
          console.log('📊 Extracted video duration:', duration)
          
          // Get file size
          size = await VideoProcessingService.getFileSize(fullVideoPath)
          console.log('📏 Extracted video size:', size)
          
          // Generate thumbnail (optional - don't fail if this doesn't work)
          if (data.originalName || data.filename) {
            thumbnailPath = await VideoProcessingService.generateThumbnail(fullVideoPath, data.originalName || data.filename)
            console.log('🖼️ Generated thumbnail:', thumbnailPath)
          }
        } catch (processingError) {
          console.warn('⚠️ Video processing failed, creating video without metadata:', processingError)
          // Continue without metadata rather than failing completely
        }
      }

      // Create video with extracted metadata
      const video = await prisma.video.create({
        data: {
          title: data.title,
          description: data.description,
          videoGroupId: data.videoGroupId,
          order: nextOrder,
          filePath: data.filePath,
          fileName: data.originalName || data.filename,
          mimeType: data.mimeType,
          duration: duration,
          size: size,
          thumbnailPath: thumbnailPath,
          uploadedAt: new Date(),
          processedAt: duration ? new Date() : null, // Mark as processed if we got metadata
          processingStatus: duration ? 'COMPLETED' : 'FAILED',
          status: 'READY'
        }
      })

      console.log('✅ Video created successfully with metadata:', {
        id: video.id,
        duration: video.duration,
        size: video.size,
        processingStatus: video.processingStatus
      })

      return video

    } catch (error: any) {
      console.error('Error in createVideo:', error)
      
      // Re-throw known errors
      if (error.message === 'Video group not found' || error.message === 'Access denied') {
        throw error
      }
      
      // Handle Prisma errors
      if (error.code && error.code.startsWith('P')) {
        throw new Error(`Database error: ${error.message}`)
      }
      
      // Other errors
      throw new Error(`Failed to create video: ${error.message}`)
    }
  }

  /**
   * Process existing video to extract missing metadata
   */
  static async processVideoMetadata(videoId: string) {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      })

      if (!video) {
        throw new Error('Video not found')
      }

      if (!video.filePath) {
        throw new Error('Video file path not found')
      }

      console.log('📹 Processing existing video metadata for:', video.id)

      // Get full file path using the helper function
      const fullVideoPath = getVideoFilePath(video.filePath)
      console.log('📂 Full video path:', fullVideoPath)

      // Extract video metadata
      const metadata = await VideoProcessingService.getVideoMetadata(fullVideoPath)
      const size = await VideoProcessingService.getFileSize(fullVideoPath)
      
      // Generate thumbnail if missing
      let thumbnailPath = video.thumbnailPath
      if (!thumbnailPath && video.fileName) {
        thumbnailPath = await VideoProcessingService.generateThumbnail(fullVideoPath, video.fileName)
      }

      // Update video with extracted metadata
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          duration: metadata.duration,
          size: size,
          thumbnailPath: thumbnailPath,
          processedAt: new Date(),
          processingStatus: metadata.duration ? 'COMPLETED' : 'FAILED',
          metadata: {
            width: metadata.width,
            height: metadata.height,
            bitrate: metadata.bitrate,
            fps: metadata.fps,
            codec: metadata.codec
          }
        }
      })

      console.log('✅ Video metadata processed successfully:', {
        id: updatedVideo.id,
        duration: updatedVideo.duration,
        size: updatedVideo.size,
        processingStatus: updatedVideo.processingStatus
      })

      return updatedVideo

    } catch (error: any) {
      console.error('Error processing video metadata:', error)
      
      // Update processing status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: 'FAILED',
          processedAt: new Date()
        }
      }).catch(() => {}) // Ignore update errors
      
      throw error
    }
  }

  static async getVideoById(videoId: string, userId: string) {
    try {
      const video = await prisma.video.findFirst({
        where: {
          id: videoId,
          videoGroup: {
            lesson: {
              OR: [
                { createdById: userId },
                {
                  studentProgress: {
                    some: {
                      studentId: userId
                    }
                  }
                }
              ]
            }
          }
        },
        include: {
          // Include milestones with their questions
          milestones: {
            orderBy: { timestamp: 'asc' },
            include: {
              questions: {
                orderBy: { createdAt: 'asc' }
              },
              _count: {
                select: { questions: true }
              }
            }
          },
          videoGroup: {
            select: {
              id: true,
              title: true,
              description: true
            }
          },
          _count: {
            select: { 
              milestones: true,
              studentSessions: true 
            }
          }
        }
      })

      return video
    } catch (error: any) {
      console.error('Error in getVideoById:', error)
      throw new Error(`Failed to fetch video: ${error.message}`)
    }
  }

  static async updateVideo(videoId: string, data: UpdateVideoData, user: User) {
    try {
      // Check if video exists and user has permission
      const existingVideo = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          videoGroup: {
            include: {
              lesson: true
            }
          }
        }
      })

      if (!existingVideo) {
        throw new Error('Video not found')
      }

      // Check permissions - only lesson creator or admin can update
      if (
        existingVideo.videoGroup.lesson.createdById !== user.id && 
        user.role !== 'ADMIN'
      ) {
        throw new Error('Access denied')
      }

      // Filter out undefined values
      const updateData: any = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.filePath !== undefined) updateData.filePath = data.filePath
      if (data.mimeType !== undefined) updateData.mimeType = data.mimeType
      if (data.duration !== undefined) updateData.duration = data.duration
      if (data.thumbnailPath !== undefined) updateData.thumbnailPath = data.thumbnailPath

      const video = await prisma.video.update({
        where: { id: videoId },
        data: updateData,
        include: {
          // Include milestones with their questions
          milestones: {
            orderBy: { timestamp: 'asc' },
            include: {
              questions: {
                orderBy: { createdAt: 'asc' }
              },
              _count: {
                select: { questions: true }
              }
            }
          },
          videoGroup: {
            select: {
              id: true,
              title: true,
              description: true
            }
          },
          _count: {
            select: { 
              milestones: true,
              studentSessions: true 
            }
          }
        }
      })

      return video
    } catch (error: any) {
      console.error('Error in updateVideo:', error)
      
      // Re-throw known errors
      if (error.message === 'Video not found' || error.message === 'Access denied') {
        throw error
      }
      
      // Handle Prisma errors
      if (error.code && error.code.startsWith('P')) {
        throw new Error(`Database error: ${error.message}`)
      }
      
      // Other errors
      throw new Error(`Failed to update video: ${error.message}`)
    }
  }

  static async deleteVideo(videoId: string, user: User) {
    // Check if video exists and user has permission
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        videoGroup: {
          include: {
            lesson: true
          }
        }
      }
    })

    if (!existingVideo) {
      throw new Error('Video not found')
    }

    // Check permissions - only lesson creator or admin can delete
    if (
      existingVideo.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Delete associated files before deleting from database
    if (existingVideo.fileName) {
      await deleteVideoFile(existingVideo.fileName)
    }
    
    if (existingVideo.thumbnailPath) {
      await deleteThumbnailFile(existingVideo.thumbnailPath)
    }

    await prisma.video.delete({
      where: { id: videoId }
    })

    return true
  }

  /**
   * Get video file serving path for streaming
   */
  static async getVideoStreamPath(videoId: string, userId: string): Promise<string | null> {
    const video = await this.getVideoById(videoId, userId)
    
    if (!video || !video.filePath) {
      return null
    }

    return getVideoFilePath(video.filePath)
  }

  /**
   * Get thumbnail serving path
   */
  static async getThumbnailStreamPath(videoId: string, userId: string): Promise<string | null> {
    const video = await this.getVideoById(videoId, userId)
    
    if (!video || !video.thumbnailPath) {
      return null
    }

    return getThumbnailFilePath(video.thumbnailPath)
  }
}