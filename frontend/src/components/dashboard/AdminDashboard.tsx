import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/auth'

interface AdminDashboardProps {
  user: User
}

interface AdminStats {
  totalUsers: number
  totalLessons: number
  totalVideos: number
  totalWatchHours: number
  systemHealth: {
    apiStatus: 'healthy' | 'warning' | 'critical'
    dbStatus: 'healthy' | 'warning' | 'critical'
    storageUsage: number
    activeUsers: number
  }
  recentUsers: Array<{
    id: string
    name: string
    role: string
    joinedAt: string
    lastActive: string
  }>
  platformActivity: Array<{
    type: 'user_registered' | 'lesson_created' | 'video_uploaded' | 'system_alert'
    description: string
    timestamp: string
    severity?: 'info' | 'warning' | 'critical'
  }>
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // This would normally fetch from API
      // For now, using mock data
      setStats({
        totalUsers: 1247,
        totalLessons: 156,
        totalVideos: 842,
        totalWatchHours: 5420.5,
        systemHealth: {
          apiStatus: 'healthy',
          dbStatus: 'healthy',
          storageUsage: 68.5,
          activeUsers: 89
        },
        recentUsers: [
          {
            id: '1',
            name: 'Alice Johnson',
            role: 'STUDENT',
            joinedAt: '2024-01-15T10:30:00Z',
            lastActive: '2024-01-15T15:45:00Z'
          },
          {
            id: '2',
            name: 'Bob Smith',
            role: 'TEACHER',
            joinedAt: '2024-01-15T09:15:00Z',
            lastActive: '2024-01-15T14:20:00Z'
          },
          {
            id: '3',
            name: 'Carol Davis',
            role: 'STUDENT',
            joinedAt: '2024-01-14T16:45:00Z',
            lastActive: '2024-01-15T11:30:00Z'
          }
        ],
        platformActivity: [
          {
            type: 'user_registered',
            description: '5 new users registered today',
            timestamp: '2024-01-15T16:00:00Z',
            severity: 'info'
          },
          {
            type: 'lesson_created',
            description: 'Dr. Smith created "Advanced Machine Learning" lesson',
            timestamp: '2024-01-15T14:30:00Z',
            severity: 'info'
          },
          {
            type: 'system_alert',
            description: 'Database backup completed successfully',
            timestamp: '2024-01-15T12:00:00Z',
            severity: 'info'
          },
          {
            type: 'system_alert',
            description: 'Storage usage approaching 70% capacity',
            timestamp: '2024-01-15T10:15:00Z',
            severity: 'warning'
          }
        ]
      })
    } catch (error) {
      console.error('Error loading admin dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered': return '👥'
      case 'lesson_created': return '📚'
      case 'video_uploaded': return '🎥'
      case 'system_alert': return '⚠️'
      default: return '📝'
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'warning': return 'border-l-yellow-400 bg-yellow-50'
      case 'critical': return 'border-l-red-400 bg-red-50'
      default: return 'border-l-blue-400 bg-blue-50'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          System overview and platform management tools.
        </p>
      </div>

      {/* System Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.totalUsers.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {stats?.totalLessons || 0}
          </div>
          <div className="text-sm text-gray-600">Total Lessons</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {stats?.totalVideos || 0}
          </div>
          <div className="text-sm text-gray-600">Total Videos</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {stats?.totalWatchHours.toLocaleString() || 0}h
          </div>
          <div className="text-sm text-gray-600">Total Watch Hours</div>
        </div>
      </div>

      {/* System Health */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          System Health
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats?.systemHealth.apiStatus || 'healthy')}`}>
              API: {stats?.systemHealth.apiStatus || 'Unknown'}
            </div>
          </div>
          
          <div className="text-center">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats?.systemHealth.dbStatus || 'healthy')}`}>
              Database: {stats?.systemHealth.dbStatus || 'Unknown'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Storage Usage</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  (stats?.systemHealth.storageUsage || 0) > 80 
                    ? 'bg-red-600' 
                    : (stats?.systemHealth.storageUsage || 0) > 60 
                    ? 'bg-yellow-600' 
                    : 'bg-green-600'
                }`}
                style={{ width: `${stats?.systemHealth.storageUsage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.systemHealth.storageUsage || 0}% used
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.systemHealth.activeUsers || 0}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Users */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Users
          </h3>
          
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{user.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                      <span>Joined {formatDate(user.joinedAt).split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last active: {formatDate(user.lastActive).split(' ')[1]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent user activity
            </div>
          )}
        </div>

        {/* Platform Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Platform Activity
          </h3>
          
          {stats?.platformActivity && stats.platformActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.platformActivity.map((activity, index) => (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${getSeverityColor(activity.severity)}`}>
                  <div className="text-lg">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent platform activity
            </div>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/lessons')}
          className="card hover:bg-blue-50 border hover:border-blue-200 transition-all text-center p-6"
        >
          <div className="text-3xl mb-3">👥</div>
          <div className="font-semibold text-blue-600">Manage Users</div>
          <div className="text-sm text-gray-600 mt-2">
            View and manage user accounts
          </div>
        </button>

        <button
          onClick={() => navigate('/lessons')}
          className="card hover:bg-green-50 border hover:border-green-200 transition-all text-center p-6"
        >
          <div className="text-3xl mb-3">📚</div>
          <div className="font-semibold text-green-600">Content Management</div>
          <div className="text-sm text-gray-600 mt-2">
            Oversee lessons and content
          </div>
        </button>

        <button
          onClick={() => navigate('/lessons')}
          className="card hover:bg-purple-50 border hover:border-purple-200 transition-all text-center p-6"
        >
          <div className="text-3xl mb-3">📊</div>
          <div className="font-semibold text-purple-600">Analytics</div>
          <div className="text-sm text-gray-600 mt-2">
            Platform-wide analytics
          </div>
        </button>

        <button
          onClick={() => navigate('/lessons')}
          className="card hover:bg-yellow-50 border hover:border-yellow-200 transition-all text-center p-6"
        >
          <div className="text-3xl mb-3">⚙️</div>
          <div className="font-semibold text-yellow-600">System Settings</div>
          <div className="text-sm text-gray-600 mt-2">
            Configure platform settings
          </div>
        </button>
      </div>
    </div>
  )
}