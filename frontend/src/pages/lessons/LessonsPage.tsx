import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { lessonService } from '../../services/lesson'
import type { Lesson } from '../../services/lesson'

export default function LessonsPage() {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadLessons()
  }, [])

  const loadLessons = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        page: 1,
        limit: 20,
        status: 'PUBLISHED' // Only show published lessons to students
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
    navigate(`/lessons/${lessonId}`)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Lessons
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Available Lessons
            </h1>
            <p className="text-gray-600 mt-1">
              Browse and start published interactive video lessons
            </p>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
          </form>
        </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Published Lessons Available</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No published lessons found matching your search.' : 'There are no published lessons available yet. Check back later or contact your instructor.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                loadLessons()
              }}
              className="btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lessons && lessons.map((lesson) => (
            <div key={lesson.id} className="card" onClick={() => handleLessonClick(lesson.id)} style={{cursor: 'pointer'}}>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {lesson.title}
                </h3>
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

                {/* Stats */}
                <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                  {lesson.difficulty && (
                    <span className="capitalize">{lesson.difficulty}</span>
                  )}
                  {lesson.estimatedTime && (
                    <span> • {lesson.estimatedTime} min</span>
                  )}
                </div>
              </div>

              {/* Lesson Content Preview */}
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Click to start learning
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}