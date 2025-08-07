import { apiService } from './api'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface Lesson {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  order: number | null
  tenantId: string | null
  createdById: string
  objectives: string[]
  estimatedTime: number | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  tags: string[]
  metadata: any | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    avatar: string | null
  }
}

export interface CreateLessonRequest {
  title: string
  description?: string
  thumbnail?: string
  objectives?: string[]
  estimatedTime?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  order?: number
}

export interface UpdateLessonRequest {
  title?: string
  description?: string
  thumbnail?: string
  objectives?: string[]
  estimatedTime?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  order?: number
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export const lessonService = {
  // Create a new lesson
  async createLesson(data: CreateLessonRequest): Promise<Lesson> {
    const response = await apiService.post<ApiResponse<Lesson>>('/lessons', data)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create lesson')
    }
    
    return response.data
  },

  // Get all lessons (with pagination and filters)
  async getLessons(params?: {
    page?: number
    limit?: number
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    search?: string
    createdById?: string
  }) {
    const response = await apiService.get<ApiResponse<{
      items: Lesson[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>>('/lessons', { params })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch lessons')
    }
    
    return response.data
  },

  // Get a specific lesson by ID
  async getLesson(id: string): Promise<Lesson> {
    const response = await apiService.get<ApiResponse<Lesson>>(`/lessons/${id}`)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch lesson')
    }
    
    return response.data
  },

  // Update a lesson
  async updateLesson(id: string, data: UpdateLessonRequest): Promise<Lesson> {
    const response = await apiService.put<ApiResponse<Lesson>>(`/lessons/${id}`, data)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update lesson')
    }
    
    return response.data
  },

  // Publish a lesson
  async publishLesson(id: string): Promise<Lesson> {
    const response = await apiService.post<ApiResponse<Lesson>>(`/lessons/${id}/publish`)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to publish lesson')
    }
    
    return response.data
  },

  // Archive a lesson
  async archiveLesson(id: string): Promise<Lesson> {
    const response = await apiService.post<ApiResponse<Lesson>>(`/lessons/${id}/archive`)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to archive lesson')
    }
    
    return response.data
  },

  // Delete a lesson
  async deleteLesson(id: string): Promise<void> {
    const response = await apiService.delete<ApiResponse<void>>(`/lessons/${id}`)
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete lesson')
    }
  }
}