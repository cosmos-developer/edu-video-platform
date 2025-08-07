import { apiService } from './api'
import type { ApiResponse } from './video'

export interface GeneratedQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
  suggestedTimestamp?: number
}

export interface GenerateQuestionsRequest {
  videoTitle: string
  videoDescription?: string
  content: string
  questionCount?: number
  questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')[]
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  provider?: 'OPENAI' | 'CLAUDE'
}

export interface GenerateQuestionsResponse {
  milestoneTitle: string
  milestoneDescription?: string
  questions: GeneratedQuestion[]
}

export interface AIProvidersResponse {
  providers: string[]
  hasAISupport: boolean
}

export const aiService = {
  // Get available AI providers
  async getProviders() {
    const response = await apiService.get<ApiResponse<AIProvidersResponse>>('/ai/providers')
    return response.data
  },

  // Generate questions from content
  async generateQuestions(request: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
    const response = await apiService.post<ApiResponse<GenerateQuestionsResponse>>('/ai/generate-questions', request)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate questions')
    }
    
    return response.data
  },

  // Generate questions for existing milestone
  async generateQuestionsForMilestone(milestoneId: string, request: {
    content?: string
    questionCount?: number
    questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')[]
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
    provider?: 'OPENAI' | 'CLAUDE'
  }) {
    const response = await apiService.post<ApiResponse<{ questionsAdded: number; milestone: any }>>(`/ai/generate-for-milestone/${milestoneId}`, request)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate questions for milestone')
    }
    
    return response.data
  },

  // Generate milestone with questions
  async generateMilestoneWithQuestions(videoId: string, request: GenerateQuestionsRequest) {
    const response = await apiService.post<ApiResponse<{ milestone: any; questionsAdded: number }>>(`/ai/generate-milestone-with-questions/${videoId}`, request)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate milestone with questions')
    }
    
    return response.data
  }
}