import { apiService } from './api'
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth'

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', credentials)
      
      if (response.success && response.data) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', response.data.tokens.accessToken)
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
        
        // Set auth token in API service
        apiService.setAuthToken(response.data.tokens.accessToken)
      }
      
      return response
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/register', data)
      
      if (response.success && response.data) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', response.data.tokens.accessToken)
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
        
        // Set auth token in API service
        apiService.setAuthToken(response.data.tokens.accessToken)
      }
      
      return response
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiService.get<{ success: boolean; data: User }>('/auth/me')
      return response.success ? response.data : null
    } catch (error) {
      return null
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        return false
      }

      const response = await apiService.post<{
        success: boolean
        data: { tokens: { accessToken: string; refreshToken: string } }
      }>('/auth/refresh', { refreshToken })

      if (response.success) {
        localStorage.setItem('accessToken', response.data.tokens.accessToken)
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
        apiService.setAuthToken(response.data.tokens.accessToken)
        return true
      }
      
      return false
    } catch (error) {
      this.logout()
      return false
    }
  }

  logout(): void {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    apiService.removeAuthToken()
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken')
  }

  getStoredTokens(): { accessToken: string; refreshToken: string } | null {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken }
    }
    
    return null
  }
}

export const authService = new AuthService()
export default authService