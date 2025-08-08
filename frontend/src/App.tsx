import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { VideoStateProvider } from './contexts/VideoStateContext'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import LessonsPage from './pages/lessons/LessonsPage'
import LessonDetailPage from './pages/lessons/LessonDetailPage'
import VideoPlayerPage from './pages/video/VideoPlayerPage'
import CreateLessonPage from './pages/teacher/CreateLessonPage'
import TeacherLessonsPage from './pages/teacher/TeacherLessonsPage'
import LessonManagementPage from './pages/teacher/LessonManagementPage'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VideoStateProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                } 
              />
              
              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/lessons" element={<LessonsPage />} />
                        <Route path="/lessons/:id" element={<LessonDetailPage />} />
                        <Route path="/video/:videoId" element={<VideoPlayerPage />} />
                        <Route path="/teacher/create-lesson" element={<CreateLessonPage />} />
                        <Route path="/teacher/lessons" element={<TeacherLessonsPage />} />
                        <Route path="/teacher/lessons/:lessonId" element={<LessonManagementPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </VideoStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
