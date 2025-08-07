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
            milestones: {
              orderBy: { timestamp: 'asc' },
              include: {
                questions: {
                  include: {
                    question: true
                  }
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
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    return videoGroup
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

    // Process video file if provided
    let videoMetadata = null
    let thumbnailPath = null
    let fileSize: bigint = BigInt(0)

    if (data.filename && data.filePath) {
      const fullPath = getVideoFilePath(data.filename)
      
      // Validate file exists
      const fileExists = await VideoProcessingService.validateVideoFile(fullPath)
      if (!fileExists) {
        throw new Error('Video file not found after upload')
      }

      // Get file size
      const size = await VideoProcessingService.getFileSize(fullPath)
      fileSize = BigInt(size)

      // Get video metadata
      videoMetadata = await VideoProcessingService.getVideoMetadata(fullPath)

      // Generate thumbnail
      const thumbnailFilename = await VideoProcessingService.generateThumbnail(fullPath, data.filename)
      if (thumbnailFilename) {
        thumbnailPath = thumbnailFilename
      }
    }

    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        filePath: data.filePath || null,
        fileName: data.originalName || data.filename || null,
        duration: videoMetadata?.duration ? Math.round(videoMetadata.duration) : null,
        size: fileSize || null,
        mimeType: data.mimeType || null,
        thumbnailPath: thumbnailPath,
        metadata: videoMetadata ? {
          width: videoMetadata.width,
          height: videoMetadata.height,
          bitrate: videoMetadata.bitrate,
          fps: videoMetadata.fps,
          codec: videoMetadata.codec
        } : undefined,
        videoGroupId: data.videoGroupId,
        uploadedAt: new Date(),
        order: nextOrder,
        status: 'READY' // Set to READY for local files
      },
      include: {
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                question: true
              }
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
    })

    return video
  }

  static async getVideoById(videoId: string, userId: string) {
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
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                question: true
              }
            }
          }
        },
        videoGroup: {
          include: {
            lesson: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
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
    })

    return video
  }

  static async updateVideo(videoId: string, data: UpdateVideoData, user: User) {
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
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                question: true
              }
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
    
    if (!video || !video.fileName) {
      return null
    }

    return getVideoFilePath(video.fileName)
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