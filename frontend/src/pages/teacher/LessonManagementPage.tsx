import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoService } from '../../services/video'
import { type LessonWithVideos, type VideoGroup, type Video } from '../../services/lesson'
import { debug } from '../../utils/debug'
import type { Milestone } from '../../services/video'
import { BaseLessonPage } from '../../components/lessons/BaseLessonPage'
import { VideoList } from '../../components/lessons/VideoList'
import { useAuth } from '../../hooks/useAuth'
import { useVideoState } from '../../hooks/useVideoState'
import { useVideoStateManager } from '../../contexts/VideoStateContext'
import { VideoUploadForm } from '../../components/teacher/VideoUploadForm'
import { MilestoneEditor } from '../../components/teacher/MilestoneEditor'
import { QuestionEditor } from '../../components/teacher/QuestionEditor'
import { AIQuestionGenerator } from '../../components/teacher/AIQuestionGenerator'

// Wrapper component to handle VideoGroup creation
interface VideoUploadFormWrapperProps {
  lesson: LessonWithVideos | null
  videoGroups: VideoGroup[]
  onVideoUploaded: () => void
  onClose: () => void
  getOrCreateVideoGroup: () => Promise<string>
}

function VideoUploadFormWrapper({ onVideoUploaded, onClose, getOrCreateVideoGroup }: VideoUploadFormWrapperProps) {
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
        debug.error('Error getting video group:', err)
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
  const manager = useVideoStateManager()
  
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  
  // Use unified video state
  const { state: videoState, milestones, metadata } = useVideoState(selectedVideoId || undefined)
  
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const [showMilestoneEditor, setShowMilestoneEditor] = useState(false)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  useEffect(() => {
    if (!lessonId) {
      navigate('/dashboard')
      return
    }
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

  if (!lessonId) {
    return null
  }

  // Wrap with BaseLessonPage for unified data loading
  return (
    <BaseLessonPage lessonId={lessonId} role={user?.role as 'TEACHER' | 'ADMIN'}>
      {({ lesson, videoGroups, loading, error, onVideoSelect, refreshLesson }) => {
        // Check ownership inside the render function
        if (lesson && lesson.createdById !== user?.id && user?.role !== 'ADMIN') {
          return (
            <div className="p-6">
              <div className="card text-center py-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-gray-600 mb-4">You do not have permission to manage this lesson</p>
                <button onClick={() => navigate('/dashboard')} className="btn-primary">
                  Back to Dashboard
                </button>
              </div>
            </div>
          )
        }

        const handleVideoAdded = () => {
          refreshLesson()
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
            debug.error('Error creating video group:', error)
            throw error
          }
        }

        const handleMilestoneAdded = async (milestone: Milestone) => {
          if (selectedVideoId) {
            // Add milestone through VideoStateManager - will update all subscribers
            await manager.addMilestone(selectedVideoId, milestone)
          }
          setShowMilestoneEditor(false)
        }

        const handleVideoSelect = async (video: Video) => {
          try {
            // Set selected video ID - useVideoState hook will handle loading
            setSelectedVideoId(video.id)
            // Load video into state manager
            await manager.loadVideo(video.id)
            // Also update the base component's selection
            onVideoSelect(video)
          } catch (error) {
            debug.error('Error loading video details:', error)
          }
        }

        const handleMilestoneSelect = (milestone: Milestone) => {
          setSelectedMilestone(milestone)
          setShowQuestionEditor(true)
        }

        const handleAIQuestionsGenerated = () => {
          setShowAIGenerator(false)
          // No need to reload - VideoStateManager will notify all subscribers
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
            
            <VideoList
              videoGroups={videoGroups}
              selectedVideoId={selectedVideoId}
              onVideoSelect={handleVideoSelect}
              showManageButtons={true}
              onUploadClick={() => setShowVideoUpload(true)}
            />
          </div>
        </div>

        {/* Video Details & Milestones */}
        <div className="lg:col-span-2">
          {videoState ? (
            <div className="space-y-6">
              {/* Video Details */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Details</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{videoState.video.title}</h3>
                    {videoState.video.description && (
                      <p className="text-gray-600 mt-1">{videoState.video.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Duration: {formatDuration(videoState.video.duration)}
                    </div>
                    <button
                      onClick={() => navigate(`/video/${videoState.video.id}`)}
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

                {milestones && milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones
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
                              {metadata?.questionsPerMilestone.get(milestone.id) || 0} questions
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

      {showMilestoneEditor && videoState && (
        <MilestoneEditor
          video={videoState.video}
          milestone={selectedMilestone}
          onMilestoneAdded={handleMilestoneAdded}
          onClose={() => setShowMilestoneEditor(false)}
        />
      )}

      {showQuestionEditor && selectedMilestone && (
        <QuestionEditor
          milestone={selectedMilestone}
          videoId={selectedVideoId || undefined}
          onClose={() => setShowQuestionEditor(false)}
        />
      )}

      {showAIGenerator && videoState && (
        <AIQuestionGenerator
          video={videoState.video}
          milestone={selectedMilestone || undefined}
          onQuestionsGenerated={handleAIQuestionsGenerated}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
          </div>
        )
      }}
    </BaseLessonPage>
  )
}