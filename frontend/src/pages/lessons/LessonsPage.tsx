import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { videoService } from '../../services/video'
import type { VideoGroup } from '../../services/video'

export default function LessonsPage() {
  const navigate = useNavigate()
  const [videoGroups, setVideoGroups] = useState<VideoGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadVideoGroups()
  }, [])

  const loadVideoGroups = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await videoService.getVideoGroups({
        page: 1,
        limit: 20,
        search: searchTerm
      })

      setVideoGroups(response.items)
    } catch (err: any) {
      console.error('Error loading video groups:', err)
      setError(err.message || 'Failed to load lessons')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadVideoGroups()
  }

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`)
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Interactive Lessons
        </h1>
        
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

      {videoGroups.length === 0 && !loading && !error ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lessons Available</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No lessons found matching your search.' : 'There are no lessons available yet.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                loadVideoGroups()
              }}
              className="btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {videoGroups.map((group) => (
            <div key={group.id} className="card">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {group.title}
                </h3>
                {group.description && (
                  <p className="text-gray-600 mb-3">
                    {group.description}
                  </p>
                )}
                
                {/* Tags */}
                {group.tags && group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {group.tags.map((tag, index) => (
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
                <div className="text-sm text-gray-500 mb-4">
                  {group._count?.videos} video{group._count?.videos !== 1 ? 's' : ''} • 
                  {group.isPublic ? ' Public' : ' Private'}
                </div>
              </div>

              {/* Videos List */}
              {group.videos && group.videos.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Videos:</h4>
                  {group.videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => handleVideoClick(video.id)}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-12 bg-gray-300 rounded overflow-hidden mr-3">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 mb-1">
                          {video.title}
                        </h5>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span>{formatDuration(video.duration)}</span>
                          {video._count && video._count.milestones > 0 && (
                            <span>{video._count.milestones} interactive moments</span>
                          )}
                        </div>
                      </div>

                      {/* Play Icon */}
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No videos in this lesson yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}