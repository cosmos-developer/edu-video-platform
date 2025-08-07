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

    if (!video) {
      throw new Error('Video not found')
    }

    // Check if user already has a session for this video
    let session = await prisma.studentSession.findFirst({
      where: {
        videoId,
        studentId
      }
    })

    if (session) {
      // Update existing session to resume
      session = await prisma.studentSession.update({
        where: { id: session.id },
        data: {
          status: 'ACTIVE',
          lastSeenAt: new Date()
        },
        include: {
          video: {
            include: {
              milestones: {
                orderBy: { timestamp: 'asc' }
              }
            }
          }
        }
      })
    } else {
      // Create new session
      session = await prisma.studentSession.create({
        data: {
          videoId,
          studentId,
          currentPosition: 0,
          status: 'ACTIVE'
        },
        include: {
          video: {
            include: {
              milestones: {
                orderBy: { timestamp: 'asc' }
              }
            }
          }
        }
      })
    }

    return session
  }

  static async updateProgress(sessionId: string, data: UpdateProgressData, studentId: string) {
    // Check if session exists and belongs to user
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Update progress
    const updateData: any = {
      currentPosition: data.currentPosition,
      lastSeenAt: new Date(),
      status: 'ACTIVE'
    }

    // Store totalWatchTime in sessionData if provided
    if (data.totalWatchTime !== undefined) {
      updateData.sessionData = { totalWatchTime: data.totalWatchTime }
    }

    const updatedSession = await prisma.studentSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        video: {
          include: {
            milestones: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    })

    return updatedSession
  }

  static async markMilestoneReached(sessionId: string, milestoneId: string, timestamp: number, studentId: string) {
    // Check if session exists and belongs to user
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Check if milestone exists for this video
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        videoId: session.videoId
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // Check if milestone progress already exists
    // Add milestone to completed milestones array if not already there
    const currentMilestones = session.completedMilestones || []
    if (!currentMilestones.includes(milestoneId)) {
      const updatedMilestones = [...currentMilestones, milestoneId]
      await prisma.studentSession.update({
        where: { id: sessionId },
        data: {
          completedMilestones: updatedMilestones,
          lastMilestoneId: milestoneId,
          lastSeenAt: new Date()
        }
      })
    }

    return { milestoneId, timestamp, reachedAt: new Date() }
  }

  static async submitAnswer(sessionId: string, data: SubmitAnswerData, studentId: string) {
    // Check if session exists and belongs to user
    const session = await prisma.studentSession.findFirst({
      where: {
        id: sessionId,
        studentId
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Check if question exists and belongs to the milestone
    const question = await prisma.question.findFirst({
      where: {
        id: data.questionId,
        milestoneId: data.milestoneId,
        milestone: {
          videoId: session.videoId
        }
      },
      select: { id: true, type: true, text: true, questionData: true }
    })

    if (!question) {
      throw new Error('Question not found')
    }

    // Check if answer is correct
    let isCorrect = false
    let score = 0
    const questionData = question.questionData as any
    
    if (question.type === 'MULTIPLE_CHOICE') {
      const answerIndex = parseInt(data.answer)
      isCorrect = answerIndex === questionData.correctAnswerIndex
      score = isCorrect ? 1 : 0
    } else if (question.type === 'TRUE_FALSE') {
      const answerBool = data.answer.toLowerCase() === 'true'
      isCorrect = questionData.correctAnswer === answerBool
      score = isCorrect ? 1 : 0
    } else if (question.type === 'SHORT_ANSWER') {
      const correctAnswers = questionData.correctAnswers || []
      const caseSensitive = questionData.caseSensitive || false
      const studentAnswer = caseSensitive ? data.answer : data.answer.toLowerCase()
      
      isCorrect = correctAnswers.some((correct: string) => {
        const correctAnswer = caseSensitive ? correct : correct.toLowerCase()
        return correctAnswer === studentAnswer
      })
      score = isCorrect ? 1 : 0
    } else if (question.type === 'FILL_IN_BLANK') {
      // For fill in blank, we'll expect the answer to be a JSON array
      try {
        const answers = JSON.parse(data.answer)
        const blanks = questionData.blanks || []
        let correctBlanks = 0
        
        answers.forEach((answer: string, index: number) => {
          if (blanks[index]) {
            const acceptedAnswers = blanks[index].acceptedAnswers || []
            const caseSensitive = blanks[index].caseSensitive || false
            const studentAnswer = caseSensitive ? answer : answer.toLowerCase()
            
            const isBlankCorrect = acceptedAnswers.some((accepted: string) => {
              const acceptedAnswer = caseSensitive ? accepted : accepted.toLowerCase()
              return acceptedAnswer === studentAnswer
            })
            
            if (isBlankCorrect) correctBlanks++
          }
        })
        
        score = correctBlanks / blanks.length
        isCorrect = score >= 0.7 // 70% threshold for fill in blank
      } catch {
        isCorrect = false
        score = 0
      }
    }

    // Check if answer already exists
    let questionAnswer = await prisma.questionAttempt.findFirst({
      where: {
        studentId,
        questionId: data.questionId
      }
    })

    if (questionAnswer) {
      // Update existing answer
      questionAnswer = await prisma.questionAttempt.update({
        where: { id: questionAnswer.id },
        data: {
          studentAnswer: { answer: data.answer }, // Store as JSON
          isCorrect,
          score: score,
          status: isCorrect ? 'CORRECT' : 'INCORRECT',
          submittedAt: new Date(),
          attemptNumber: questionAnswer.attemptNumber + 1
        }
      })
    } else {
      // Create new answer
      questionAnswer = await prisma.questionAttempt.create({
        data: {
          studentId,
          questionId: data.questionId,
          studentAnswer: { answer: data.answer }, // Store as JSON
          isCorrect,
          score: score,
          status: isCorrect ? 'CORRECT' : 'INCORRECT',
          submittedAt: new Date(),
          attemptNumber: 1
        }
      })
    }

    // Get question details for response
    const fullQuestion = await prisma.question.findUnique({
      where: { id: data.questionId },
      select: { explanation: true }
    })

    return {
      answer: questionAnswer,
      isCorrect,
      score,
      explanation: fullQuestion?.explanation
    }
  }

  static async completeSession(sessionId: string, data: CompleteSessionData, studentId: string) {
    // Check if session exists and belongs to user
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
    const completedSession = await prisma.studentSession.update({
      where: { id: sessionId },
      data: {
        currentPosition: data.finalTime,
        sessionData: { totalWatchTime: data.totalWatchTime },
        status: 'COMPLETED',
        completedAt: new Date(),
        lastSeenAt: new Date()
      },
      include: {
        video: {
          include: {
            milestones: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    })

    return completedSession
  }

  static async getSessionByVideo(videoId: string, studentId: string) {
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

    if (!video) {
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
        }
      }
    })

    return session
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