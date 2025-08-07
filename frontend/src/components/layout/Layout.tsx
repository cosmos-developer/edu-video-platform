import { useAuth } from '../../hooks/useAuth'
import { 
  HomeIcon, 
  BookOpenIcon, 
  UserIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Lessons', href: '/lessons', icon: BookOpenIcon },
  ]

  // Add admin/teacher specific navigation
  if (user?.role === 'ADMIN' || user?.role === 'TEACHER') {
    navigation.push(
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">
              Learning Platform
            </h1>
          </div>
          
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'mr-3 flex-shrink-0 h-6 w-6',
                        isActive
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User section */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                    {user?.avatar ? (
                      <img
                        className="h-full w-full object-cover"
                        src={user.avatar}
                        alt=""
                      />
                    ) : (
                      <UserIcon className="h-full w-full text-gray-400 p-2" />
                    )}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 capitalize">
                    {user?.role.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="ml-3 p-1 rounded-full text-gray-400 hover:text-gray-600"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}