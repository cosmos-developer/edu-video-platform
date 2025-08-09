import { apiService } from './api'
import TokenManager from './tokenManager'
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth'

class AuthService {
  /**
   * Login user and store tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', credentials)
      
      if (response.success && response.data) {
        // Use TokenManager to store tokens
        const stored = TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        )
        
        if (!stored) {
          throw new Error('Failed to store authentication tokens')
        }
        
        // Set auth token in API service
        apiService.setAuthToken(response.data.tokens.accessToken)
      }
      
      return response
    } catch (error: any) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed'
      }
    }
  }

  /**
   * Register new user and store tokens
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/register', data)
      
      if (response.success && response.data) {
        // Use TokenManager to store tokens
        const stored = TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        )
        
        if (!stored) {
          throw new Error('Failed to store authentication tokens')
        }
        
        // Set auth token in API service
        apiService.setAuthToken(response.data.tokens.accessToken)
      }
      
      return response
    } catch (error: any) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed'
      }
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Check if we have a valid token first
      if (!TokenManager.isTokenValid()) {
        console.log('No valid token, cannot get current user')
        return null
      }

      const response = await apiService.get<{ success: boolean; data: User }>('/auth/me')
      return response.success ? response.data : null
    } catch (error: any) {
      console.error('Failed to get current user:', error)
      
      // If 401, token might be invalid
      if (error.response?.status === 401) {
        TokenManager.clearTokens()
      }
      
      return null
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      if (!refreshToken) {
        console.log('No refresh token available')
        return false
      }

      // Use deduplication to prevent multiple refresh calls
      return await TokenManager.refreshTokenWithDedup(async () => {
        const response = await apiService.post<{
          success: boolean
          data: { tokens: { accessToken: string; refreshToken: string } }
        }>('/auth/refresh', { refreshToken })

        if (!response.success || !response.data) {
          throw new Error('Refresh failed')
        }

        // Update API service with new token
        apiService.setAuthToken(response.data.tokens.accessToken)
        
        return response.data.tokens
      })
    } catch (error: any) {
      console.error('Token refresh failed:', error)
      
      // Clear tokens on refresh failure
      this.logout()
      return false
    }
  }

  /**
   * Logout user and clear tokens
   */
  logout(): void {
    // Clear tokens using TokenManager
    TokenManager.clearTokens()
    
    // Remove auth token from API service
    apiService.removeAuthToken()
    
    // Optional: Call logout endpoint to invalidate server-side session
    apiService.post('/auth/logout').catch(() => {
      // Ignore logout API errors
    })
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return TokenManager.isTokenValid()
  }

  /**
   * Get stored tokens
   */
  getStoredTokens(): { accessToken: string; refreshToken: string } | null {
    const accessToken = TokenManager.getAccessToken()
    const refreshToken = TokenManager.getRefreshToken()
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken }
    }
    
    return null
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return TokenManager.hasRole(role)
  }

  /**
   * Get time until token expiry
   */
  getTokenExpiryTime(): number {
    return TokenManager.getTimeUntilExpiry()
  }
}

export const authService = new AuthService()
export default authService