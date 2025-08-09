import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import TokenManager from './tokenManager'
import { debug } from '../utils/debug'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

class ApiService {
  private api: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (token: string) => void
    reject: (error: any) => void
  }> = []

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    })

    this.setupInterceptors()
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token!)
      }
    })
    
    this.failedQueue = []
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.api.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh before making request
        if (TokenManager.shouldRefreshToken() && !this.isRefreshing) {
          debug.auth('Token needs refresh before request')
          window.dispatchEvent(new CustomEvent('auth:token-refresh-needed'))
        }

        // Get current token (might be refreshed by now)
        const token = TokenManager.getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Handle FormData - don't set Content-Type, let axios handle it
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type']
        }
        
        // Add request timestamp for debugging
        (config as any).metadata = { startTime: new Date() }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor - handle errors and token refresh
    this.api.interceptors.response.use(
      (response) => {
        // Log request duration in development
        if ((response.config as any).metadata) {
          const duration = new Date().getTime() - (response.config as any).metadata.startTime.getTime()
          debug.api(response.config.method?.toUpperCase() || 'GET', response.config.url || '', duration)
        }
        
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any
        
        // Log error details
        debug.error('API Error:', {
          status: error.response?.status,
          url: originalRequest?.url,
          method: originalRequest?.method,
          data: error.response?.data,
        })

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && originalRequest) {
          // Skip refresh for auth endpoints
          if (originalRequest.url?.includes('/auth/')) {
            return Promise.reject(error)
          }

          if (originalRequest._retry) {
            // Already tried to refresh, give up
            TokenManager.clearTokens()
            window.dispatchEvent(new CustomEvent('auth:expired'))
            return Promise.reject(error)
          }

          originalRequest._retry = true

          // If not already refreshing, start refresh
          if (!this.isRefreshing) {
            this.isRefreshing = true
            const refreshToken = TokenManager.getRefreshToken()

            if (!refreshToken) {
              this.isRefreshing = false
              TokenManager.clearTokens()
              window.dispatchEvent(new CustomEvent('auth:expired'))
              return Promise.reject(error)
            }

            try {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              })

              const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens
              
              // Store new tokens
              TokenManager.setTokens(accessToken, newRefreshToken)
              
              // Process queued requests
              this.processQueue(null, accessToken)
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.api(originalRequest)
            } catch (refreshError) {
              // Refresh failed
              this.processQueue(refreshError, null)
              TokenManager.clearTokens()
              window.dispatchEvent(new CustomEvent('auth:expired'))
              return Promise.reject(refreshError)
            } finally {
              this.isRefreshing = false
            }
          }

          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            this.failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(this.api(originalRequest))
              },
              reject: (err: any) => {
                reject(err)
              }
            })
          })
        }

        // Handle network errors
        if (!error.response) {
          debug.error('Network error - no response received')
          error.message = 'Network error - please check your connection'
        }

        // Handle timeout
        if (error.code === 'ECONNABORTED') {
          error.message = 'Request timeout - please try again'
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Generic request method
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.api.request<T>(config)
      return response.data
    } catch (error: any) {
      // Transform axios error to a more user-friendly format
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'An unexpected error occurred'
      
      throw {
        ...error,
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Debug: Log video upload attempts
    if (url.includes('/videos/groups/') && url.includes('/videos')) {
      console.warn('[ApiService] Video upload POST request:', {
        url,
        data,
        isFormData: data instanceof FormData,
        dataKeys: data instanceof FormData ? 
          Array.from((data as FormData).keys()) : 
          (data ? Object.keys(data) : []),
        hasVideo: data && 'video' in data,
        hasVideoUrl: data && 'videoUrl' in data,
        contentType: config?.headers?.['Content-Type'],
        stack: new Error().stack?.split('\n').slice(2, 7).join('\n')
      })
    }
    
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  /**
   * Set auth token manually (used after login)
   */
  setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  /**
   * Remove auth token
   */
  removeAuthToken() {
    delete this.api.defaults.headers.common['Authorization']
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(message = 'Request cancelled') {
    // This would require implementing AbortController
    debug.log('Cancelling all requests:', message)
  }
}

export const apiService = new ApiService()
export default apiService