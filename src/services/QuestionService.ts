import { PrismaClient, QuestionType, QuestionStatus } from '@prisma/client'
import { User } from '../types/auth'

const prisma = new PrismaClient()

interface CreateQuestionData {
  milestoneId: string
  type: QuestionType
  text: string
  explanation?: string
  hints?: string[]
  difficulty?: string
  points?: number
  passThreshold?: number
  questionData: any // Flexible JSON for different question types
}

interface UpdateQuestionData {
  text?: string
  explanation?: string
  hints?: string[]
  difficulty?: string
  points?: number
  passThreshold?: number
  questionData?: any
  status?: QuestionStatus
}

export class QuestionService {
  /**
   * Create a new question for a milestone
   */
  static async createQuestion(data: CreateQuestionData, user: User) {
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

    // Check permissions - only lesson creator or admin can create questions
    if (
      milestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Validate question data based on type
    this.validateQuestionData(data.type, data.questionData)

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
        status: 'DRAFT'
      },
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            timestamp: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return question
  }

  /**
   * Get all questions for a milestone
   */
  static async getQuestionsByMilestone(milestoneId: string, userId: string) {
    // Check if user has access to the milestone
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        video: {
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
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found or access denied')
    }

    const questions = await prisma.question.findMany({
      where: { milestoneId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            attempts: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return questions
  }

  /**
   * Get a specific question by ID
   */
  static async getQuestionById(questionId: string, userId: string) {
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        milestone: {
          video: {
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
        }
      },
      include: {
        milestone: {
          include: {
            video: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            attempts: true
          }
        }
      }
    })

    return question
  }

  /**
   * Update a question
   */
  static async updateQuestion(questionId: string, data: UpdateQuestionData, user: User) {
    // Check if question exists and user has permission
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        milestone: {
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
        }
      }
    })

    if (!existingQuestion) {
      throw new Error('Question not found')
    }

    // Check permissions - only question creator, lesson creator, or admin can update
    if (
      existingQuestion.createdById !== user.id &&
      existingQuestion.milestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    // Validate question data if it's being updated
    if (data.questionData !== undefined) {
      this.validateQuestionData(existingQuestion.type, data.questionData)
    }

    // Filter out undefined values
    const updateData: any = {}
    if (data.text !== undefined) updateData.text = data.text
    if (data.explanation !== undefined) updateData.explanation = data.explanation
    if (data.hints !== undefined) updateData.hints = data.hints
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
    if (data.points !== undefined) updateData.points = data.points
    if (data.passThreshold !== undefined) updateData.passThreshold = data.passThreshold
    if (data.questionData !== undefined) updateData.questionData = data.questionData
    if (data.status !== undefined) updateData.status = data.status

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            timestamp: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return question
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(questionId: string, user: User) {
    // Check if question exists and user has permission
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        milestone: {
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
        }
      }
    })

    if (!existingQuestion) {
      throw new Error('Question not found')
    }

    // Check permissions - only question creator, lesson creator, or admin can delete
    if (
      existingQuestion.createdById !== user.id &&
      existingQuestion.milestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    await prisma.question.delete({
      where: { id: questionId }
    })

    return true
  }

  /**
   * Approve a question (change status from DRAFT to APPROVED)
   */
  static async approveQuestion(questionId: string, user: User, reviewNotes?: string) {
    // Check if question exists and user has permission
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        milestone: {
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
        }
      }
    })

    if (!existingQuestion) {
      throw new Error('Question not found')
    }

    // Check permissions - only lesson creator or admin can approve
    if (
      existingQuestion.milestone.video.videoGroup.lesson.createdById !== user.id && 
      user.role !== 'ADMIN'
    ) {
      throw new Error('Access denied')
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      },
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            timestamp: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return question
  }

  /**
   * Get question data templates for different question types
   */
  static getQuestionTemplates(): Record<QuestionType, any> {
    return {
      MULTIPLE_CHOICE: {
        description: 'Multiple choice question with one correct answer',
        example: {
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswerIndex: 0
        }
      },
      TRUE_FALSE: {
        description: 'True or False question',
        example: {
          correctAnswer: true
        }
      },
      SHORT_ANSWER: {
        description: 'Short answer question with text input',
        example: {
          correctAnswers: ['correct answer', 'acceptable variant'],
          caseSensitive: false
        }
      },
      FILL_IN_BLANK: {
        description: 'Fill in the blank question with template',
        example: {
          template: 'The capital of {{blank}} is {{blank}}.',
          blanks: [
            {
              acceptedAnswers: ['France', 'france'],
              caseSensitive: false
            },
            {
              acceptedAnswers: ['Paris', 'paris'],
              caseSensitive: false
            }
          ]
        }
      },
      MATCHING: {
        description: 'Match items from two lists',
        example: {
          leftItems: ['Item 1', 'Item 2', 'Item 3'],
          rightItems: ['Match A', 'Match B', 'Match C'],
          correctMatches: [
            { left: 0, right: 0 },
            { left: 1, right: 1 },
            { left: 2, right: 2 }
          ]
        }
      },
      ORDERING: {
        description: 'Put items in correct order',
        example: {
          items: ['First item', 'Second item', 'Third item'],
          correctOrder: [0, 1, 2]
        }
      }
    }
  }

  /**
   * Validate question data based on question type
   */
  private static validateQuestionData(type: QuestionType, questionData: any) {
    if (!questionData) {
      throw new Error('Question data is required')
    }

    switch (type) {
      case 'MULTIPLE_CHOICE':
        if (!Array.isArray(questionData.options) || questionData.options.length < 2) {
          throw new Error('Multiple choice questions must have at least 2 options')
        }
        if (typeof questionData.correctAnswerIndex !== 'number' || 
            questionData.correctAnswerIndex < 0 || 
            questionData.correctAnswerIndex >= questionData.options.length) {
          throw new Error('Correct answer index is invalid')
        }
        break

      case 'TRUE_FALSE':
        if (typeof questionData.correctAnswer !== 'boolean') {
          throw new Error('True/False questions must have a boolean correct answer')
        }
        break

      case 'SHORT_ANSWER':
        if (!Array.isArray(questionData.correctAnswers) || questionData.correctAnswers.length === 0) {
          throw new Error('Short answer questions must have at least one correct answer')
        }
        break

      case 'FILL_IN_BLANK':
        if (!questionData.template || typeof questionData.template !== 'string') {
          throw new Error('Fill in blank questions must have a template')
        }
        if (!Array.isArray(questionData.blanks) || questionData.blanks.length === 0) {
          throw new Error('Fill in blank questions must have blank definitions')
        }
        break

      default:
        // For other question types, allow flexible validation
        break
    }
  }
}