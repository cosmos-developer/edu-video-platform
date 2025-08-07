import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/auth'

interface TeacherDashboardProps {
  user: User
}

interface TeacherStats {
  totalLessons: number
  totalStudents: number
  totalWatchHours: number
  averageEngagement: number
  recentActivity: Array<{
    type: 'lesson_created' | 'student_completed' | 'question_answered'
    description: string
    timestamp: string
  }>
  topLessons: Array<{
    lessonId: string
    title: string
    completionRate: number
    studentCount: number
  }>
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // This would normally fetch from API
      // For now, using mock data
      setStats({
        totalLessons: 8,
        totalStudents: 45,
        totalWatchHours: 120.5,
        averageEngagement: 78.5,
        recentActivity: [
          {
            type: 'student_completed',
            description: 'Sarah Johnson completed "Introduction to React"',
            timestamp: '2024-01-15T14:30:00Z'
          },
          {
            type: 'lesson_created',
            description: 'Created new lesson "Advanced JavaScript Patterns"',
            timestamp: '2024-01-15T10:15:00Z'
          },
          {
            type: 'question_answered',
            description: '25 students answered questions in "JavaScript Fundamentals"',
            timestamp: '2024-01-14T16:45:00Z'
          }
        ],
        topLessons: [
          {
            lessonId: '1',
            title: 'Introduction to React',
            completionRate: 92,
            studentCount: 28
          },
          {
            lessonId: '2',
            title: 'JavaScript Fundamentals',
            completionRate: 85,
            studentCount: 35
          },
          {
            lessonId: '3',
            title: 'CSS Grid and Flexbox',
            completionRate: 78,
            studentCount: 22
          }
        ]
      })
    } catch (error) {
      console.error('Error loading teacher dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson_created':
        return '📚'
      case 'student_completed':
        return '🎉'
      case 'question_answered':
        return '💭'
      default:
        return '📝'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your teaching activities and student progress.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.totalLessons || 0}
          </div>
          <div className="text-sm text-gray-600">Total Lessons</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {stats?.totalStudents || 0}
          </div>
          <div className="text-sm text-gray-600">Active Students</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {stats?.totalWatchHours.toFixed(1) || 0}h
          </div>
          <div className="text-sm text-gray-600">Total Watch Hours</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {stats?.averageEngagement.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600">Avg Engagement</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => navigate('/teacher/create-lesson')}
          className="card hover:bg-blue-50 border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all text-center p-6"
        >
          <div className="text-4xl mb-3">➕</div>
          <div className="font-semibold text-blue-600">Create New Lesson</div>
          <div className="text-sm text-gray-600 mt-2">
            Start building your next interactive lesson
          </div>
        </button>

        <button
          onClick={() => navigate('/teacher/lessons')}
          className="card hover:bg-green-50 border hover:border-green-200 transition-all text-center p-6"
        >
          <div className="text-4xl mb-3">📊</div>
          <div className="font-semibold text-green-600">View Analytics</div>
          <div className="text-sm text-gray-600 mt-2">
            Track student progress and engagement
          </div>
        </button>

        <button
          onClick={() => navigate('/teacher/lessons')}
          className="card hover:bg-purple-50 border hover:border-purple-200 transition-all text-center p-6"
        >
          <div className="text-4xl mb-3">🎥</div>
          <div className="font-semibold text-purple-600">Manage Content</div>
          <div className="text-sm text-gray-600 mt-2">
            Edit existing lessons and videos
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl">{getActivityIcon(activity.type)}</div>
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
              No recent activity
            </div>
          )}
        </div>

        {/* Top Performing Lessons */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Lessons
          </h3>
          
          {stats?.topLessons && stats.topLessons.length > 0 ? (
            <div className="space-y-4">
              {stats.topLessons.map((lesson, index) => (
                <div key={lesson.lessonId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900">#{index + 1}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                        <p className="text-sm text-gray-600">
                          {lesson.studentCount} students enrolled
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {lesson.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">completion</div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => navigate('/teacher/lessons')}
                className="w-full mt-4 btn-secondary"
              >
                View All Lessons
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 mb-4">No lessons created yet</p>
              <button
                onClick={() => navigate('/teacher/create-lesson')}
                className="btn-primary"
              >
                Create Your First Lesson
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Tools Section */}
      <div className="mt-8 card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI-Powered Tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">🤖</div>
              <div>
                <h4 className="font-medium text-gray-900">AI Question Generator</h4>
                <p className="text-sm text-gray-600">
                  Automatically generate quiz questions from your video content
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mb-2">
              Available when creating milestones in your lessons
            </p>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">📈</div>
              <div>
                <h4 className="font-medium text-gray-900">Smart Analytics</h4>
                <p className="text-sm text-gray-600">
                  Get insights into student engagement and learning patterns
                </p>
              </div>
            </div>
            <p className="text-xs text-green-600 mb-2">
              Available in lesson analytics dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}