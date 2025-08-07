import { PrismaClient } from '@prisma/client'
import { User } from '../types/auth'

const prisma = new PrismaClient()

interface VideoStats {
  totalViews: number
  uniqueViewers: number
  averageWatchTime: number
  completionRate: number
  totalWatchTime: number
  engagementRate: number
  milestoneStats: {
    totalMilestones: number
    averageQuestionAccuracy: number
    mostDifficultQuestion: string | null
    easiestQuestion: string | null
  }
}

interface ProgressDataPoint {
  timestamp: string
  viewsStarted: number
  viewsCompleted: number
  averageProgress: number
}

interface StudentProgress {
  studentId: string
  studentName: string
  lessonsStarted: number
  lessonsCompleted: number
  totalWatchTime: number
  averageScore: number
  lastActivity: string
  progressByVideo: {
    videoId: string
    videoTitle: string
    progress: number
    completedAt: string | null
    score: number | null
  }[]
}

interface LessonOverview {
  lessonId: string
  lessonTitle: string
  totalVideos: number
  totalStudents: number
  averageCompletion: number
  averageScore: number
  engagementMetrics: {
    dailyViews: number[]
    peakHours: number[]
    dropoffPoints: number[]
  }
  topPerformingVideos: {
    videoId: string
    title: string
    completionRate: number
    averageScore: number
  }[]
}

interface TeacherDashboard {
  totalLessons: number
  totalStudents: number
  totalWatchHours: number
  averageEngagement: number
  recentActivity: {
    type: 'lesson_created' | 'student_completed' | 'question_answered'
    description: string
    timestamp: string
  }[]
  topLessons: {
    lessonId: string
    title: string
    completionRate: number
    studentCount: number
  }[]
}

interface StudentDashboard {
  lessonsEnrolled: number
  lessonsCompleted: number
  totalWatchTime: number
  averageScore: number
  streak: number
  recentProgress: {
    lessonTitle: string
    videoTitle: string
    progress: number
    timestamp: string
  }[]
  achievements: {
    title: string
    description: string
    earnedAt: string
  }[]
}

