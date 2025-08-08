import { apiService } from './api'

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Types for API responses
export interface VideoGroup {
  id: string
  title: string
  description: string | null
  tags: string[]
  isPublic: boolean
  createdBy: string
  createdAt: string
  videos: Video[]
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    videos: number
  }
}

export interface Video {
  id: string
  title: string
  description: string | null
  videoUrl: string
  duration: number | null
  thumbnailUrl: string | null
  order: number
  videoGroupId: string
  uploadedBy: string
  createdAt: string
  milestones?: Milestone[]
  videoGroup?: {
    id: string
    title: string
    description: string | null
  }
  uploader?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    milestones: number
    videoSessions: number
  }
}

export interface Milestone {
  id: string
  videoId: string
  timestamp: number
  title: string
  description: string | null
  type: 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
  createdAt: string
  questions?: Question[]
  _count?: {
    questions: number
  }
}

export interface Question {
  id: string
  milestoneId: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK'
  text: string  // Backend returns 'text', not 'question'
  explanation: string | null
  questionData: any  // Contains correctAnswer, options, etc. based on type
  points?: number
  passThreshold?: number
  createdAt: string
  createdById?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export interface QuestionOption {
  id: string
  questionId: string
  text: string
  isCorrect: boolean
  order: number
}

export interface VideoSession {
  id: string
  videoId: string
  studentId: string
  currentPosition: number
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  completedAt: string | null
  createdAt: string
  lastSeenAt: string
  startedAt: string
  updatedAt: string
  lastMilestoneId?: string | null
  completedMilestones?: string[]
  sessionData?: any
  video?: Video
  milestoneProgress?: MilestoneProgress[]
  questionAttempts?: QuestionAttempt[]
}

export interface MilestoneProgress {
  id: string
  sessionId: string
  milestoneId: string
  timestamp: number
  reachedAt: string
  milestone?: Milestone
}

export interface QuestionAttempt {
  id: string
  studentId: string
  questionId: string
  sessionId?: string | null
  status: 'IN_PROGRESS' | 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'TIMEOUT'
  attemptNumber: number
  studentAnswer: any
  isCorrect?: boolean | null
  score: number
  timeSpent: number
  hintsUsed: string[]
  feedback?: string | null
  attemptData?: any
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  question?: Question
}

// Video Groups API
export const videoService = {
  // Get all video groups (paginated)
  async getVideoGroups(params: {
    page?: number
    limit?: number
    search?: string
  } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.search) searchParams.append('search', params.search)

    const response = await apiService.get<ApiResponse<PaginatedResponse<VideoGroup>>>(`/videos?${searchParams}`)
    return response.data
  },

  // Get specific video group
  async getVideoGroup(groupId: string) {
    const response = await apiService.get<ApiResponse<VideoGroup>>(`/videos/groups/${groupId}`)
    return response.data
  },

  // Create video group (teachers only)
  async createVideoGroup(data: {
    title: string
    description?: string
    tags?: string[]
    isPublic?: boolean
    lessonId?: string
  }) {
    const response = await apiService.post<ApiResponse<VideoGroup>>('/videos/groups', data)
    return response.data
  },

  // Update video group
  async updateVideoGroup(groupId: string, data: {
    title?: string
    description?: string
    tags?: string[]
    isPublic?: boolean
  }) {
    const response = await apiService.put<ApiResponse<VideoGroup>>(`/videos/groups/${groupId}`, data)
    return response.data
  },

  // Add video to group
  async addVideoToGroup(groupId: string, data: {
    title: string
    description?: string
    videoUrl: string
    duration?: number
    thumbnailUrl?: string
  }) {
    const response = await apiService.post<ApiResponse<Video>>(`/videos/groups/${groupId}/videos`, data)
    return response.data
  },

