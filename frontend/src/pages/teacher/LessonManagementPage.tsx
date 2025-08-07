import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoService } from '../../services/video'
import { lessonService } from '../../services/lesson'
import type { VideoGroup, Video, Milestone } from '../../services/video'
import type { Lesson } from '../../services/lesson'
import { useAuth } from '../../hooks/useAuth'
import { VideoUploadForm } from '../../components/teacher/VideoUploadForm'
import { MilestoneEditor } from '../../components/teacher/MilestoneEditor'
import { QuestionEditor } from '../../components/teacher/QuestionEditor'
import { AIQuestionGenerator } from '../../components/teacher/AIQuestionGenerator'

// Wrapper component to handle VideoGroup creation
interface VideoUploadFormWrapperProps {
  lesson: Lesson | null
  videoGroups: VideoGroup[]
  onVideoUploaded: (video: Video) => void
  onClose: () => void
  getOrCreateVideoGroup: () => Promise<string>
}

function VideoUploadFormWrapper({ lesson, videoGroups, onVideoUploaded, onClose, getOrCreateVideoGroup }: VideoUploadFormWrapperProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  useEffect(() => {
    const initializeVideoGroup = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const id = await getOrCreateVideoGroup()
        setGroupId(id)
      } catch (err: any) {
        console.error('Error getting video group:', err)
        setError(err.message || 'Failed to initialize video group')
      } finally {
        setLoading(false)
      }
    }

    initializeVideoGroup()
  }, [getOrCreateVideoGroup])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing video upload...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!groupId) {
    return null
  }

  return (
    <VideoUploadForm
      groupId={groupId}
      onVideoUploaded={onVideoUploaded}
      onClose={onClose}
    />
  )
}

