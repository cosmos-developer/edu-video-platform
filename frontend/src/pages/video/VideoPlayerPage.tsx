import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VideoPlayer } from '../../components/video/VideoPlayer'
import { videoService, sessionService } from '../../services/video'
import type { Video, VideoSession } from '../../services/video'

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const [video, setVideo] = useState<Video | null>(null)
  const [session, setSession] = useState<VideoSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoId) {
      navigate('/lessons')
      return
    }

    loadVideo()
  }, [videoId])

  const loadVideo = async () => {
    if (!videoId) return

    setLoading(true)
    setError(null)

    try {
      // Load video details
      const videoResponse = await videoService.getVideo(videoId)
      setVideo(videoResponse)

      // Load existing session
      try {
        const sessionResponse = await sessionService.getSessionByVideo(videoId)
        if (sessionResponse) {
          setSession(sessionResponse)
        }
      } catch (sessionError) {
        // Session might not exist yet, that's OK
        console.log('No existing session found')
      }

    } catch (err: any) {
      console.error('Error loading video:', err)
      setError(err.message || 'Failed to load video')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionStart = async (videoId: string): Promise<VideoSession> => {
    const newSession = await sessionService.startSession(videoId)
    setSession(newSession)
    return newSession
  }

  const handleProgressUpdate = async (sessionId: string, currentTime: number, totalWatchTime: number) => {
    const response = await sessionService.updateProgress(sessionId, {
      currentTime,
      totalWatchTime
    })
    
    setSession(response)
  }

  const handleMilestoneReached = async (sessionId: string, milestoneId: string, timestamp: number) => {
    await sessionService.markMilestoneReached(sessionId, {
      milestoneId,
      timestamp
    })
  }

  const handleAnswerSubmit = async (sessionId: string, questionId: string, answer: string, milestoneId: string) => {
    const response = await sessionService.submitAnswer(sessionId, {
      questionId,
      answer,
      milestoneId
    })
    
    return response
  }

  const handleSessionComplete = async (sessionId: string, finalTime: number, totalWatchTime: number) => {
    const response = await sessionService.completeSession(sessionId, {
      finalTime,
      totalWatchTime
    })
    
    setSession(response)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading video...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Video</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/lessons')}
              className="btn-primary"
            >
              Back to Lessons
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Not Found</h3>
            <p className="text-gray-600 mb-4">The requested video could not be found.</p>
            <button
              onClick={() => navigate('/lessons')}
              className="btn-primary"
            >
              Back to Lessons
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Back Navigation */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/lessons')}
          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Lessons
        </button>
      </div>

      {/* Video Group Context */}
      {video.videoGroup && (
        <div className="mb-4">
          <nav className="text-sm text-gray-500">
            <span>{video.videoGroup.title}</span>
            <span className="mx-2">›</span>
            <span className="text-gray-900">{video.title}</span>
          </nav>
        </div>
      )}

      {/* Interactive Video Player */}
      <VideoPlayer
        video={video}
        session={session}
        onSessionStart={handleSessionStart}
        onProgressUpdate={handleProgressUpdate}
        onMilestoneReached={handleMilestoneReached}
        onAnswerSubmit={handleAnswerSubmit}
        onSessionComplete={handleSessionComplete}
      />
    </div>
  )
}