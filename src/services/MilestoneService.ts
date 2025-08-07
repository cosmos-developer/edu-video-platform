import { PrismaClient } from '@prisma/client'
import { User } from '../types/auth'

const prisma = new PrismaClient()

interface CreateMilestoneData {
  videoId: string
  timestamp: number
  title: string
  description: string | null
  isRequired?: boolean
  retryLimit?: number
}

interface UpdateMilestoneData {
  timestamp?: number
  title?: string
  description?: string
  isRequired?: boolean
  retryLimit?: number
}

interface CreateQuestionData {
  milestoneId: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK'
  text: string
  explanation: string | null
  hints?: string[]
  difficulty?: string
  questionData: any // Flexible JSON data for different question types
  points?: number
  passThreshold?: number
}

export class MilestoneService {
  static async createMilestone(data: CreateMilestoneData, user: User) {
    // Check if video exists and user has permission
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
      include: {
        videoGroup: {
          include: {
            lesson: true
          }
        }
      }
    })

    if (!video) {
      throw new Error('Video not found')
    }

    // Check permissions - only video uploader, lesson creator, or admin can create milestones
    if (
      video.uploadedBy !== user.id && 
      video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Check if milestone already exists at this timestamp
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        videoId: data.videoId,
        timestamp: data.timestamp
      }
    })

    if (existingMilestone) {
      throw new Error(`Milestone already exists at timestamp ${data.timestamp}`)
    }

    // Get the next order number for this video
    const maxOrder = await prisma.milestone.aggregate({
      where: { videoId: data.videoId },
      _max: { order: true }
    })

    const nextOrder = (maxOrder._max.order || 0) + 1

    const milestone = await prisma.milestone.create({
      data: {
        videoId: data.videoId,
        timestamp: data.timestamp,
        title: data.title,
        description: data.description,
        order: nextOrder,
        isRequired: data.isRequired ?? true,
        retryLimit: data.retryLimit ?? 3
      },
      include: {
        questions: {
          include: {
            questionData: true
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    })

    return milestone
  }

  static async getMilestonesByVideo(videoId: string, userId: string) {
    // Check if user has access to video
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
      }
    })

    if (!video) {
      throw new Error('Video not found')
    }

    const milestones = await prisma.milestone.findMany({
      where: { videoId },
      include: {
        questions: {
          include: {
            questionData: true
          }
        },
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    return milestones
  }

  static async updateMilestone(milestoneId: string, data: UpdateMilestoneData, user: User) {
    // Check if milestone exists and user has permission
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        video: {
          include: {
            videoGroup: {
              include: {
                lesson: true
              }
            }
          }
        }
      }
    })

    if (!existingMilestone) {
      throw new Error('Milestone not found')
    }

    // Check permissions - only video uploader, lesson creator, or admin can update milestones
    if (
      existingMilestone.video.uploadedBy !== user.id && 
      existingMilestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // If updating timestamp, check for conflicts
    if (data.timestamp !== undefined && data.timestamp !== existingMilestone.timestamp) {
      const conflictingMilestone = await prisma.milestone.findFirst({
        where: {
          videoId: existingMilestone.videoId,
          timestamp: data.timestamp,
          id: { not: milestoneId }
        }
      })

      if (conflictingMilestone) {
        throw new Error(`Milestone already exists at timestamp ${data.timestamp}`)
      }
    }

    // Filter out undefined values
    const updateData: any = {}
    if (data.timestamp !== undefined) updateData.timestamp = data.timestamp
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired
    if (data.retryLimit !== undefined) updateData.retryLimit = data.retryLimit

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        questions: {
          include: {
            questionData: true
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    })

    return milestone
  }

  static async deleteMilestone(milestoneId: string, user: User) {
    // Check if milestone exists and user has permission
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        video: {
          include: {
            videoGroup: true
          }
        }
      }
    })

    if (!existingMilestone) {
      throw new Error('Milestone not found')
    }

    // Check permissions - only video uploader, lesson creator, or admin can delete milestones
    if (
      existingMilestone.video.uploadedBy !== user.id && 
      existingMilestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    await prisma.milestone.delete({
      where: { id: milestoneId }
    })

    return true
  }

  static async addQuestionToMilestone(data: CreateQuestionData, user: User) {
    // Check if milestone exists and user has permission
    const milestone = await prisma.milestone.findUnique({
      where: { id: data.milestoneId },
      include: {
        video: {
          include: {
            videoGroup: {
              include: {
                lesson: true
              }
            }
          }
        }
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // Check permissions - only video uploader, lesson creator, or admin can add questions
    if (
      milestone.video.uploadedBy !== user.id && 
      milestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        milestoneId: data.milestoneId,
        type: data.type,
        text: data.text,
        explanation: data.explanation || null,
        hints: data.hints || [],
        difficulty: data.difficulty || null,
        questionData: data.questionData,
        points: data.points || 1,
        passThreshold: data.passThreshold || 0.7,
        createdById: user.id,
        status: 'DRAFT' // Default to draft status for manual creation
      },
      include: {
        questionData: true
      }
    })

    return question
  }
}