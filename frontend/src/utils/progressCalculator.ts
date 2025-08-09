import type { Video, VideoSession } from '../services/video'

export interface ProgressData {
  completionPercentage: number
  milestonesReached: number
  correctAnswers: number
  totalAnswers: number
}

export interface SessionMetadata {
  completionPercentage?: number
  correctAnswers?: number
  totalAnswers?: number
}

export class ProgressCalculator {
  /**
   * Calculate completion percentage from session and video data
   */
  static calculateCompletionPercentage(
    session: VideoSession | null | undefined,
    video: Video | null | undefined,
    sessionMeta?: SessionMetadata
  ): number {
    console.log('📊 ProgressCalculator inputs:', {
      sessionExists: !!session,
      sessionStatus: session?.status,
      sessionCurrentPosition: session?.currentPosition,
      videoExists: !!video,
      videoDuration: video?.duration,
      sessionMetaCompletion: sessionMeta?.completionPercentage
    })

    // Check if session is completed first
    if (session?.status === 'COMPLETED') {
      console.log('📊 Session completed, returning 100%')
      return 100
    }

    // Try to calculate from session position and video duration
    const currentPos = session?.currentPosition || 0
    const duration = video?.duration

    if (duration && duration > 0 && currentPos > 0) {
      const percentage = Math.round((currentPos / duration) * 100)
      console.log('📊 Progress calc from session/video:', { currentPos, duration, percentage })
      return Math.min(100, Math.max(0, percentage))
    }

    // Fall back to sessionMeta if available and greater than 0
    if (sessionMeta?.completionPercentage !== undefined && sessionMeta.completionPercentage > 0) {
      console.log('📊 Using sessionMeta completionPercentage:', sessionMeta.completionPercentage)
      return Math.min(100, Math.max(0, sessionMeta.completionPercentage))
    }

    // Default to 0 if nothing else works
    console.log('📊 No meaningful progress data available, returning 0%')
    return 0
  }

  /**
   * Calculate number of milestones reached
   */
  static calculateMilestonesReached(session: VideoSession | null | undefined): number {
    return session?.milestoneProgress?.length || 0
  }

  /**
   * Calculate correct and total answers
   */
  static calculateAnswerStats(
    session: VideoSession | null | undefined,
    sessionMeta?: SessionMetadata
  ): { correct: number; total: number } {
    // Use sessionMeta if available
    if (sessionMeta?.correctAnswers !== undefined && sessionMeta?.totalAnswers !== undefined) {
      return {
        correct: sessionMeta.correctAnswers,
        total: sessionMeta.totalAnswers
      }
    }

    // Fall back to session data
    const questionAttempts = session?.questionAttempts || []
    const correct = questionAttempts.filter((qa: any) => qa.isCorrect).length
    const total = questionAttempts.length

    return { correct, total }
  }

  /**
   * Get all progress data in one call
   */
  static calculateAllProgress(
    session: VideoSession | null | undefined,
    video: Video | null | undefined,
    sessionMeta?: SessionMetadata
  ): ProgressData {
    const completionPercentage = this.calculateCompletionPercentage(session, video, sessionMeta)
    const milestonesReached = this.calculateMilestonesReached(session)
    const { correct: correctAnswers, total: totalAnswers } = this.calculateAnswerStats(session, sessionMeta)

    return {
      completionPercentage,
      milestonesReached,
      correctAnswers,
      totalAnswers
    }
  }
}