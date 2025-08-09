/**
 * Debug utility for conditional logging
 * 
 * Enable debug mode in development:
 * - localStorage.setItem('debug', 'true') - Enable debug logs
 * - localStorage.removeItem('debug') - Disable debug logs
 */

const isDevelopment = import.meta.env.MODE === 'development'
const isDebugEnabled = () => {
  if (typeof window === 'undefined') return false
  return isDevelopment && localStorage.getItem('debug') === 'true'
}

export const debug = {
  /**
   * Log debug information (only in debug mode)
   */
  log: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Log warnings (always in development, never in production)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Log errors (always logged)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },

  /**
   * Log API calls (only in debug mode)
   */
  api: (method: string, url: string, duration?: number) => {
    if (isDebugEnabled()) {
      const message = duration 
        ? `[API] ${method} ${url} - ${duration}ms`
        : `[API] ${method} ${url}`
      console.log(message)
    }
  },

  /**
   * Log auth events (only in debug mode)
   */
  auth: (event: string, data?: any) => {
    if (isDebugEnabled()) {
      console.log(`[AUTH] ${event}`, data || '')
    }
  },

  /**
   * Log video player events (only in debug mode)
   */
  video: (event: string, data?: any) => {
    if (isDebugEnabled()) {
      console.log(`[VIDEO] ${event}`, data || '')
    }
  },

  /**
   * Check if debug mode is enabled
   */
  isEnabled: isDebugEnabled,

  /**
   * Enable debug mode
   */
  enable: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug', 'true')
      console.log('[DEBUG] Debug mode enabled')
    }
  },

  /**
   * Disable debug mode
   */
  disable: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug')
      console.log('[DEBUG] Debug mode disabled')
    }
  }
}

// Make debug tools available globally in development
if (isDevelopment && typeof window !== 'undefined') {
  (window as any).debug = debug
}