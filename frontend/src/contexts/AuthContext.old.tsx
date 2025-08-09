import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthContextType, AuthTokens, LoginCredentials, RegisterData, User } from '../types/auth'
import { authService } from '../services/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const storedTokens = authService.getStoredTokens()
      
      if (storedTokens) {
        try {
          // Try to get current user with stored tokens
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
            setTokens(storedTokens)
          } else {
            // Invalid tokens, clear them
            authService.logout()
          }
        } catch (error) {
          // Error getting user, clear tokens
          authService.logout()
        }
      }
      
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      
      if (response.success && response.data) {
        setUser(response.data.user)
        setTokens(response.data.tokens)
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await authService.register(data)
      
      if (response.success && response.data) {
        setUser(response.data.user)
        setTokens(response.data.tokens)
      } else {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = (): void => {
    authService.logout()
    setUser(null)
    setTokens(null)
  }

  const refreshToken = async (): Promise<void> => {
    try {
      const success = await authService.refreshToken()
      if (!success) {
        logout()
      } else {
        // Update tokens state
        const newTokens = authService.getStoredTokens()
        if (newTokens) {
          setTokens(newTokens)
        }
      }
    } catch (error) {
      logout()
    }
  }

  const contextValue: AuthContextType = {
    user,
    tokens,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}