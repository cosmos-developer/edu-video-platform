import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { lessonService } from '../../services/lesson'
import { useAuth } from '../../hooks/useAuth'
import type { Lesson } from '../../services/lesson'

export default function TeacherLessonsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('ALL')

  // Check if user is teacher or admin
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return (
      <div className="p-6">
        <div className="card text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">Only teachers and administrators can access this page.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadLessons()
  }, [statusFilter])

  const loadLessons = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        page: 1,
        limit: 50,
        createdById: user?.id // Show only lessons created by this teacher
      }
      
      // Apply status filter
      if (statusFilter !== 'ALL') {
        params.status = statusFilter
      }
      
      // Only include search if it's not empty
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim()
      }
      
      const response = await lessonService.getLessons(params)
      setLessons(response?.items || [])
    } catch (err: any) {
      console.error('Error loading lessons:', err)
      setError(err.message || 'Failed to load lessons')
      setLessons([]) // Ensure lessons is always an array
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadLessons()
  }

  const handleLessonClick = (lessonId: string) => {
    navigate(`/teacher/lessons/${lessonId}`)
  }

  const handlePublishLesson = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigating to lesson management
    try {
      await lessonService.publishLesson(lessonId)
      loadLessons() // Refresh the list
    } catch (err: any) {
      console.error('Error publishing lesson:', err)
      // Show error notification (you could add a toast here)
      alert(err.message || 'Failed to publish lesson')
    }
  }

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigating to lesson management
    
    // Confirm deletion
    const confirmed = confirm(
      `Are you sure you want to delete "${lessonTitle}"?\n\nThis action cannot be undone and will permanently remove the lesson and all its content.\n\nNote: Lessons with student progress cannot be deleted and must be archived instead.`
    )
    
    if (!confirmed) return

    try {
      await lessonService.deleteLesson(lessonId)
      loadLessons() // Refresh the list
    } catch (err: any) {
      console.error('Error deleting lesson:', err)
      // Show error notification (you could add a toast here)
      alert(err.message || 'Failed to delete lesson')
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-700'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-700'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          My Lessons
        </h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lessons...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Lessons
          </h1>
          <p className="text-gray-600 mt-1">
            Create, edit, publish, and manage your lessons
          </p>
        </div>
        
        <button
          onClick={() => navigate('/teacher/create-lesson')}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Lesson</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1">
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {lessons && lessons.length === 0 && !loading && !error ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lessons Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No lessons found matching your search.' : 'You haven\'t created any lessons yet.'}
          </p>
          {searchTerm ? (
            <button
              onClick={() => {
                setSearchTerm('')
                loadLessons()
              }}
              className="btn-secondary mr-3"
            >
              Clear Search
            </button>
          ) : null}
          <button
            onClick={() => navigate('/teacher/create-lesson')}
            className="btn-primary"
          >
            Create Your First Lesson
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lessons && lessons.map((lesson) => (
            <div 
              key={lesson.id} 
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleLessonClick(lesson.id)}
            >
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {lesson.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(lesson.status)}`}>
                    {lesson.status}
                  </span>
                </div>
                
                {lesson.description && (
                  <p className="text-gray-600 mb-3">
                    {lesson.description}
                  </p>
                )}
                
                {/* Tags */}
                {lesson.tags && lesson.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lesson.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Lesson Info */}
                <div className="text-sm text-gray-500 mb-4 flex items-center gap-4">
                  {lesson.difficulty && (
                    <span className="capitalize">{lesson.difficulty}</span>
                  )}
                  {lesson.estimatedTime && (
                    <span>{lesson.estimatedTime} min</span>
                  )}
                  <span>
                    Created {new Date(lesson.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit Lesson</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {lesson.status === 'DRAFT' && (
                    <button
                      onClick={(e) => handlePublishLesson(lesson.id, e)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => handleDeleteLesson(lesson.id, lesson.title, e)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors flex items-center space-x-1"
                    title="Delete lesson permanently"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}