import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VideoPlayer } from '../../components/video/VideoPlayer'
import { sessionService } from '../../services/video'
import type { VideoSession } from '../../services/video'
import { useVideoState, useSessionState } from '../../hooks/useVideoState'
import { useVideoStateManager } from '../../contexts/VideoStateContext'

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const manager = useVideoStateManager()
  
  // Use unified state
  const { video, loading: videoLoading, error: videoError } = useVideoState(videoId)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { session, metadata: sessionMeta } = useSessionState(sessionId || undefined)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)

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
      // Load video through VideoStateManager
      await manager.loadVideo(videoId)

      // Load existing session
      try {
        const sessionResponse = await sessionService.getSessionByVideo(videoId)
        if (sessionResponse) {
          setSessionId(sessionResponse.id)
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
    const sessionState = await manager.startOrResumeSession(videoId)
    setSessionId(sessionState.session.id)
    return sessionState.session
  }

  const handleProgressUpdate = async (sessionId: string, currentTime: number, totalWatchTime: number) => {
    await manager.updateSessionProgress(sessionId, currentTime, totalWatchTime)
  }

  const handleMilestoneReached = async (sessionId: string, milestoneId: string, timestamp: number) => {
    await manager.markMilestoneReached(sessionId, milestoneId, timestamp)
  }

  const handleAnswerSubmit = async (sessionId: string, questionId: string, answer: string, milestoneId: string) => {
    return await manager.submitAnswer(sessionId, questionId, answer, milestoneId)
  }

  const handleSessionComplete = async (sessionId: string, finalTime: number, totalWatchTime: number) => {
    const response = await sessionService.completeSession(sessionId, {
      finalTime,
      totalWatchTime
    })
    
    // Show completion message
    if (response.status === 'COMPLETED') {
      setCompletionMessage(`Congratulations! You've completed ${video?.title || 'this video'}.`)
      
      // Auto-hide after 5 seconds
      setTimeout(() => setCompletionMessage(null), 5000)
    }
  }

  if (loading || videoLoading) {
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

  if (error || videoError) {
    return (
      <div className="p-6">
        <div className="card">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Video</h3>
            <p className="text-gray-600 mb-4">{error || videoError}</p>
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

      {/* Completion Message */}
      {completionMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-green-800 font-medium">{completionMessage}</p>
              <div className="flex items-center space-x-4 mt-2">
                <button
                  onClick={() => navigate('/lessons')}
                  className="text-sm text-green-600 hover:text-green-700 underline"
                >
                  Back to Lessons
                </button>
                {video?.videoGroup && (
                  <button
                    onClick={() => navigate(`/lessons/${video.videoGroup?.id}`)}
                    className="text-sm text-green-600 hover:text-green-700 underline"
                  >
                    Continue Lesson Series
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setCompletionMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Learning Progress - Use unified state metadata */}
      {(session || sessionMeta) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">
              {sessionMeta?.completionPercentage || 
               (session?.status === 'COMPLETED' ? '100' : 
                Math.round((session?.currentPosition || 0) / (video?.duration || 1) * 100))}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Progress</div>
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {session?.milestoneProgress?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Milestones Reached</div>
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sessionMeta?.correctAnswers || 
               session?.questionAttempts?.filter((qa: any) => qa.isCorrect).length || 0}
              <span className="text-sm text-gray-500">/
                {sessionMeta?.totalAnswers || 
                 session?.questionAttempts?.length || 0}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Correct Answers</div>
          </div>
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
      
      {/* Related Videos */}
      {/* TODO: Load related videos from the same video group */}
      {false && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">More from this Lesson</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[].map((relatedVideo: any) => (
                <div
                  key={relatedVideo.id}
                  onClick={() => navigate(`/video/${relatedVideo.id}`)}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                    {relatedVideo.thumbnailUrl ? (
                      <img
                        src={relatedVideo.thumbnailUrl}
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">{relatedVideo.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {relatedVideo.duration ? `${Math.floor(relatedVideo.duration / 60)}:${(relatedVideo.duration % 60).toFixed(0).padStart(2, '0')}` : 'Unknown duration'}
                  </p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}