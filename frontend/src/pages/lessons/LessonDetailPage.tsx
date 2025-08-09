import { useParams, useNavigate } from 'react-router-dom'
import { BaseLessonPage } from '../../components/lessons/BaseLessonPage'
import type { Video } from '../../services/lesson'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    navigate('/lessons')
    return null
  }

  // Use BaseLessonPage for unified data loading
  return (
    <BaseLessonPage lessonId={id} role="STUDENT">
      {({ lesson, videoGroups, loading, error }) => {
        const handleVideoClick = (video: Video) => {
          // Navigate to video player page
          navigate(`/video/${video.id}`)
        }

        const formatDuration = (seconds: number | null) => {
          if (!seconds) return 'Unknown duration'
          const mins = Math.floor(seconds / 60)
          const secs = seconds % 60
          return `${mins}:${secs.toString().padStart(2, '0')}`
        }

        if (loading) {
          return (
            <div className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading lesson...</p>
                </div>
              </div>
            </div>
          )
        }

        if (error) {
          return (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-red-700">{error}</p>
                    <button
                      onClick={() => navigate('/lessons')}
                      className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Back to lessons
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        if (!lesson) {
          return (
            <div className="p-6">
              <p className="text-gray-600">Lesson not found</p>
              <button
                onClick={() => navigate('/lessons')}
                className="mt-2 text-blue-600 hover:text-blue-500 underline"
              >
                Back to lessons
              </button>
            </div>
          )
        }

        return (
          <div className="p-6">
            {/* Lesson Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate('/lessons')}
                className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to lessons
              </button>

              <h1 className="text-3xl font-bold text-gray-900 mb-3">{lesson.title}</h1>
              
              {lesson.description && (
                <p className="text-lg text-gray-600 mb-4">{lesson.description}</p>
              )}

              {/* Lesson Metadata */}
              <div className="flex flex-wrap gap-4 mb-4">
                {lesson.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    lesson.difficulty === 'beginner' 
                      ? 'bg-green-100 text-green-700'
                      : lesson.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}
                  </span>
                )}
                
                {lesson.estimatedTime && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {lesson.estimatedTime} min
                  </span>
                )}

                {lesson.createdBy && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {lesson.createdBy.firstName} {lesson.createdBy.lastName}
                  </span>
                )}
              </div>

              {/* Tags */}
              {lesson.tags && lesson.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lesson.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Student Progress (if available) */}
            {lesson.studentProgress && lesson.studentProgress.length > 0 && (
              <div className="mb-8 card bg-blue-50 border-blue-200">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Your Progress</h2>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${lesson.studentProgress[0].completionPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-blue-900 font-medium">
                    {lesson.studentProgress[0].completionPercent}%
                  </span>
                </div>
              </div>
            )}

            {/* Learning Objectives */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <div className="mb-8 card">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Learning Objectives</h2>
                <ul className="space-y-2">
                  {lesson.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Video Content */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Content</h2>
              
              {videoGroups.length === 0 ? (
                <div className="card text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600">No videos available for this lesson yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {videoGroups.map((group) => (
                    <div key={group.id} className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{group.title}</h3>
                      
                      {group.description && (
                        <p className="text-gray-600 mb-4">{group.description}</p>
                      )}
                      
                      {group.videos && group.videos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.videos.map((video) => (
                            <div
                              key={video.id}
                              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => handleVideoClick(video)}
                            >
                              {/* Video Thumbnail */}
                              <div className="aspect-video bg-gray-100 relative">
                                {video.thumbnailPath || video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl || `/api/v1/videos/${video.id}/thumbnail`}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                
                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-opacity">
                                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                                
                                {/* Duration Badge */}
                                {video.duration && (
                                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                                    {formatDuration(video.duration)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Video Info */}
                              <div className="p-3">
                                <h4 className="font-medium text-gray-900 mb-1">{video.title}</h4>
                                {video.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                                )}
                                
                                {/* Video Stats */}
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  {video._count?.milestones !== undefined && video._count.milestones > 0 && (
                                    <span className="flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                      {video._count.milestones} milestones
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600">No videos in this group yet.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Learning Button */}
            {videoGroups.length > 0 && videoGroups.some(g => g.videos && g.videos.length > 0) && (
              <div className="text-center">
                <button
                  onClick={() => {
                    // Find the first video and navigate to it
                    const firstVideo = videoGroups.find(g => g.videos && g.videos.length > 0)?.videos[0]
                    if (firstVideo) {
                      handleVideoClick(firstVideo)
                    }
                  }}
                  className="btn-primary text-lg px-8 py-3"
                >
                  Start Learning
                </button>
              </div>
            )}
          </div>
        )
      }}
    </BaseLessonPage>
  )
}