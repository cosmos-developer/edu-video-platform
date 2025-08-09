/**
 * TokenManager - Centralized token management service
 * Handles all token operations including storage, validation, and refresh scheduling
 */

interface JWTPayload {
  exp: number
  iat: number
  userId: string
  email: string
  role: string
}

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken'
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken'
  private static readonly TOKEN_EXPIRY_KEY = 'tokenExpiry'
  private static readonly USER_DATA_KEY = 'userData'
  
  private static refreshTimer: NodeJS.Timeout | null = null
  private static refreshPromise: Promise<boolean> | null = null

  /**
   * Decode JWT token to extract payload
   */
  private static decodeJWT(token: string): JWTPayload | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to decode JWT:', error)
      return null
    }
  }

  /**
   * Store tokens with automatic refresh scheduling
   */
  static setTokens(accessToken: string, refreshToken: string): boolean {
    try {
      // Decode token to get expiry
      const payload = this.decodeJWT(accessToken)
      if (!payload) {
        console.error('Invalid access token format')
        return false
      }

      // Store tokens and metadata
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, (payload.exp * 1000).toString())
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify({
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }))

      // Schedule automatic refresh
      this.scheduleTokenRefresh()
      
      // Notify other tabs
      window.dispatchEvent(new CustomEvent('auth:tokens-updated'))
      
      return true
    } catch (error) {
      console.error('Failed to store tokens:', error)
      return false
    }
  }

  /**
   * Get access token if valid
   */
  static getAccessToken(): string | null {
    if (!this.isTokenValid()) {
      return null
    }
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  /**
   * Check if current token is valid (not expired)
   */
  static isTokenValid(): boolean {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY)
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    
    if (!token || !expiryStr) {
      return false
    }

    const expiry = parseInt(expiryStr)
    const now = Date.now()
    
    // Token is valid if it has at least 1 minute before expiry
    return expiry - now > 60 * 1000
  }

  /**
   * Check if token needs refresh (expires in less than 5 minutes)
   */
  static shouldRefreshToken(): boolean {
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    if (!expiryStr) return false

    const expiry = parseInt(expiryStr)
    const now = Date.now()
    const timeUntilExpiry = expiry - now

    // Refresh if less than 5 minutes until expiry
    return timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0
  }

  /**
   * Get time until token expiry in milliseconds
   */
  static getTimeUntilExpiry(): number {
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    if (!expiryStr) return 0

    const expiry = parseInt(expiryStr)
    return Math.max(0, expiry - Date.now())
  }

  /**
   * Schedule automatic token refresh
   */
  private static scheduleTokenRefresh(): void {
    // Clear existing timer
    this.clearRefreshTimer()

    const timeUntilExpiry = this.getTimeUntilExpiry()
    if (timeUntilExpiry <= 0) return

    // Schedule refresh 5 minutes before expiry
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000)
    
    this.refreshTimer = setTimeout(() => {
      console.log('Auto-refreshing token...')
      window.dispatchEvent(new CustomEvent('auth:token-refresh-needed'))
    }, refreshTime)
  }

  /**
   * Clear refresh timer
   */
  private static clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Clear all tokens and related data
   */
  static clearTokens(): void {
    // Clear timer first
    this.clearRefreshTimer()
    
    // Clear storage
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
    localStorage.removeItem(this.USER_DATA_KEY)
    
    // Notify other tabs
    window.dispatchEvent(new CustomEvent('auth:tokens-cleared'))
  }

  /**
   * Get stored user data from token
   */
  static getUserData(): { userId: string; email: string; role: string } | null {
    const dataStr = localStorage.getItem(this.USER_DATA_KEY)
    if (!dataStr) return null
    
    try {
      return JSON.parse(dataStr)
    } catch {
      return null
    }
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const userData = this.getUserData()
    return userData?.role === role
  }

  /**
   * Initialize token manager (set up refresh timer if needed)
   */
  static initialize(): void {
    if (this.isTokenValid()) {
      this.scheduleTokenRefresh()
    } else {
      this.clearTokens()
    }
  }

  /**
   * Handle refresh with deduplication
   */
  static async refreshTokenWithDedup(refreshFn: () => Promise<{ accessToken: string; refreshToken: string }>): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Start new refresh
    this.refreshPromise = (async () => {
      try {
        const tokens = await refreshFn()
        return this.setTokens(tokens.accessToken, tokens.refreshToken)
      } catch (error) {
        console.error('Token refresh failed:', error)
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }
}

export default TokenManager