export class AnalyticsService {
  static async getVideoStats(videoId: string, user: User): Promise<VideoStats> {
    // Check if user has access to video
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        OR: [
          { uploadedBy: user.id },
          { videoGroup: { createdBy: user.id } },
          user.role === 'ADMIN' ? {} : {
            videoGroup: {
              OR: [
                { isPublic: true },
                {
                  videos: {
                    some: {
                      studentSessions: {
                        some: { studentId: user.id }
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      },
      include: {
        videoGroup: true,
        milestones: {
          include: {
            questions: {
              include: {
                _count: {
                  select: { questionAttempts: true }
                }
              }
            }
          }
        }
      }
    })

    if (!video) {
      throw new Error('Video not found')
    }

    // Get session statistics
    const sessions = await prisma.studentSession.findMany({
      where: { videoId },
      include: {
        questionAttempts: true
      }
    })

    const totalViews = sessions.length
    const uniqueViewers = new Set(sessions.map(s => s.studentId)).size
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED')
    const completionRate = totalViews > 0 ? (completedSessions.length / totalViews) * 100 : 0

    // Calculate average watch time
    const totalWatchTimeSeconds = sessions.reduce((sum, session) => sum + (session.sessionData as any)?.totalWatchTime || 0, 0)
    const averageWatchTime = totalViews > 0 ? totalWatchTimeSeconds / totalViews : 0

    // Calculate question statistics
    const allAnswers = sessions.flatMap(s => s.questionAttempts)
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length
    const averageQuestionAccuracy = allAnswers.length > 0 ? (correctAnswers / allAnswers.length) * 100 : 0

    // Find most/least difficult questions
    const questionStats = video.milestones.flatMap(m => m.questions).map(question => {
      const questionAttempts = allAnswers.filter(a => a.questionId === question.id)
      const correctCount = questionAttempts.filter(a => a.isCorrect).length
      const accuracy = questionAttempts.length > 0 ? (correctCount / questionAttempts.length) * 100 : 0
      
      return {
        questionId: question.id,
        question: question.question,
        accuracy
      }
    })

    const sortedByAccuracy = questionStats.sort((a, b) => a.accuracy - b.accuracy)
    const mostDifficultQuestion = sortedByAccuracy[0]?.question || null
    const easiestQuestion = sortedByAccuracy[sortedByAccuracy.length - 1]?.question || null

    // Calculate engagement rate (sessions with at least one interaction)
    const engagedSessions = sessions.filter(s => s.questionAttempts.length > 0 || (s.sessionData as any)?.totalWatchTime || 0 > 30)
    const engagementRate = totalViews > 0 ? (engagedSessions.length / totalViews) * 100 : 0

    return {
      totalViews,
      uniqueViewers,
      averageWatchTime,
      completionRate,
      totalWatchTime: totalWatchTimeSeconds,
      engagementRate,
      milestoneStats: {
        totalMilestones: video.milestones.length,
        averageQuestionAccuracy,
        mostDifficultQuestion,
        easiestQuestion
      }
    }
  }

  static async getVideoProgressData(
    videoId: string, 
    timeRange: string, 
    user: User
  ): Promise<ProgressDataPoint[]> {
    // Check access
    await this.getVideoStats(videoId, user) // This will throw if no access

    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0) // Beginning of time
    }

    const sessions = await prisma.studentSession.findMany({
      where: {
        videoId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group sessions by time periods
    const timeGroups = new Map<string, { started: number; completed: number; totalProgress: number; count: number }>()

    sessions.forEach(session => {
      const timeKey = session.createdAt.toISOString().split('T')[0] // Group by day
      const existing = timeGroups.get(timeKey) || { started: 0, completed: 0, totalProgress: 0, count: 0 }
      
      existing.started += 1
      if (session.status === 'COMPLETED') existing.completed += 1
      existing.totalProgress += (session.currentPosition / (session.currentPosition + 1)) * 100 // Avoid division by zero
      existing.count += 1
      
      timeGroups.set(timeKey, existing)
    })

    return Array.from(timeGroups.entries()).map(([timestamp, data]) => ({
      timestamp,
      viewsStarted: data.started,
      viewsCompleted: data.completed,
      averageProgress: data.count > 0 ? data.totalProgress / data.count : 0
    }))
  }

  static async getStudentProgress(
    studentId: string,
    videoGroupId: string | undefined,
    user: User
  ): Promise<StudentProgress> {
    // Check if user can access student data
    if (user.role !== 'ADMIN' && user.id !== studentId) {
      // Teacher can only see students in their lessons
      if (user.role !== 'TEACHER') {
        throw new Error('Access denied')
      }
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    })

    if (!student) {
      throw new Error('Student not found')
    }

    // Get student's video sessions
    const whereClause: any = {
      userId: studentId
    }

    if (videoGroupId) {
      whereClause.video = {
        videoGroupId
      }
    } else if (user.role === 'TEACHER') {
      // Teachers can only see sessions for their videos
      whereClause.video = {
        videoGroup: {
          createdBy: user.id
        }
      }
    }

    const sessions = await prisma.studentSession.findMany({
      where: whereClause,
      include: {
        video: {
          include: {
            videoGroup: true
          }
        },
        questionAttempts: true
      },
      orderBy: { lastSeenAt: 'desc' }
    })

    const lessonsStarted = new Set(sessions.map(s => s.video.videoGroupId)).size
    const lessonsCompleted = new Set(
      sessions.filter(s => s.status === 'COMPLETED').map(s => s.video.videoGroupId)
    ).size

    const totalWatchTime = sessions.reduce((sum, s) => sum + (s.sessionData as any)?.totalWatchTime || 0, 0)

    // Calculate average score
    const allAnswers = sessions.flatMap(s => s.questionAttempts)
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length
    const averageScore = allAnswers.length > 0 ? (correctAnswers / allAnswers.length) * 100 : 0

    const lastActivity = sessions.length > 0 
      ? sessions[0].lastSeenAt.toISOString()
      : new Date(0).toISOString()

    const progressByVideo = sessions.map(session => {
      const answers = session.questionAttempts
      const correctCount = answers.filter(a => a.isCorrect).length
      const score = answers.length > 0 ? (correctCount / answers.length) * 100 : null

      return {
        videoId: session.video.id,
        videoTitle: session.video.title,
        progress: session.video.duration 
          ? (session.currentPosition / session.video.duration) * 100 
          : 0,
        completedAt: session.status === 'COMPLETED' ? session.completedAt?.toISOString() || null : null,
        score
      }
    })

    return {
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      lessonsStarted,
      lessonsCompleted,
      totalWatchTime,
      averageScore,
      lastActivity,
      progressByVideo
    }
  }

  static async getLessonOverview(lessonId: string, user: User): Promise<LessonOverview> {
    const lesson = await prisma.videoGroup.findFirst({
      where: {
        id: lessonId,
        OR: [
          { createdBy: user.id },
          user.role === 'ADMIN' ? {} : { isPublic: true }
        ]
      },
      include: {
        videos: {
          include: {
            studentSessions: {
              include: {
                questionAttempts: true
              }
            },
            _count: {
              select: { studentSessions: true }
            }
          }
        }
      }
    })

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    const totalVideos = lesson.videos.length
    const allSessions = lesson.videos.flatMap(v => v.studentSessions)
    const uniqueStudents = new Set(allSessions.map(s => s.studentId)).size

    // Calculate completion metrics
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED')
    const averageCompletion = allSessions.length > 0 
      ? (completedSessions.length / allSessions.length) * 100 
      : 0

    // Calculate average score
    const allAnswers = allSessions.flatMap(s => s.questionAttempts)
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length
    const averageScore = allAnswers.length > 0 ? (correctAnswers / allAnswers.length) * 100 : 0

    // Calculate engagement metrics (simplified)
    const dailyViews = Array(7).fill(0) // Last 7 days
    const peakHours = Array(24).fill(0) // 24 hours
    const dropoffPoints = Array(10).fill(0) // 10 segments of video

    // Top performing videos
    const topPerformingVideos = lesson.videos
      .map(video => {
        const studentSessions = video.studentSessions
        const completed = studentSessions.filter(s => s.status === 'COMPLETED').length
        const completionRate = studentSessions.length > 0 ? (completed / studentSessions.length) * 100 : 0
        
        const videoAnswers = studentSessions.flatMap(s => s.questionAttempts)
        const videoCorrect = videoAnswers.filter(a => a.isCorrect).length
        const videoScore = videoAnswers.length > 0 ? (videoCorrect / videoAnswers.length) * 100 : 0

        return {
          videoId: video.id,
          title: video.title,
          completionRate,
          averageScore: videoScore
        }
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)

    return {
      lessonId,
      lessonTitle: lesson.title,
      totalVideos,
      totalStudents: uniqueStudents,
      averageCompletion,
      averageScore,
      engagementMetrics: {
        dailyViews,
        peakHours,
        dropoffPoints
      },
      topPerformingVideos
    }
  }

  static async getTeacherDashboard(user: User): Promise<TeacherDashboard> {
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      throw new Error('Access denied')
    }

    const lessons = await prisma.videoGroup.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          user.role === 'ADMIN' ? {} : { id: 'never-match' } // Admins see all, teachers see only theirs
        ]
      },
      include: {
        videos: {
          include: {
            studentSessions: true
          }
        }
      }
    })

    const totalLessons = lessons.length
    const allSessions = lessons.flatMap(l => l.videos.flatMap(v => v.studentSessions))
    const totalStudents = new Set(allSessions.map(s => s.studentId)).size
    const totalWatchHours = allSessions.reduce((sum, s) => sum + (s.sessionData as any)?.totalWatchTime || 0, 0) / 3600

    // Calculate engagement
    const engagedSessions = allSessions.filter(s => (s.sessionData as any)?.totalWatchTime || 0 > 30)
    const averageEngagement = allSessions.length > 0 
      ? (engagedSessions.length / allSessions.length) * 100 
      : 0

    // Recent activity (simplified)
    const recentActivity = [
      {
        type: 'lesson_created' as const,
        description: 'New lesson created',
        timestamp: new Date().toISOString()
      }
    ]

    // Top lessons
    const topLessons = lessons
      .map(lesson => {
        const lessonSessions = lesson.videos.flatMap(v => v.studentSessions)
        const completed = lessonSessions.filter(s => s.status === 'COMPLETED').length
        const completionRate = lessonSessions.length > 0 ? (completed / lessonSessions.length) * 100 : 0
        const studentCount = new Set(lessonSessions.map(s => s.studentId)).size

        return {
          lessonId: lesson.id,
          title: lesson.title,
          completionRate,
          studentCount
        }
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)

    return {
      totalLessons,
      totalStudents,
      totalWatchHours,
      averageEngagement,
      recentActivity,
      topLessons
    }
  }

  static async getStudentDashboard(user: User): Promise<StudentDashboard> {
    const sessions = await prisma.studentSession.findMany({
      where: { studentId: user.id },
      include: {
        video: {
          include: {
            videoGroup: true
          }
        },
        questionAttempts: true
      },
      orderBy: { lastSeenAt: 'desc' }
    })

    const lessonsEnrolled = new Set(sessions.map(s => s.video.videoGroupId)).size
    const lessonsCompleted = new Set(
      sessions.filter(s => s.status === 'COMPLETED').map(s => s.video.videoGroupId)
    ).size

    const totalWatchTime = sessions.reduce((sum, s) => sum + (s.sessionData as any)?.totalWatchTime || 0, 0)

    // Calculate average score
    const allAnswers = sessions.flatMap(s => s.questionAttempts)
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length
    const averageScore = allAnswers.length > 0 ? (correctAnswers / allAnswers.length) * 100 : 0

    // Calculate streak (simplified - days with activity)
    const activeDays = new Set(
      sessions.map(s => s.lastSeenAt.toISOString().split('T')[0])
    ).size
    const streak = Math.min(activeDays, 30) // Cap at 30 days

    // Recent progress
    const recentProgress = sessions.slice(0, 5).map(session => ({
      lessonTitle: session.video.videoGroup.title,
      videoTitle: session.video.title,
      progress: session.video.duration 
        ? (session.currentPosition / session.video.duration) * 100 
        : 0,
      timestamp: session.lastSeenAt.toISOString()
    }))

    // Achievements (simplified)
    const achievements = []
    if (lessonsCompleted > 0) {
      achievements.push({
        title: 'First Lesson Complete',
        description: 'Completed your first lesson',
        earnedAt: new Date().toISOString()
      })
    }
    if (averageScore > 80) {
      achievements.push({
        title: 'High Scorer',
        description: 'Achieved over 80% average score',
        earnedAt: new Date().toISOString()
      })
    }

    return {
      lessonsEnrolled,
      lessonsCompleted,
      totalWatchTime,
      averageScore,
      streak,
      recentProgress,
      achievements
    }
  }

  static async getEngagementHeatmap(videoId: string, user: User) {
    // Check access first
    await this.getVideoStats(videoId, user)

    const sessions = await prisma.studentSession.findMany({
      where: { videoId },
      // No milestone progress relation needed for heatmap
    })

    // Create engagement heatmap data (simplified)
    const heatmapData = Array(100).fill(0).map((_, index) => {
      const timePoint = (index / 99) * 100 // Percentage through video
      const engagement = sessions.filter(session => {
        const sessionProgress = session.video?.duration 
          ? (session.currentPosition / session.video.duration) * 100 
          : 0
        return sessionProgress >= timePoint
      }).length

      return {
        timePoint,
        engagement: sessions.length > 0 ? (engagement / sessions.length) * 100 : 0
      }
    })

    return heatmapData
  }

  static async getQuestionPerformance(milestoneId: string, user: User) {
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        video: {
          OR: [
            { uploadedBy: user.id },
            { videoGroup: { createdBy: user.id } },
            user.role === 'ADMIN' ? {} : {
              videoGroup: {
                OR: [
                  { isPublic: true },
                  {
                    videos: {
                      some: {
                        studentSessions: {
                          some: { studentId: user.id }
                        }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      include: {
        questions: {
          include: {
            questionAttempts: true
          }
        }
      }
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    const performance = milestone.questions.map(question => {
      const answers = question.questionAttempts
      const correctCount = answers.filter(a => a.isCorrect).length
      const accuracy = answers.length > 0 ? (correctCount / answers.length) * 100 : 0

      return {
        questionId: question.id,
        question: question.question,
        type: question.type,
        totalAnswers: answers.length,
        correctAnswers: correctCount,
        accuracy,
        averageTime: 0 // Could calculate from timestamps
      }
    })

    return {
      milestoneId,
      milestoneTitle: milestone.title,
      questions: performance
    }
  }
}