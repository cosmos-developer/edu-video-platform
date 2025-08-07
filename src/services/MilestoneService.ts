import { PrismaClient } from '@prisma/client'
import { User } from '../types/auth'

const prisma = new PrismaClient()

interface CreateMilestoneData {
  videoId: string
  timestamp: number
  title: string
  description: string | null
  type: 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
}

interface UpdateMilestoneData {
  timestamp?: number
  title?: string
  description?: string
  type?: 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
}

interface CreateQuestionData {
  milestoneId: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  question: string
  explanation: string | null
  options: string[]
  correctAnswer: string
}

export class MilestoneService {
  static async createMilestone(data: CreateMilestoneData, user: User) {
    // Check if video exists and user has permission
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
      include: {
        videoGroup: true
      }
    })

    if (!video) {
      throw new Error('Video not found')
    }

    // Check permissions - only video uploader, group creator, or admin can create milestones
    if (
      video.uploadedBy !== user.id && 
      video.videoGroup.createdBy !== user.id && 
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

    const milestone = await prisma.milestone.create({
      data: {
        videoId: data.videoId,
        timestamp: data.timestamp,
        title: data.title,
        description: data.description,
        type: data.type
      },
      include: {
        questions: {
          include: {
            options: true
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
            options: true
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
            videoGroup: true
          }
        }
      }
    })

    if (!existingMilestone) {
      throw new Error('Milestone not found')
    }

    // Check permissions - only video uploader, group creator, or admin can update milestones
    if (
      existingMilestone.video.uploadedBy !== user.id && 
      existingMilestone.video.videoGroup.createdBy !== user.id && 
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
    if (data.type !== undefined) updateData.type = data.type

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        questions: {
          include: {
            options: true
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

    // Check permissions - only video uploader, group creator, or admin can delete milestones
    if (
      existingMilestone.video.uploadedBy !== user.id && 
      existingMilestone.video.videoGroup.createdBy !== user.id && 
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
            videoGroup: true
          }
        }
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // Check permissions - only video uploader, group creator, or admin can add questions
    if (
      milestone.video.uploadedBy !== user.id && 
      milestone.video.videoGroup.createdBy !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Create question with transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the question
      const question = await tx.question.create({
        data: {
          milestoneId: data.milestoneId,
          type: data.type,
          question: data.question,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        }
      })

      // Create options for multiple choice questions
      if (data.type === 'MULTIPLE_CHOICE' && data.options.length > 0) {
        const optionData = data.options.map((option, index) => ({
          questionId: question.id,
          text: option,
          isCorrect: option === data.correctAnswer,
          order: index + 1
        }))

        await tx.questionOption.createMany({
          data: optionData
        })
      }

      // Return question with options
      return await tx.question.findUnique({
        where: { id: question.id },
        include: {
          options: {
            orderBy: { order: 'asc' }
          }
        }
      })
    })

    return result
  }
}