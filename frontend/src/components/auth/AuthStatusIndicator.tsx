import { useEffect, useState } from 'react'
import { useAuthStatus } from '../../contexts/AuthContext'
import TokenManager from '../../services/tokenManager'

export function AuthStatusIndicator() {
  const { isAuthenticated, user } = useAuthStatus()
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const updateExpiry = () => {
      const time = TokenManager.getTimeUntilExpiry()
      setTimeUntilExpiry(time)
      
      // Show warning if less than 5 minutes
      setShowWarning(time > 0 && time < 5 * 60 * 1000)
    }

    // Update immediately
    updateExpiry()

    // Update every second
    const interval = setInterval(updateExpiry, 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  if (!isAuthenticated || !user) return null

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Normal status indicator */}
      <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className={`h-3 w-3 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {user.role} • {user.email}
            </p>
          </div>
        </div>

        {/* Session expiry warning */}
        {showWarning && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center text-amber-600">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">
                Session expires in {formatTime(timeUntilExpiry)}
              </span>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('auth:token-refresh-needed'))}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Extend session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Minimal auth indicator for navbar
export function AuthBadge() {
  const { isAuthenticated, user } = useAuthStatus()
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const checkExpiry = () => {
      const time = TokenManager.getTimeUntilExpiry()
      setIsExpiringSoon(time > 0 && time < 5 * 60 * 1000)
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [isAuthenticated])

  if (!isAuthenticated || !user) return null

  return (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${isExpiringSoon ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-700">{user.firstName}</span>
      <span className="text-xs text-gray-500">({user.role})</span>
    </div>
  )
}