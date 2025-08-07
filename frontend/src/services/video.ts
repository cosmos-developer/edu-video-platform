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
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  question: string
  correctAnswer: string
  explanation: string | null
  createdAt: string
  options?: QuestionOption[]
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
  userId: string
  currentTime: number
  totalWatchTime: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  completedAt: string | null
  createdAt: string
  lastAccessedAt: string
  milestoneProgress?: MilestoneProgress[]
  questionAnswers?: QuestionAnswer[]
}

export interface MilestoneProgress {
  id: string
  sessionId: string
  milestoneId: string
  timestamp: number
  reachedAt: string
  milestone?: Milestone
}

export interface QuestionAnswer {
  id: string
  sessionId: string
  questionId: string
  answer: string
  isCorrect: boolean
  answeredAt: string
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

  // Get video streaming URL
  getStreamingUrl(videoId: string) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/videos/${videoId}/stream`
  },

  // Get video thumbnail URL
  getThumbnailUrl(videoId: string) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/videos/${videoId}/thumbnail`
  },

  // Get specific video
  async getVideo(videoId: string) {
    const response = await apiService.get<ApiResponse<Video>>(`/videos/${videoId}`)
    return response.data
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
    const response = await apiService.post<ApiResponse<Question>>('/questions', data)
    return response.data
  },

  // Get questions for milestone
  async getQuestionsByMilestone(milestoneId: string) {
    const response = await apiService.get<ApiResponse<Question[]>>(`/questions/milestone/${milestoneId}`)
    return response.data
  },

  // Update question
  async updateQuestion(questionId: string, data: {
    type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
    question?: string
    correctAnswer?: string
    explanation?: string
    options?: string[]
  }) {
    const response = await apiService.put<ApiResponse<Question>>(`/questions/${questionId}`, data)
    return response.data
  },

  // Delete question
  async deleteQuestion(questionId: string) {
    const response = await apiService.delete<ApiResponse<{ message: string }>>(`/questions/${questionId}`)
    return response.data
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
    return response.data
  },

  // Update progress
  async updateProgress(sessionId: string, data: {
    currentTime: number
    totalWatchTime?: number
  }) {
    const response = await apiService.put<ApiResponse<VideoSession>>(`/sessions/${sessionId}/progress`, data)
    return response.data
  },

  // Mark milestone reached
  async markMilestoneReached(sessionId: string, data: {
    milestoneId: string
    timestamp: number
  }) {
    const response = await apiService.post<ApiResponse<MilestoneProgress>>(`/sessions/${sessionId}/milestone`, data)
    return response.data
  },

  // Submit question answer
  async submitAnswer(sessionId: string, data: {
    questionId: string
    answer: string
    milestoneId: string
  }) {
    const response = await apiService.post<ApiResponse<QuestionAnswer>>(`/sessions/${sessionId}/question`, data)
    return response.data
  },

  // Complete session
  async completeSession(sessionId: string, data: {
    finalTime: number
    totalWatchTime: number
  }) {
    const response = await apiService.put<ApiResponse<VideoSession>>(`/sessions/${sessionId}/complete`, data)
    return response.data
  },

  // Get session for video
  async getSessionByVideo(videoId: string) {
    const response = await apiService.get<ApiResponse<VideoSession | null>>(`/sessions/video/${videoId}`)
    return response.data
  },

  // Get user sessions
  async getUserSessions(params: {
    page?: number
    limit?: number
    status?: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  } = {}) {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.status) searchParams.append('status', params.status)

    const response = await apiService.get<ApiResponse<PaginatedResponse<VideoSession>>>(`/sessions/user?${searchParams}`)
    return response.data
  }
}