import { 
  Video, 
  Milestone, 
  Question, 
  VideoSession, 
  MilestoneProgress,
  QuestionAnswer,
  videoService,
  milestoneService,
  questionService,
  sessionService
} from '../services/video'

export interface VideoState {
  video: Video
  milestones: Milestone[]
  questions: Map<string, Question[]> // milestoneId -> questions
  metadata: {
    totalMilestones: number
    totalQuestions: number
    questionsPerMilestone: Map<string, number>
    lastUpdated: Date
    isLoading: boolean
    error: string | null
  }
}

export interface SessionState {
  session: VideoSession
  milestoneProgress: Set<string> // milestoneIds reached
  questionAnswers: Map<string, QuestionAnswer> // questionId -> answer
  currentMilestone: Milestone | null
  metadata: {
    correctAnswers: number
    totalAnswers: number
    completionPercentage: number
    lastUpdated: Date
  }
}

export type StateListener = (state: {
  videos: Map<string, VideoState>
  sessions: Map<string, SessionState>
}) => void

export type VideoStateListener = (videoId: string, state: VideoState) => void
export type SessionStateListener = (sessionId: string, state: SessionState) => void

class VideoStateManager {
  private static instance: VideoStateManager | null = null
  
  private videos: Map<string, VideoState> = new Map()
  private sessions: Map<string, SessionState> = new Map()
  private listeners: Set<StateListener> = new Set()
  private videoListeners: Map<string, Set<VideoStateListener>> = new Map()
  private sessionListeners: Map<string, Set<SessionStateListener>> = new Map()
  
  private constructor() {}
  
  static getInstance(): VideoStateManager {
    if (!VideoStateManager.instance) {
      VideoStateManager.instance = new VideoStateManager()
    }
    return VideoStateManager.instance
  }
  
  // Core subscription methods
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener({ videos: this.videos, sessions: this.sessions })
    
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  subscribeToVideo(videoId: string, listener: VideoStateListener): () => void {
    if (!this.videoListeners.has(videoId)) {
      this.videoListeners.set(videoId, new Set())
    }
    this.videoListeners.get(videoId)!.add(listener)
    
    // Immediately call with current state if exists
    const state = this.videos.get(videoId)
    if (state) {
      listener(videoId, state)
    }
    
    return () => {
      this.videoListeners.get(videoId)?.delete(listener)
    }
  }
  
