import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface UpdateProgressData {
  currentPosition: number
  totalWatchTime?: number
}

interface SubmitAnswerData {
  questionId: string
  answer: string
  milestoneId: string
}

interface CompleteSessionData {
  finalTime: number
  totalWatchTime: number
}

interface GetUserSessionsOptions {
  studentId: string
  page: number
  limit: number
  status?: string
}

export class VideoSessionService {
  static async startSession(videoId: string, studentId: string) {
    // Check if video exists and user has access
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        videoGroup: {
          lesson: {
            OR: [
              { createdById: studentId },
              {
                studentProgress: {
                  some: {
                    studentId: studentId
                  }
                }
              }
            ]
          }
        }
      }
    })

    console.log('Video found:', video ? 'Yes' : 'No')
    if (!video) {
      console.log('User does not have access to video:', videoId)
      throw new Error('Video not found')
    }

    // Get user's session for this video
    const session = await prisma.studentSession.findFirst({
      where: {
        videoId,
        studentId
      },
      include: {
        video: {
          include: {
            milestones: {
              orderBy: { timestamp: 'asc' },
              include: {
                questions: {
                  select: { 
                    id: true, 
                    type: true, 
                    text: true, 
                    questionData: true,
                    status: true
                  }
                }
              }
            }
          }
        },
        milestoneProgress: {
          orderBy: { reachedAt: 'asc' }
        },
        questionAttempts: true
      }
    })

    if (!session) {
      return null
    }

    return session
  }

  static async getSessionByVideo(videoId: string, studentId: string) {
    // First try to find any existing session for this video and student
    let session = await prisma.studentSession.findFirst({
      where: {
        videoId,
        studentId
      },
      include: {
        video: {
          include: {
            videoGroup: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })

    // If no session exists, create a new one
    if (!session) {
      session = await prisma.studentSession.create({
        data: {
          videoId,
          studentId,
          status: 'ACTIVE',
          lastSeenAt: new Date(),
          currentPosition: 0
        },
        include: {
          video: {
            include: {
              videoGroup: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      })
    }

    return session
  }

  static async updateProgress(
    sessionId: string,
    progressData: UpdateProgressData,
    studentId: string
  ) {
    // Verify session exists and belongs to student
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Update session progress
    const updatedSession = await prisma.studentSession.update({
      where: { id: sessionId },
      data: {
        currentPosition: progressData.currentPosition,
        lastSeenAt: new Date()
      },
      include: {
        video: true,
        milestoneProgress: true
      }
    })

    return updatedSession
  }

  static async completeSession(
    sessionId: string,
    completionData: CompleteSessionData,
    studentId: string
  ) {
    // Verify session exists and belongs to student
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Update session as completed
    const updatedSession = await prisma.studentSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        currentPosition: completionData.finalTime,
        completedAt: new Date(),
        lastSeenAt: new Date()
      },
      include: {
        video: true,
        milestoneProgress: true,
        questionAttempts: true
      }
    })

    // Update student progress for the lesson
    const video = await prisma.video.findUnique({
      where: { id: session.videoId },
      include: {
        videoGroup: {
          include: {
            lesson: true
          }
        }
      }
    })

    if (video?.videoGroup?.lesson) {
      // Update or create student progress for the lesson
      await prisma.studentProgress.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId: video.videoGroup.lesson.id
          }
        },
        update: {
          completedMilestones: {
            increment: updatedSession.milestoneProgress.length
          },
          totalTimeSpent: {
            increment: completionData.totalWatchTime
          },
          updatedAt: new Date()
        },
        create: {
          studentId,
          lessonId: video.videoGroup.lesson.id,
          completedMilestones: updatedSession.milestoneProgress.length,
          totalTimeSpent: completionData.totalWatchTime,
          startedAt: new Date()
        }
      })
    }

    return updatedSession
  }

  static async markMilestoneReached(
    sessionId: string,
    milestoneId: string,
    timestamp: number,
    studentId: string
  ) {
    // Verify session exists and belongs to student
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Verify milestone exists for this video
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        videoId: session.videoId
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // Check if milestone already reached
    const existing = await prisma.milestoneProgress.findFirst({
      where: {
        sessionId,
        milestoneId
      }
    })

    if (existing) {
      return existing
    }

    // Create milestone progress record
    const milestoneProgress = await prisma.milestoneProgress.create({
      data: {
        sessionId,
        milestoneId,
        reachedAt: new Date()
      },
      include: {
        milestone: true
      }
    })

    // Update session's completed milestones
    await prisma.studentSession.update({
      where: { id: sessionId },
      data: {
        lastMilestoneId: milestoneId,
        completedMilestones: {
          push: milestoneId
        },
        currentPosition: timestamp,
        lastSeenAt: new Date()
      }
    })

    return milestoneProgress
  }

  static async submitAnswer(
    sessionId: string,
    answerData: SubmitAnswerData,
    studentId: string
  ) {
    // Verify session exists and belongs to student
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Verify question exists
    const question = await prisma.question.findFirst({
      where: {
        id: answerData.questionId,
        milestoneId: answerData.milestoneId
      }
    })

    if (!question) {
      throw new Error('Question not found')
    }

    // Check answer correctness based on question type
    let isCorrect = false
    let score = 0
    let explanation = ''

    const questionData = question.questionData as any

    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        isCorrect = questionData.correctAnswer === answerData.answer
        score = isCorrect ? 100 : 0
        explanation = questionData.explanation || ''
        break
        
      case 'TRUE_FALSE':
        isCorrect = questionData.correctAnswer === answerData.answer
        score = isCorrect ? 100 : 0
        explanation = questionData.explanation || ''
        break
        
      case 'SHORT_ANSWER':
        // For short answer, check if answer contains key terms
        const keyTerms = questionData.keyTerms || []
        const answerLower = answerData.answer.toLowerCase()
        const matchedTerms = keyTerms.filter((term: string) => 
          answerLower.includes(term.toLowerCase())
        )
        score = keyTerms.length > 0 
          ? Math.round((matchedTerms.length / keyTerms.length) * 100)
          : 50 // Default partial credit for short answers
        isCorrect = score >= 70
        explanation = questionData.explanation || ''
        break
        
      case 'FILL_IN_BLANK':
        const acceptableAnswers = questionData.acceptableAnswers || []
        isCorrect = acceptableAnswers.some((acceptable: string) => 
          acceptable.toLowerCase() === answerData.answer.toLowerCase()
        )
        score = isCorrect ? 100 : 0
        explanation = questionData.explanation || ''
        break
    }

    // Create question attempt record
    const attempt = await prisma.questionAttempt.create({
      data: {
        sessionId,
        studentId,
        questionId: answerData.questionId,
        studentAnswer: answerData.answer, // This is the correct field name for the answer
        status: isCorrect ? 'CORRECT' : 'INCORRECT',
        isCorrect,
        score,
        attemptNumber: 1, // TODO: Track multiple attempts
        timeSpent: 0,
        hintsUsed: [],
        feedback: explanation
      },
      include: {
        question: true
      }
    })

    return {
      answer: attempt,
      isCorrect,
      score,
      explanation
    }
  }

  static async getUserSessions(options: GetUserSessionsOptions) {
    const { studentId, page, limit, status } = options
    const offset = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      studentId
    }

    if (status) {
      whereClause.status = status
    }

    const [sessions, total] = await Promise.all([
      prisma.studentSession.findMany({
        where: whereClause,
        include: {
          video: {
            include: {
              videoGroup: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          // Remove _count from StudentSessionInclude as it's not supported
        },
        orderBy: { lastSeenAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.studentSession.count({ where: whereClause })
    ])

    return {
      sessions,
      total
    }
  }
}