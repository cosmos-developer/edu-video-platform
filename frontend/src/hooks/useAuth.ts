import { useAuth as useAuthContext } from '../contexts/AuthContext'

// Compatibility wrapper for the old API
export function useAuth() {
  const context = useAuthContext()
  
  // Map the new API to the old API for backward compatibility
  return {
    user: context.state.user,
    isAuthenticated: context.state.isAuthenticated,
    isLoading: context.state.isLoading,
    isInitialized: context.state.isInitialized,
    error: context.state.error,
    login: context.actions.login,
    register: context.actions.register,
    logout: context.actions.logout,
    refreshToken: context.actions.refreshAuth,
    tokens: null // Deprecated - tokens are managed internally
  }
}