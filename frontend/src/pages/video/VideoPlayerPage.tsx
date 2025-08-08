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
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)
  const [showQAPanel, setShowQAPanel] = useState(true) // Default to showing Q&A panel

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
    const milestoneProgress = await sessionService.markMilestoneReached(sessionId, {
      milestoneId,
      timestamp
    })
    
    // Update session with new milestone progress
    if (session) {
      setSession(prev => {
        // Check if milestone already exists
        const existing = prev?.milestoneProgress?.find(mp => mp.milestoneId === milestoneId)
        if (existing) {
          return prev!
        }
        
        return {
          ...prev!,
          milestoneProgress: [
            ...(prev?.milestoneProgress || []),
            {
              id: `mp_${Date.now()}`, // Generate temporary ID
              sessionId: sessionId,
              milestoneId: milestoneId,
              timestamp: timestamp,
              reachedAt: new Date().toISOString()
            }
          ]
        }
      })
    }
  }

  const handleAnswerSubmit = async (sessionId: string, questionId: string, answer: string, milestoneId: string) => {
    const response = await sessionService.submitAnswer(sessionId, {
      questionId,
      answer,
      milestoneId
    })
    
    // Update session with new question attempt
    if (session && response) {
      setSession(prev => {
        // Remove any existing attempt for this question and add the new one
        const filteredAttempts = (prev?.questionAttempts || []).filter(qa => qa.questionId !== questionId)
        
        return {
          ...prev!,
          questionAttempts: [
            ...filteredAttempts,
            {
              id: response.answer?.id || `qa_${Date.now()}`,
              studentId: prev?.studentId || '',
              questionId: questionId,
              sessionId: sessionId,
              status: response.isCorrect ? 'CORRECT' : 'INCORRECT',
              attemptNumber: 1,
              studentAnswer: { answer },
              isCorrect: response.isCorrect,
              score: response.score || 0,
              timeSpent: 0,
              hintsUsed: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              submittedAt: new Date().toISOString()
            }
          ]
        }
      })
    }
    
    return response
  }

  const handleSessionComplete = async (sessionId: string, finalTime: number, totalWatchTime: number) => {
    const response = await sessionService.completeSession(sessionId, {
      finalTime,
      totalWatchTime
    })
    
    setSession(response)
    
    // Show completion message
    if (response && response.status === 'COMPLETED') {
      setCompletionMessage(`Congratulations! You've completed ${video?.title || 'this video'}.`)
      
      // Auto-hide after 5 seconds
      setTimeout(() => setCompletionMessage(null), 5000)
    }
    
    return response
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/lessons')}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mr-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Lessons
          </button>
          
          {/* Video Group Context */}
          {video.videoGroup && (
            <nav className="text-sm text-gray-500">
              <span>{video.videoGroup.title}</span>
              <span className="mx-2">›</span>
              <span className="text-gray-900 font-medium">{video.title}</span>
            </nav>
          )}
        </div>
        
        {/* Layout Controls */}
        <button
          onClick={() => setShowQAPanel(!showQAPanel)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showQAPanel 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {showQAPanel ? 'Hide' : 'Show'} Q&A
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Section */}
        <div className={`${showQAPanel ? 'w-2/3' : 'w-full'} flex flex-col`}>
          {/* Completion Message */}
          {completionMessage && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
          
          {/* Learning Progress - Outside and above video */}
          {session && (
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {session.status === 'COMPLETED' ? '100' : Math.round((session.currentPosition / (video?.duration || 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Video Progress</div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {session.milestoneProgress?.length || 0}
                    <span className="text-sm text-gray-500">/{video?.milestones?.length || 0}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Milestones Reached</div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">
                    {session.questionAttempts?.filter(qa => qa.isCorrect).length || 0}
                    <span className="text-sm text-gray-500">/{session.questionAttempts?.length || 0}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Correct Answers</div>
                </div>
              </div>
            </div>
          )}

          {/* Video Player Container */}
          <div className="flex-1 p-6 overflow-auto">
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
        </div>
        
        {/* Q&A Panel - Side only */}
        {showQAPanel && (
          <div className="w-1/3 border-l bg-gray-50 flex flex-col">
            <div className="p-4 bg-white border-b">
              <h3 className="text-lg font-semibold text-gray-900">Questions & Answers</h3>
              <p className="text-sm text-gray-600 mt-1">Review milestone questions and your responses</p>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {video?.milestones && video.milestones.some(m => m.questions && m.questions.length > 0) ? (
                <div className="space-y-4">
                  {video.milestones
                    .filter(m => m.questions && m.questions.length > 0)
                    .map((milestone) => (
                      <div key={milestone.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              At {Math.floor(milestone.timestamp / 60)}:{(milestone.timestamp % 60).toFixed(0).padStart(2, '0')}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {milestone.questions?.length || 0} Questions
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {milestone.questions?.map((question, qIndex) => {
                            const userAttempt = session?.questionAttempts?.find(qa => qa.questionId === question.id)
                            
                            return (
                              <div key={question.id} className="border-l-2 border-gray-200 pl-3">
                                <p className="text-sm font-medium text-gray-700">
                                  Q{qIndex + 1}: {question.text || question.question}
                                </p>
                                {userAttempt ? (
                                  <div className={`mt-1 p-2 rounded text-sm ${
                                    userAttempt.isCorrect 
                                      ? 'bg-green-50 text-green-700 border border-green-200' 
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    <div className="flex items-center">
                                      {userAttempt.isCorrect ? (
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      <span className="font-medium">
                                        {userAttempt.isCorrect ? 'Correct' : 'Incorrect'}
                                      </span>
                                    </div>
                                    <p className="text-xs mt-1">
                                      Your answer: {typeof userAttempt.studentAnswer === 'object' ? userAttempt.studentAnswer.answer : userAttempt.studentAnswer}
                                    </p>
                                    {!userAttempt.isCorrect && question.questionData && (
                                      <p className="text-xs mt-1 font-medium">
                                        Correct answer: {
                                          question.type === 'MULTIPLE_CHOICE' 
                                            ? question.questionData.options?.[question.questionData.correctAnswerIndex]
                                            : question.type === 'TRUE_FALSE'
                                            ? question.questionData.correctAnswer ? 'True' : 'False'
                                            : question.questionData.correctAnswers?.[0]
                                        }
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 italic">
                                    Not answered yet
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No questions available</p>
                  <p className="text-sm text-gray-500 mt-2">Questions will appear here as you reach milestones with quiz content</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}