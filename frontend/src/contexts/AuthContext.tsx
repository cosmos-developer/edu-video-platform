import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react'
import type { User, LoginCredentials, RegisterData } from '../types/auth'
import { authService } from '../services/auth'
import TokenManager from '../services/tokenManager'
import { debug } from '../utils/debug'

// Auth State
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: User }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INITIALIZED' }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: User }
  | { type: 'REFRESH_ERROR' }

// Initial State
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null
}

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REFRESH_START':
      return { ...state, isLoading: true, error: null }
    
    case 'LOGIN_SUCCESS':
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case 'LOGOUT':
    case 'SESSION_EXPIRED':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.type === 'SESSION_EXPIRED' ? 'Your session has expired' : null
      }
    
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isInitialized: true
      }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    case 'INITIALIZED':
      return { ...state, isInitialized: true }
    
    case 'REFRESH_ERROR':
      return { ...state, isLoading: false }
    
    default:
      return state
  }
}

// Context Type
interface AuthContextType {
  state: AuthState
  actions: {
    login: (credentials: LoginCredentials) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => void
    refreshAuth: () => Promise<void>
    clearError: () => void
  }
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const refreshInProgress = useRef(false)

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      debug.auth('Initializing')
      
      // Initialize token manager
      TokenManager.initialize()
      
      // Try to restore session if token is valid
      if (TokenManager.isTokenValid()) {
        try {
          const user = await authService.getCurrentUser()
          if (user) {
            debug.auth('Session restored', { email: user.email })
            dispatch({ type: 'RESTORE_SESSION', payload: user })
          } else {
            debug.auth('Failed to restore session - clearing tokens')
            TokenManager.clearTokens()
          }
        } catch (error) {
          debug.error('Failed to restore session:', error)
          TokenManager.clearTokens()
        }
      } else {
        debug.auth('No valid token found')
      }
      
      dispatch({ type: 'INITIALIZED' })
    }

    initializeAuth()
  }, [])

  // Handle token refresh events
  useEffect(() => {
    const handleTokenRefresh = async () => {
      if (refreshInProgress.current) return
      
      refreshInProgress.current = true
      dispatch({ type: 'REFRESH_START' })
      
      try {
        const success = await authService.refreshToken()
        if (success) {
          const user = await authService.getCurrentUser()
          if (user) {
            dispatch({ type: 'REFRESH_SUCCESS', payload: user })
          } else {
            dispatch({ type: 'SESSION_EXPIRED' })
          }
        } else {
          dispatch({ type: 'SESSION_EXPIRED' })
        }
      } catch (error) {
        debug.error('Token refresh failed:', error)
        dispatch({ type: 'SESSION_EXPIRED' })
      } finally {
        refreshInProgress.current = false
      }
    }

    const handleAuthExpired = () => {
      dispatch({ type: 'SESSION_EXPIRED' })
      TokenManager.clearTokens()
    }

    const handleTokensUpdated = async () => {
      // Another tab updated tokens, refresh our state
      if (TokenManager.isTokenValid()) {
        try {
          const user = await authService.getCurrentUser()
          if (user) {
            dispatch({ type: 'RESTORE_SESSION', payload: user })
          }
        } catch (error) {
          debug.error('Failed to sync auth state:', error)
        }
      }
    }

    const handleTokensCleared = () => {
      // Another tab logged out
      dispatch({ type: 'LOGOUT' })
    }

    // Listen for auth events
    window.addEventListener('auth:token-refresh-needed', handleTokenRefresh)
    window.addEventListener('auth:expired', handleAuthExpired)
    window.addEventListener('auth:tokens-updated', handleTokensUpdated)
    window.addEventListener('auth:tokens-cleared', handleTokensCleared)

    return () => {
      window.removeEventListener('auth:token-refresh-needed', handleTokenRefresh)
      window.removeEventListener('auth:expired', handleAuthExpired)
      window.removeEventListener('auth:tokens-updated', handleTokensUpdated)
      window.removeEventListener('auth:tokens-cleared', handleTokensCleared)
    }
  }, [])

  // Handle storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        if (e.newValue === null) {
          // Token removed in another tab
          dispatch({ type: 'LOGOUT' })
        } else if (e.oldValue === null && e.newValue !== null) {
          // Token added in another tab (login)
          window.location.reload() // Simple reload to sync state
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Actions
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await authService.login(credentials)
      
      if (response.success && response.data) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.user })
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: response.error || 'Login failed' })
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      dispatch({ type: 'LOGIN_ERROR', payload: message })
      throw error
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await authService.register(data)
      
      if (response.success && response.data) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.user })
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: response.error || 'Registration failed' })
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      dispatch({ type: 'LOGIN_ERROR', payload: message })
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const refreshAuth = useCallback(async () => {
    if (refreshInProgress.current) return
    
    refreshInProgress.current = true
    dispatch({ type: 'REFRESH_START' })
    
    try {
      const success = await authService.refreshToken()
      if (success) {
        const user = await authService.getCurrentUser()
        if (user) {
          dispatch({ type: 'REFRESH_SUCCESS', payload: user })
        } else {
          dispatch({ type: 'SESSION_EXPIRED' })
        }
      } else {
        dispatch({ type: 'SESSION_EXPIRED' })
      }
    } catch (error) {
      debug.error('Manual refresh failed:', error)
      dispatch({ type: 'REFRESH_ERROR' })
    } finally {
      refreshInProgress.current = false
    }
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const contextValue: AuthContextType = {
    state,
    actions: {
      login,
      register,
      logout,
      refreshAuth,
      clearError
    }
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// Hook to use auth context
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking specific roles
// eslint-disable-next-line react-refresh/only-export-components
export function useRole(requiredRole: string): boolean {
  const { state: { user } } = useAuth()
  return user?.role === requiredRole
}

// Hook for auth status
export function useAuthStatus() {
  const { state } = useAuth()
  return {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    user: state.user,
    error: state.error
  }
}