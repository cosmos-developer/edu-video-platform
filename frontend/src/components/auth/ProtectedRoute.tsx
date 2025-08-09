import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus } from '../../contexts/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'STUDENT' | 'TEACHER' | 'ADMIN'
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback = <LoadingSpinner fullScreen />,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, isLoading, user } = useAuthStatus()
  const location = useLocation()

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return <>{fallback}</>
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect based on user's actual role
    const roleRedirects = {
      STUDENT: '/dashboard',
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard'
    }
    
    const userRedirect = roleRedirects[user?.role as keyof typeof roleRedirects] || '/dashboard'
    
    return (
      <Navigate 
        to={userRedirect} 
        state={{ 
          message: `You don't have permission to access this page. Required role: ${requiredRole}` 
        }} 
        replace 
      />
    )
  }

  // All checks passed - render children
  return <>{children}</>
}

// Public route that redirects to dashboard if already authenticated
export function PublicRoute({ 
  children,
  redirectTo = '/dashboard'
}: {
  children: React.ReactNode
  redirectTo?: string
}) {
  const { isAuthenticated, isInitialized, user } = useAuthStatus()

  // Show loading while auth is initializing
  if (!isInitialized) {
    return <LoadingSpinner fullScreen />
  }

  // Already authenticated - redirect based on role
  if (isAuthenticated && user) {
    const roleRedirects = {
      STUDENT: '/dashboard',
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard'
    }
    
    const redirect = roleRedirects[user.role as keyof typeof roleRedirects] || redirectTo
    return <Navigate to={redirect} replace />
  }

  // Not authenticated - show public content
  return <>{children}</>
}