  // Upload video file with progress tracking
  async uploadVideoFile(groupId: string, file: File, data: {
    title: string
    description?: string
  }, onProgress?: (progress: number) => void) {
    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', data.title)
    if (data.description) {
      formData.append('description', data.description)
    }

    const response = await apiService.post<ApiResponse<Video>>(
      `/videos/groups/${groupId}/videos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
        }
      }
    )
    return response.data
  },

  // Get video streaming URL with authentication token
  getStreamingUrl(videoId: string) {
    const baseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/videos/${videoId}/stream`
    const token = localStorage.getItem('accessToken')
    
    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`
    }
    
    return baseUrl
  },

  // Get video thumbnail URL
  getThumbnailUrl(videoId: string) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/videos/${videoId}/thumbnail`
  },

  // Get specific video
  async getVideo(videoId: string) {
    const response = await apiService.get<ApiResponse<Video>>(`/videos/${videoId}`)
    // The response is already unwrapped by apiService, but it's wrapped in success/data structure
    return (response as any).data || response
  },

  // Update video
  async updateVideo(videoId: string, data: {
    title?: string
    description?: string
    videoUrl?: string
    duration?: number
    thumbnailUrl?: string
  }) {
    const response = await apiService.put<ApiResponse<Video>>(`/videos/${videoId}`, data)
    return response.data
  },

  // Delete video
  async deleteVideo(videoId: string) {
    const response = await apiService.delete<ApiResponse<{ message: string }>>(`/videos/${videoId}`)
    return response.data
  }
}

// Question API
export const questionService = {
  // Create question
  async createQuestion(data: {
    milestoneId: string
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
    question: string
    correctAnswer: string
    explanation?: string
    options?: string[]
  }) {
    // Transform frontend data to match backend expectations
    let questionData: any = {}
    
    switch (data.type) {
      case 'MULTIPLE_CHOICE':
        // Find the index of the correct answer in options
        const correctIndex = data.options ? data.options.indexOf(data.correctAnswer) : -1
        questionData = {
          options: data.options || [],
          correctAnswerIndex: correctIndex >= 0 ? correctIndex : 0
        }
        break
      case 'TRUE_FALSE':
        // Convert string to boolean
        questionData = {
          correctAnswer: data.correctAnswer.toLowerCase() === 'true'
        }
        break
      case 'SHORT_ANSWER':
        // Store as array of acceptable answers
        questionData = {
          correctAnswers: [data.correctAnswer],
          caseSensitive: false
        }
        break
    }
    
    const requestData = {
      milestoneId: data.milestoneId,
      type: data.type,
      text: data.question, // Backend expects 'text' not 'question'
      explanation: data.explanation,
      questionData
    }
    
    const response = await apiService.post<ApiResponse<Question>>('/questions', requestData)
    return (response as any).data
  },

  // Get questions for milestone
  async getQuestionsByMilestone(milestoneId: string) {
    const response = await apiService.get<ApiResponse<Question[]>>(`/questions/milestone/${milestoneId}`)
    return (response as any).data
  },

  // Update question
  async updateQuestion(questionId: string, data: {
    type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
    question?: string
    correctAnswer?: string
    explanation?: string
    options?: string[]
  }) {
    // Transform frontend data to match backend expectations
    const requestData: any = {}
    if (data.type !== undefined) requestData.type = data.type
    if (data.question !== undefined) requestData.text = data.question // Backend expects 'text' not 'question'
    if (data.explanation !== undefined) requestData.explanation = data.explanation
    
    // Only set questionData if we have relevant data to update
    if ((data.correctAnswer !== undefined || data.options !== undefined) && data.type) {
      let questionData: any = {}
      
      switch (data.type) {
        case 'MULTIPLE_CHOICE':
          const correctIndex = data.options && data.correctAnswer ? 
            data.options.indexOf(data.correctAnswer) : -1
          questionData = {
            options: data.options || [],
            correctAnswerIndex: correctIndex >= 0 ? correctIndex : 0
          }
          break
        case 'TRUE_FALSE':
          questionData = {
            correctAnswer: data.correctAnswer ? data.correctAnswer.toLowerCase() === 'true' : false
          }
          break
        case 'SHORT_ANSWER':
          questionData = {
            correctAnswers: data.correctAnswer ? [data.correctAnswer] : [],
            caseSensitive: false
          }
          break
      }
      
      requestData.questionData = questionData
    }
    
    const response = await apiService.put<ApiResponse<Question>>(`/questions/${questionId}`, requestData)
    return (response as any).data
  },

  // Delete question
  async deleteQuestion(questionId: string) {
    const response = await apiService.delete<ApiResponse<{ message: string }>>(`/questions/${questionId}`)
    return (response as any).data
  }
}

// Milestone API
export const milestoneService = {
  // Create milestone
  async createMilestone(data: {
    videoId: string
    timestamp: number
    title: string
    description?: string
    type: 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
  }) {
    const response = await apiService.post<ApiResponse<Milestone>>('/milestones', data)
    return response.data
  },

  // Get milestones for video
  async getMilestonesByVideo(videoId: string) {
    const response = await apiService.get<ApiResponse<Milestone[]>>(`/milestones/video/${videoId}`)
    return response.data
  },

  // Update milestone
  async updateMilestone(milestoneId: string, data: {
    timestamp?: number
    title?: string
    description?: string
    type?: 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
  }) {
    const response = await apiService.put<ApiResponse<Milestone>>(`/milestones/${milestoneId}`, data)
    return response.data
  },

  // Delete milestone
  async deleteMilestone(milestoneId: string) {
    const response = await apiService.delete<ApiResponse<{ message: string }>>(`/milestones/${milestoneId}`)
    return response.data
  },

  // Add question to milestone
  async addQuestion(milestoneId: string, data: {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
    question: string
    explanation?: string
    options?: string[]
    correctAnswer: string
  }) {
    const response = await apiService.post<ApiResponse<Question>>(`/milestones/${milestoneId}/questions`, data)
    return response.data
  }
}

// Session API
export const sessionService = {
  // Start or resume session
  async startSession(videoId: string) {
    const response = await apiService.post<ApiResponse<VideoSession>>('/sessions/start', { videoId })
    // apiService already unwraps, so response is the ApiResponse object
    return (response as any).data
  },

  // Update progress
  async updateProgress(sessionId: string, data: {
    currentTime: number
    totalWatchTime?: number
  }) {
    const response = await apiService.put<ApiResponse<VideoSession>>(`/sessions/${sessionId}/progress`, data)
    // apiService already unwraps, so response is the ApiResponse object
    return (response as any).data
  },

  // Mark milestone reached
  async markMilestoneReached(sessionId: string, data: {
    milestoneId: string
    timestamp: number
  }) {
    const response = await apiService.post<ApiResponse<MilestoneProgress>>(`/sessions/${sessionId}/milestone`, data)
    return (response as any).data
  },

  // Submit question answer
  async submitAnswer(sessionId: string, data: {
    questionId: string
    answer: string
    milestoneId: string
  }) {
    const response = await apiService.post<ApiResponse<{
      answer: QuestionAttempt
      isCorrect: boolean
      score: number
      explanation?: string
    }>>(`/sessions/${sessionId}/question`, data)
    return (response as any).data
  },

  // Complete session
  async completeSession(sessionId: string, data: {
    finalTime: number
    totalWatchTime: number
  }) {
    const response = await apiService.put<ApiResponse<VideoSession>>(`/sessions/${sessionId}/complete`, data)
    return (response as any).data
  },

  // Get session for video
  async getSessionByVideo(videoId: string) {
    const response = await apiService.get<ApiResponse<VideoSession | null>>(`/sessions/video/${videoId}`)
    return (response as any).data
  },

  // Get user sessions
  async getUserSessions(params: {
    page?: number
    limit?: number
    status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED'
  } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.status) searchParams.append('status', params.status)

    const response = await apiService.get<ApiResponse<PaginatedResponse<VideoSession>>>(`/sessions/user?${searchParams}`)
    return response.data
  }
}