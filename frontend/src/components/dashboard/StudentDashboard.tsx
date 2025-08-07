import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/auth'

interface StudentDashboardProps {
  user: User
}

interface DashboardStats {
  lessonsEnrolled: number
  lessonsCompleted: number
  totalWatchTime: number
  averageScore: number
  streak: number
  recentProgress: Array<{
    lessonTitle: string
    videoTitle: string
    progress: number
    timestamp: string
  }>
  achievements: Array<{
    title: string
    description: string
    earnedAt: string
  }>
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // This would normally fetch from API
      // For now, using mock data
      setStats({
        lessonsEnrolled: 5,
        lessonsCompleted: 2,
        totalWatchTime: 1850, // seconds
        averageScore: 85.5,
        streak: 3,
        recentProgress: [
          {
            lessonTitle: 'Introduction to React',
            videoTitle: 'Components and Props',
            progress: 75,
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            lessonTitle: 'JavaScript Fundamentals',
            videoTitle: 'Async Programming',
            progress: 100,
            timestamp: '2024-01-14T15:45:00Z'
          }
        ],
        achievements: [
          {
            title: 'First Lesson Complete',
            description: 'Completed your first lesson',
            earnedAt: '2024-01-10T12:00:00Z'
          },
          {
            title: 'High Scorer',
            description: 'Achieved over 80% average score',
            earnedAt: '2024-01-12T16:30:00Z'
          }
        ]
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
          Continue your learning journey and track your progress.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.lessonsEnrolled || 0}
          </div>
          <div className="text-sm text-gray-600">Lessons Enrolled</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {stats?.lessonsCompleted || 0}
          </div>
          <div className="text-sm text-gray-600">Lessons Completed</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {stats ? formatWatchTime(stats.totalWatchTime) : '0m'}
          </div>
          <div className="text-sm text-gray-600">Watch Time</div>
        </div>
        
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {stats?.averageScore.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Progress */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Progress
          </h3>
          
          {stats?.recentProgress && stats.recentProgress.length > 0 ? (
            <div className="space-y-4">
              {stats.recentProgress.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.lessonTitle}</h4>
                    <p className="text-sm text-gray-600">{item.videoTitle}</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.progress}% complete
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 ml-4">
                    {formatDate(item.timestamp)}
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => navigate('/lessons')}
                className="w-full mt-4 btn-primary"
              >
                Browse All Lessons
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500 mb-4">No lessons started yet</p>
              <button
                onClick={() => navigate('/lessons')}
                className="btn-primary"
              >
                Start Learning
              </button>
            </div>
          )}
        </div>

        {/* Achievements & Streak */}
        <div className="space-y-6">
          {/* Learning Streak */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Learning Streak
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">
                🔥 {stats?.streak || 0}
              </div>
              <div className="text-sm text-gray-600">
                {stats?.streak ? `${stats.streak} days in a row!` : 'Start your streak today!'}
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Achievements
            </h3>
            
            {stats?.achievements && stats.achievements.length > 0 ? (
              <div className="space-y-3">
                {stats.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-2xl mr-3">🏆</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Earned {formatDate(achievement.earnedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-gray-500">No achievements yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete lessons to earn achievements!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/lessons')}
            className="card hover:bg-gray-50 transition-colors text-center p-6"
          >
            <div className="text-3xl mb-2">📚</div>
            <div className="font-medium text-gray-900">Browse Lessons</div>
            <div className="text-sm text-gray-600 mt-1">Discover new content</div>
          </button>
          
          <button
            onClick={() => {
              // Navigate to most recent lesson
              if (stats?.recentProgress && stats.recentProgress.length > 0) {
                // This would navigate to the specific video
                navigate('/lessons')
              } else {
                navigate('/lessons')
              }
            }}
            className="card hover:bg-gray-50 transition-colors text-center p-6"
          >
            <div className="text-3xl mb-2">▶️</div>
            <div className="font-medium text-gray-900">Continue Learning</div>
            <div className="text-sm text-gray-600 mt-1">Pick up where you left off</div>
          </button>
          
          <button
            onClick={() => {
              // This would show progress/statistics page
              navigate('/lessons')
            }}
            className="card hover:bg-gray-50 transition-colors text-center p-6"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-medium text-gray-900">View Progress</div>
            <div className="text-sm text-gray-600 mt-1">Track your learning</div>
          </button>
        </div>
      </div>
    </div>
  )
}