  subscribeToSession(sessionId: string, listener: SessionStateListener): () => void {
    if (!this.sessionListeners.has(sessionId)) {
      this.sessionListeners.set(sessionId, new Set())
    }
    this.sessionListeners.get(sessionId)!.add(listener)
    
    // Immediately call with current state if exists
    const state = this.sessions.get(sessionId)
    if (state) {
      listener(sessionId, state)
    }
    
    return () => {
      this.sessionListeners.get(sessionId)?.delete(listener)
    }
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener({ videos: this.videos, sessions: this.sessions })
    })
  }
  
  private notifyVideoListeners(videoId: string) {
    const state = this.videos.get(videoId)
    if (state) {
      this.videoListeners.get(videoId)?.forEach(listener => {
        listener(videoId, state)
      })
    }
  }
  
  private notifySessionListeners(sessionId: string) {
    const state = this.sessions.get(sessionId)
    if (state) {
      this.sessionListeners.get(sessionId)?.forEach(listener => {
        listener(sessionId, state)
      })
    }
  }
  
  // Video management
  async loadVideo(videoId: string, forceRefresh = false): Promise<VideoState> {
    const existing = this.videos.get(videoId)
    if (existing && !forceRefresh && !existing.metadata.isLoading) {
      const age = Date.now() - existing.metadata.lastUpdated.getTime()
      if (age < 30000) { // 30 seconds cache
        return existing
      }
    }
    
    // Set loading state
    this.updateVideoState(videoId, {
      metadata: { isLoading: true, error: null }
    })
    
    try {
      const video = await videoService.getVideo(videoId)
      const milestones = video.milestones || []
      
      // Build questions map
      const questions = new Map<string, Question[]>()
      let totalQuestions = 0
      const questionsPerMilestone = new Map<string, number>()
      
      for (const milestone of milestones) {
        const milestoneQuestions = milestone.questions || []
        questions.set(milestone.id, milestoneQuestions)
        questionsPerMilestone.set(milestone.id, milestoneQuestions.length)
        totalQuestions += milestoneQuestions.length
      }
      
      const state: VideoState = {
        video,
        milestones,
        questions,
        metadata: {
          totalMilestones: milestones.length,
          totalQuestions,
          questionsPerMilestone,
          lastUpdated: new Date(),
          isLoading: false,
          error: null
        }
      }
      
      this.videos.set(videoId, state)
      this.notifyVideoListeners(videoId)
      this.notifyListeners()
      
      return state
    } catch (error: any) {
      this.updateVideoState(videoId, {
        metadata: { 
          isLoading: false, 
          error: error.message || 'Failed to load video' 
        }
      })
      throw error
    }
  }
  
  private updateVideoState(videoId: string, updates: Partial<VideoState>) {
    const current = this.videos.get(videoId) || {
      video: { id: videoId } as Video,
      milestones: [],
      questions: new Map(),
      metadata: {
        totalMilestones: 0,
        totalQuestions: 0,
        questionsPerMilestone: new Map(),
        lastUpdated: new Date(),
        isLoading: false,
        error: null
      }
    }
    
    const updated = {
      ...current,
      ...updates,
      metadata: {
        ...current.metadata,
        ...(updates.metadata || {}),
        lastUpdated: new Date()
      }
    }
    
    this.videos.set(videoId, updated)
    this.notifyVideoListeners(videoId)
    this.notifyListeners()
  }
  
  // Milestone management
  async addMilestone(videoId: string, milestone: Milestone): Promise<void> {
    const state = this.videos.get(videoId)
    if (!state) {
      await this.loadVideo(videoId)
    }
    
    const current = this.videos.get(videoId)!
    const milestones = [...current.milestones, milestone]
    
    // Update questions map
    const questions = new Map(current.questions)
    questions.set(milestone.id, milestone.questions || [])
    
    // Recalculate metadata
    const questionsPerMilestone = new Map(current.metadata.questionsPerMilestone)
    questionsPerMilestone.set(milestone.id, (milestone.questions || []).length)
    
    const totalQuestions = Array.from(questions.values())
      .reduce((sum, q) => sum + q.length, 0)
    
    this.updateVideoState(videoId, {
      milestones,
      questions,
      metadata: {
        totalMilestones: milestones.length,
        totalQuestions,
        questionsPerMilestone
      }
    })
  }
  
  async updateMilestone(videoId: string, milestoneId: string, updates: Partial<Milestone>): Promise<void> {
    const state = this.videos.get(videoId)
    if (!state) return
    
    const milestones = state.milestones.map(m => 
      m.id === milestoneId ? { ...m, ...updates } : m
    )
    
    this.updateVideoState(videoId, { milestones })
  }
  
  // Question management
  async addQuestion(videoId: string, milestoneId: string, question: Question): Promise<void> {
    const state = this.videos.get(videoId)
    if (!state) {
      await this.loadVideo(videoId)
    }
    
    const current = this.videos.get(videoId)!
    const questions = new Map(current.questions)
    const milestoneQuestions = questions.get(milestoneId) || []
    questions.set(milestoneId, [...milestoneQuestions, question])
    
    // Update milestone with new question
    const milestones = current.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          questions: [...(m.questions || []), question],
          _count: { ...m._count, questions: (m._count?.questions || 0) + 1 }
        }
      }
      return m
    })
    
    // Recalculate metadata
    const questionsPerMilestone = new Map(current.metadata.questionsPerMilestone)
    questionsPerMilestone.set(milestoneId, (questionsPerMilestone.get(milestoneId) || 0) + 1)
    
    const totalQuestions = current.metadata.totalQuestions + 1
    
    this.updateVideoState(videoId, {
      milestones,
      questions,
      metadata: {
        totalQuestions,
        questionsPerMilestone
      }
    })
  }
  
  async addQuestions(videoId: string, milestoneId: string, newQuestions: Question[]): Promise<void> {
    const state = this.videos.get(videoId)
    if (!state) {
      await this.loadVideo(videoId)
    }
    
    const current = this.videos.get(videoId)!
    const questions = new Map(current.questions)
    const milestoneQuestions = questions.get(milestoneId) || []
    questions.set(milestoneId, [...milestoneQuestions, ...newQuestions])
    
    // Update milestone with new questions
    const milestones = current.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          questions: [...(m.questions || []), ...newQuestions],
          _count: { ...m._count, questions: (m._count?.questions || 0) + newQuestions.length }
        }
      }
      return m
    })
    
    // Recalculate metadata
    const questionsPerMilestone = new Map(current.metadata.questionsPerMilestone)
    questionsPerMilestone.set(
      milestoneId, 
      (questionsPerMilestone.get(milestoneId) || 0) + newQuestions.length
    )
    
    const totalQuestions = current.metadata.totalQuestions + newQuestions.length
    
    this.updateVideoState(videoId, {
      milestones,
      questions,
      metadata: {
        totalQuestions,
        questionsPerMilestone
      }
    })
  }
  
  async removeQuestion(videoId: string, milestoneId: string, questionId: string): Promise<void> {
    const state = this.videos.get(videoId)
    if (!state) return
    
    const questions = new Map(state.questions)
    const milestoneQuestions = (questions.get(milestoneId) || [])
      .filter(q => q.id !== questionId)
    questions.set(milestoneId, milestoneQuestions)
    
    // Update milestone
    const milestones = state.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          questions: milestoneQuestions,
          _count: { ...m._count, questions: milestoneQuestions.length }
        }
      }
      return m
    })
    
    // Recalculate metadata
    const questionsPerMilestone = new Map(state.metadata.questionsPerMilestone)
    questionsPerMilestone.set(milestoneId, milestoneQuestions.length)
    
    const totalQuestions = Array.from(questions.values())
      .reduce((sum, q) => sum + q.length, 0)
    
    this.updateVideoState(videoId, {
      milestones,
      questions,
      metadata: {
        totalQuestions,
        questionsPerMilestone
      }
    })
  }
  
  // Session management
  async startOrResumeSession(videoId: string): Promise<SessionState> {
    try {
      const session = await sessionService.startSession(videoId)
      
      const milestoneProgress = new Set(
        (session.milestoneProgress || []).map(mp => mp.milestoneId)
      )
      
      const questionAnswers = new Map<string, QuestionAnswer>()
      let correctAnswers = 0
      
      for (const answer of (session.questionAnswers || [])) {
        questionAnswers.set(answer.questionId, answer)
        if (answer.isCorrect) correctAnswers++
      }
      
      const videoState = await this.loadVideo(videoId)
      const completionPercentage = videoState.video.duration 
        ? Math.round((session.currentTime / videoState.video.duration) * 100)
        : 0
      
      const state: SessionState = {
        session,
        milestoneProgress,
        questionAnswers,
        currentMilestone: null,
        metadata: {
          correctAnswers,
          totalAnswers: questionAnswers.size,
          completionPercentage,
          lastUpdated: new Date()
        }
      }
      
      this.sessions.set(session.id, state)
      this.notifySessionListeners(session.id)
      this.notifyListeners()
      
      return state
    } catch (error: any) {
      throw error
    }
  }
  
  async updateSessionProgress(sessionId: string, currentTime: number, totalWatchTime: number): Promise<void> {
    const state = this.sessions.get(sessionId)
    if (!state) return
    
    const updatedSession = await sessionService.updateProgress(sessionId, {
      currentTime,
      totalWatchTime
    })
    
    const videoState = this.videos.get(updatedSession.videoId)
    const completionPercentage = videoState?.video.duration 
      ? Math.round((currentTime / videoState.video.duration) * 100)
      : 0
    
    this.sessions.set(sessionId, {
      ...state,
      session: updatedSession,
      metadata: {
        ...state.metadata,
        completionPercentage,
        lastUpdated: new Date()
      }
    })
    
    this.notifySessionListeners(sessionId)
    this.notifyListeners()
  }
  
  async markMilestoneReached(sessionId: string, milestoneId: string, timestamp: number): Promise<void> {
    const state = this.sessions.get(sessionId)
    if (!state) return
    
    await sessionService.markMilestoneReached(sessionId, {
      milestoneId,
      timestamp
    })
    
    state.milestoneProgress.add(milestoneId)
    
    // Find the milestone
    const videoState = this.videos.get(state.session.videoId)
    const milestone = videoState?.milestones.find(m => m.id === milestoneId)
    
    this.sessions.set(sessionId, {
      ...state,
      currentMilestone: milestone || null,
      metadata: {
        ...state.metadata,
        lastUpdated: new Date()
      }
    })
    
    this.notifySessionListeners(sessionId)
    this.notifyListeners()
  }
  
  async submitAnswer(
    sessionId: string, 
    questionId: string, 
    answer: string, 
    milestoneId: string
  ): Promise<{ isCorrect: boolean; explanation?: string }> {
    const state = this.sessions.get(sessionId)
    if (!state) throw new Error('Session not found')
    
    const result = await sessionService.submitAnswer(sessionId, {
      questionId,
      answer,
      milestoneId
    })
    
    state.questionAnswers.set(questionId, result)
    
    const correctAnswers = Array.from(state.questionAnswers.values())
      .filter(a => a.isCorrect).length
    
    this.sessions.set(sessionId, {
      ...state,
      metadata: {
        ...state.metadata,
        correctAnswers,
        totalAnswers: state.questionAnswers.size,
        lastUpdated: new Date()
      }
    })
    
    this.notifySessionListeners(sessionId)
    this.notifyListeners()
    
    return {
      isCorrect: result.isCorrect,
      explanation: undefined // API doesn't return explanation in QuestionAnswer
    }
  }
  
  // Utility methods
  getVideoState(videoId: string): VideoState | undefined {
    return this.videos.get(videoId)
  }
  
  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId)
  }
  
  clearCache(videoId?: string): void {
    if (videoId) {
      this.videos.delete(videoId)
      this.notifyVideoListeners(videoId)
    } else {
      this.videos.clear()
      this.sessions.clear()
    }
    this.notifyListeners()
  }
  
  // Batch operations for AI-generated questions
  async processAIGeneratedQuestions(
    videoId: string,
    questionsPerMilestone: Map<string, Question[]>
  ): Promise<void> {
    for (const [milestoneId, questions] of questionsPerMilestone) {
      await this.addQuestions(videoId, milestoneId, questions)
    }
  }
}

export const videoStateManager = VideoStateManager.getInstance()