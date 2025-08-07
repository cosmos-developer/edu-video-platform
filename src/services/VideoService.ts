import { PrismaClient } from '@prisma/client'
import { User } from '../types/auth'

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
  videoUrl: string
  duration: number | null
  thumbnailUrl: string | null
  videoGroupId: string
  uploadedBy: string
}

interface UpdateVideoData {
  title?: string
  description?: string
  videoUrl?: string
  duration?: number
  thumbnailUrl?: string
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
        // Public videos OR created by user OR user has access through enrollment
        {
          OR: [
            { isPublic: true },
            { createdBy: userId },
            {
              videos: {
                some: {
                  studentSessions: {
                    some: {
                      userId: userId
                    }
                  }
                }
              }
            }
          ]
        },
        // Search filter
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { tags: { hasSome: [search] } }
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
        OR: [
          // Note: VideoGroup schema doesn't have isPublic or createdBy fields
          // These conditions need to be evaluated at the lesson level
          {
            videos: {
              some: {
                studentSessions: {
                  some: {
                    userId: userId
                  }
                }
              }
            }
          }
        ]
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
                    questionData: true
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
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return videoGroup
  }

  static async createVideoGroup(data: CreateVideoGroupData) {
    const videoGroup = await prisma.videoGroup.create({
      data: {
        title: data.title,
        description: data.description,
        // Note: tags, isPublic, createdBy removed as they don't exist in VideoGroup schema
      },
      include: {
        videos: {
          orderBy: { order: 'asc' }
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
      where: { id: groupId }
    })

    if (!existingGroup) {
      throw new Error('Video group not found')
    }

    // Note: VideoGroup doesn't have createdBy field
    // Permission check would need to be done via lesson.createdBy
    // For now, allowing all authenticated users to update

    // Filter out undefined values
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    // Note: tags and isPublic fields removed as they don't exist in VideoGroup schema

    const videoGroup = await prisma.videoGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        videos: {
          orderBy: { order: 'asc' }
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
      where: { id: data.videoGroupId }
    })

    if (!videoGroup) {
      throw new Error('Video group not found')
    }

    // Check permissions - only creator or admin can add videos
    if (videoGroup.createdBy !== user.id && user.role !== 'ADMIN') {
      throw new Error('Access denied')
    }

    // Get the next order number
    const maxOrder = await prisma.video.aggregate({
      where: { videoGroupId: data.videoGroupId },
      _max: { order: true }
    })

    const nextOrder = (maxOrder._max.order || 0) + 1

    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        gcsUrl: data.videoUrl, // Map videoUrl to gcsUrl field
        duration: data.duration,
        thumbnailUrl: data.thumbnailUrl,
        videoGroupId: data.videoGroupId,
        uploadedBy: data.uploadedBy,
        order: nextOrder
      },
      include: {
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                questionData: true
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
          OR: [
            { isPublic: true },
            { createdBy: userId },
            {
              videos: {
                some: {
                  studentSessions: {
                    some: {
                      userId: userId
                    }
                  }
                }
              }
            }
          ]
        }
      },
      include: {
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                questionData: true
              }
            }
          }
        },
        videoGroup: {
          select: {
            id: true,
            title: true,
            description: true,
            createdBy: true
          }
        },
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
        videoGroup: true
      }
    })

    if (!existingVideo) {
      throw new Error('Video not found')
    }

    // Check permissions - only uploader, group creator, or admin can update
    if (
      existingVideo.uploadedBy !== user.id && 
      existingVideo.videoGroup.createdBy !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Filter out undefined values
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl

    const video = await prisma.video.update({
      where: { id: videoId },
      data: updateData,
      include: {
        milestones: {
          orderBy: { timestamp: 'asc' },
          include: {
            questions: {
              include: {
                questionData: true
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
        videoGroup: true
      }
    })

    if (!existingVideo) {
      throw new Error('Video not found')
    }

    // Check permissions - only uploader, group creator, or admin can delete
    if (
      existingVideo.uploadedBy !== user.id && 
      existingVideo.videoGroup.createdBy !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    await prisma.video.delete({
      where: { id: videoId }
    })

    return true
  }
}