export default function LessonManagementPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [videoGroups, setVideoGroups] = useState<VideoGroup[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const [showMilestoneEditor, setShowMilestoneEditor] = useState(false)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  useEffect(() => {
    if (!lessonId) {
      navigate('/dashboard')
      return
    }
    loadLesson()
  }, [lessonId])

  // Check if user has permission
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return (
      <div className="p-6">
        <div className="card text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">Only teachers and administrators can manage lessons.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const loadLesson = async () => {
    if (!lessonId) return

    setLoading(true)
    setError(null)

    try {
      const lessonData = await lessonService.getLesson(lessonId)
      
      // Check if user owns this lesson or is admin
      if (lessonData.createdById !== user?.id && user?.role !== 'ADMIN') {
        throw new Error('You do not have permission to manage this lesson')
      }

      setLesson(lessonData)
      
      // If lesson has video groups, we can set them (from API response or fetch separately)
      if ('videoGroups' in lessonData) {
        setVideoGroups((lessonData as any).videoGroups || [])
      }
    } catch (err: any) {
      console.error('Error loading lesson:', err)
      setError(err.message || 'Failed to load lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoAdded = (video: Video) => {
    // For now, we'll refresh the lesson data to get updated video groups
    loadLesson()
    setShowVideoUpload(false)
  }

  const getOrCreateVideoGroup = async (): Promise<string> => {
    if (!lesson) throw new Error('No lesson available')
    
    // If lesson already has video groups, use the first one
    if (videoGroups.length > 0) {
      return videoGroups[0].id
    }
    
    // Create a default video group for this lesson
    try {
      const videoGroup = await videoService.createVideoGroup({
        title: `${lesson.title} - Videos`,
        description: `Video group for lesson: ${lesson.title}`,
        lessonId: lesson.id
      })
      return videoGroup.id
    } catch (error) {
      console.error('Error creating video group:', error)
      throw error
    }
  }

  const handleMilestoneAdded = (milestone: Milestone) => {
    if (selectedVideo) {
      setSelectedVideo(prev => prev ? {
        ...prev,
        milestones: [...(prev.milestones || []), milestone]
      } : null)
    }
    setShowMilestoneEditor(false)
  }

  const handleVideoSelect = async (video: Video) => {
    try {
      // Load video details with milestones
      const response = await videoService.getVideo(video.id)
      setSelectedVideo(response)
    } catch (error) {
      console.error('Error loading video details:', error)
    }
  }

  const handleMilestoneSelect = (milestone: Milestone) => {
    setSelectedMilestone(milestone)
    setShowQuestionEditor(true)
  }

  const handleAIQuestionsGenerated = () => {
    setShowAIGenerator(false)
    // Reload the selected video to get updated milestones/questions
    if (selectedVideo) {
      handleVideoSelect(selectedVideo)
    }
  }

  const handlePreviewLesson = () => {
    const allVideos = videoGroups.flatMap(group => group.videos || [])
    if (allVideos.length > 0) {
      navigate(`/video/${allVideos[0].id}`)
    }
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
        <div className="card text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Lesson</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
            <p className="text-gray-600 mt-1">{lesson.description}</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handlePreviewLesson}
              disabled={videoGroups.flatMap(g => g.videos || []).length === 0}
              className={`btn-secondary ${
                videoGroups.flatMap(g => g.videos || []).length === 0
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
            >
              Preview Lesson
            </button>
            <button
              onClick={() => setShowVideoUpload(true)}
              className="btn-primary"
            >
              Add Video
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Videos</h2>
            
            {videoGroups.flatMap(g => g.videos || []).length > 0 ? (
              <div className="space-y-3">
                {videoGroups.flatMap(g => g.videos || []).map((video, index) => (
                  <div
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVideo?.id === video.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-12 h-8 bg-gray-300 rounded overflow-hidden mr-3">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {index + 1}. {video.title}
                        </h4>
                        <div className="text-sm text-gray-500">
                          {formatDuration(video.duration)}
                          {video._count && video._count.milestones > 0 && (
                            <span className="ml-2">• {video._count.milestones} milestones</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 mb-4">No videos added yet</p>
                <button
                  onClick={() => setShowVideoUpload(true)}
                  className="btn-primary"
                >
                  Upload First Video
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Details & Milestones */}
        <div className="lg:col-span-2">
          {selectedVideo ? (
            <div className="space-y-6">
              {/* Video Details */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Details</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedVideo.title}</h3>
                    {selectedVideo.description && (
                      <p className="text-gray-600 mt-1">{selectedVideo.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Duration: {formatDuration(selectedVideo.duration)}
                    </div>
                    <button
                      onClick={() => navigate(`/video/${selectedVideo.id}`)}
                      className="btn-secondary"
                    >
                      Preview Video
                    </button>
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Interactive Milestones</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAIGenerator(true)}
                      className="btn-secondary"
                    >
                      AI Generate
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMilestone(null)
                        setShowMilestoneEditor(true)
                      }}
                      className="btn-primary"
                    >
                      Add Milestone
                    </button>
                  </div>
                </div>

                {selectedVideo.milestones && selectedVideo.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {selectedVideo.milestones
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((milestone) => (
                        <div
                          key={milestone.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleMilestoneSelect(milestone)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  milestone.type === 'QUIZ' 
                                    ? 'bg-red-100 text-red-700'
                                    : milestone.type === 'CHECKPOINT'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {milestone.type}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {Math.floor(milestone.timestamp / 60)}:
                                  {(milestone.timestamp % 60).toFixed(0).padStart(2, '0')}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mt-1">
                                {milestone.title}
                              </h4>
                              {milestone.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {milestone.description}
                                </p>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {milestone._count?.questions || 0} questions
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 mb-4">No milestones added yet</p>
                    <button
                      onClick={() => {
                        setSelectedMilestone(null)
                        setShowMilestoneEditor(true)
                      }}
                      className="btn-primary"
                    >
                      Add First Milestone
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Video</h3>
                <p className="text-gray-600">
                  Choose a video from the list to manage its milestones and interactive elements.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showVideoUpload && lessonId && (
        <VideoUploadFormWrapper
          lesson={lesson}
          videoGroups={videoGroups}
          onVideoUploaded={handleVideoAdded}
          onClose={() => setShowVideoUpload(false)}
          getOrCreateVideoGroup={getOrCreateVideoGroup}
        />
      )}

      {showMilestoneEditor && selectedVideo && (
        <MilestoneEditor
          video={selectedVideo}
          milestone={selectedMilestone}
          onMilestoneAdded={handleMilestoneAdded}
          onClose={() => setShowMilestoneEditor(false)}
        />
      )}

      {showQuestionEditor && selectedMilestone && (
        <QuestionEditor
          milestone={selectedMilestone}
          onClose={() => setShowQuestionEditor(false)}
        />
      )}

      {showAIGenerator && selectedVideo && (
        <AIQuestionGenerator
          video={selectedVideo}
          milestone={selectedMilestone || undefined}
          onQuestionsGenerated={handleAIQuestionsGenerated}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  )
}