import { useAuth } from '../../hooks/useAuth'
import { StudentDashboard } from '../../components/dashboard/StudentDashboard'
import { TeacherDashboard } from '../../components/dashboard/TeacherDashboard'
import { AdminDashboard } from '../../components/dashboard/AdminDashboard'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render role-based dashboard
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard user={user} />
    case 'TEACHER':
      return <TeacherDashboard user={user} />
    case 'STUDENT':
    default:
      return <StudentDashboard user={user} />
  }
}