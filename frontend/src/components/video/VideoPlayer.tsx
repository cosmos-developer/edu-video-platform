import { useState, useRef, useEffect } from 'react'
import type { Video, VideoSession, Milestone } from '../../services/video'
import { videoService } from '../../services/video'
import { QuestionOverlay } from './QuestionOverlay'
import { VideoControls } from './VideoControls'

interface VideoPlayerProps {
  video: Video
  session?: VideoSession | null
  onSessionStart: (videoId: string) => Promise<VideoSession>
  onProgressUpdate: (sessionId: string, currentTime: number, totalWatchTime: number) => Promise<void>
  onMilestoneReached: (sessionId: string, milestoneId: string, timestamp: number) => Promise<void>
  onAnswerSubmit: (sessionId: string, questionId: string, answer: string, milestoneId: string) => Promise<{ isCorrect: boolean; explanation?: string }>
  onSessionComplete: (sessionId: string, finalTime: number, totalWatchTime: number) => Promise<VideoSession | void>
}

export function VideoPlayer({
  video,
  session,
  onSessionStart,
  onProgressUpdate,
  onMilestoneReached,
  onAnswerSubmit,
  onSessionComplete
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(session || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null)
  const [totalWatchTime, setTotalWatchTime] = useState(0)
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [showQuestionOverlay, setShowQuestionOverlay] = useState(false)
  const [showMilestoneNotification, setShowMilestoneNotification] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processedMilestones, setProcessedMilestones] = useState<Set<string>>(new Set())

  // Progress tracking
  const progressUpdateInterval = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastProgressUpdate = useRef<number>(0)
  const isProcessingMilestone = useRef<boolean>(false)

  useEffect(() => {
    if (session) {
      setCurrentSession(session)
      setTotalWatchTime(session.totalWatchTime)
      
      // Initialize processed milestones from session
      if (session.milestoneProgress) {
        const reached = new Set(session.milestoneProgress.map(mp => mp.milestoneId))
        setProcessedMilestones(reached)
      }
      
      // Resume video from last position
      if (videoRef.current && session.currentTime > 0) {
        videoRef.current.currentTime = session.currentTime
      }
    }
  }, [session])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      
      // Resume from session position
      if (currentSession?.currentTime) {
        video.currentTime = currentSession.currentTime
        setCurrentTime(currentSession.currentTime)
      }
    }

    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)
      
      // Check for milestones
      checkForMilestones(time)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setWatchStartTime(Date.now())
      startProgressTracking()
    }

    const handlePause = () => {
      setIsPlaying(false)
      updateWatchTime()
      stopProgressTracking()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      updateWatchTime()
      stopProgressTracking()
      handleVideoComplete()
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [currentSession])

  const startProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current)
    }

    progressUpdateInterval.current = setInterval(() => {
      if (currentSession && videoRef.current) {
        const now = Date.now()
        const currentTime = videoRef.current.currentTime
        
        // Only update if significant time has passed or position changed significantly
        if (now - lastProgressUpdate.current > 5000 || 
            Math.abs(currentTime - lastProgressUpdate.current) > 5) {
          
          updateProgress(currentTime)
          lastProgressUpdate.current = now
        }
      }
    }, 5000) // Update every 5 seconds
  }

  const stopProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current)
      progressUpdateInterval.current = undefined
    }
  }

  const updateWatchTime = () => {
    if (watchStartTime) {
      const additionalTime = Date.now() - watchStartTime
      setTotalWatchTime(prev => prev + additionalTime)
      setWatchStartTime(null)
    }
  }

  const updateProgress = async (currentTime: number) => {
    if (!currentSession) return

    // Calculate total watch time in milliseconds
    const additionalTime = watchStartTime ? Date.now() - watchStartTime : 0
    const currentWatchTimeMs = (totalWatchTime || 0) + additionalTime
    
    // Convert to seconds and ensure it's a valid number
    const totalWatchTimeSec = Math.floor(currentWatchTimeMs / 1000) || 0
    
    try {
      await onProgressUpdate(currentSession.id, currentTime, totalWatchTimeSec)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  const checkForMilestones = (currentTime: number) => {
    if (!video.milestones || isProcessingMilestone.current) return
    
    // Find the next unprocessed milestone within range
    const milestone = video.milestones.find(m => {
      // Skip if already processed
      if (processedMilestones.has(m.id)) return false
      
      // Check if we've reached this milestone (with small tolerance)
      const tolerance = 0.5
      return currentTime >= m.timestamp - tolerance && currentTime <= m.timestamp + tolerance
    })

    if (milestone) {
      // Mark as processing and processed immediately to prevent re-triggering
      isProcessingMilestone.current = true
      setProcessedMilestones(prev => new Set(prev).add(milestone.id))
      handleMilestoneReached(milestone)
    }
  }

  const handleMilestoneReached = async (milestone: Milestone) => {
    if (!currentSession) {
      isProcessingMilestone.current = false
      return
    }

    try {
      // Pause video for all milestone types
      if (videoRef.current) {
        videoRef.current.pause()
      }

      // Mark milestone as reached in backend
      await onMilestoneReached(currentSession.id, milestone.id, milestone.timestamp)
      
      setCurrentMilestone(milestone)
      
      // Determine action based on milestone type
      if (milestone.type === 'QUIZ' || (milestone.questions && milestone.questions.length > 0)) {
        // Show question overlay for quiz milestones
        setShowQuestionOverlay(true)
      } else {
        // For PAUSE or CHECKPOINT milestones without questions
        setShowMilestoneNotification(true)
        
        // Auto-resume after notification for non-quiz milestones
        setTimeout(() => {
          setShowMilestoneNotification(false)
          setCurrentMilestone(null)
          
          if (videoRef.current) {
            // Skip past the milestone and resume
            videoRef.current.currentTime = milestone.timestamp + 1
            videoRef.current.play()
          }
          isProcessingMilestone.current = false
        }, 2000) // 2 second pause for non-quiz milestones
      }
    } catch (error) {
      console.error('Failed to mark milestone:', error)
      isProcessingMilestone.current = false
    }
  }

  const handleAnswerSubmit = async (questionId: string, answer: string): Promise<{ isCorrect: boolean; explanation?: string }> => {
    if (!currentSession || !currentMilestone) {
      throw new Error('No active session or milestone')
    }

    try {
      const result = await onAnswerSubmit(currentSession.id, questionId, answer, currentMilestone.id)
      return result
    } catch (error) {
      console.error('Failed to submit answer:', error)
      throw error
    }
  }

  const handleQuestionComplete = () => {
    setShowQuestionOverlay(false)
    
    // Resume playback
    setTimeout(() => {
      if (videoRef.current && currentMilestone) {
        // Skip past the milestone to avoid re-triggering
        videoRef.current.currentTime = currentMilestone.timestamp + 1
        videoRef.current.play()
      }
      setCurrentMilestone(null)
      isProcessingMilestone.current = false
    }, 300)
  }

  const handleVideoComplete = async () => {
    if (!currentSession) return

    updateWatchTime()
    const finalWatchTime = (totalWatchTime || 0) + (watchStartTime ? Date.now() - watchStartTime : 0)
    const finalWatchTimeSec = Math.floor(finalWatchTime / 1000) || 0

    try {
      const completedSession = await onSessionComplete(
        currentSession.id,
        duration || 0,
        finalWatchTimeSec
      )
      // Update the local session state with the completed session data
      if (completedSession) {
        setCurrentSession(completedSession)
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
    }
  }

  const handlePlay = async () => {
    if (!currentSession) {
      // Start new session
      setLoading(true)
      try {
        const newSession = await onSessionStart(video.id)
        setCurrentSession(newSession)
        setTotalWatchTime(newSession.totalWatchTime)
        
        // Initialize processed milestones from new session
        if (newSession.milestoneProgress) {
          const reached = new Set(newSession.milestoneProgress.map(mp => mp.milestoneId))
          setProcessedMilestones(reached)
        }
      } catch (error) {
        console.error('Failed to start session:', error)
        setLoading(false)
        return
      }
      setLoading(false)
    }

    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
    }
  }

  const handleFullscreen = () => {
    const container = videoRef.current?.parentElement
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      {/* Video Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-white">Starting session...</div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-auto block"
          src={videoService.getStreamingUrl(video.id)}
          poster={video.thumbnailUrl ? videoService.getThumbnailUrl(video.id) : undefined}
          playsInline
          crossOrigin="anonymous"
        />
      </div>

      {/* Video Controls - Outside video, below it */}
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        milestones={video.milestones}
        reachedMilestones={Array.from(processedMilestones)}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onMute={handleMute}
        onFullscreen={handleFullscreen}
      />

      {/* Question Overlay */}
      {showQuestionOverlay && currentMilestone && (
        <QuestionOverlay
          milestone={currentMilestone}
          onAnswerSubmit={handleAnswerSubmit}
          onComplete={handleQuestionComplete}
        />
      )}

      {/* Milestone Notification */}
      {showMilestoneNotification && currentMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90]">
          <div className="bg-white rounded-lg p-6 max-w-md text-center animate-pulse mx-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-blue-100">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Milestone Reached!
            </h3>
            <p className="text-lg text-gray-700 font-medium mb-2">{currentMilestone.title}</p>
            {currentMilestone.description && (
              <p className="text-gray-600">{currentMilestone.description}</p>
            )}
            <div className="mt-4 text-sm text-gray-500">Resuming shortly...</div>
          </div>
        </div>
      )}

      {/* Video Info */}
      <div className="p-4 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900">{video.title}</h2>
        {video.description && (
          <p className="mt-2 text-gray-600">{video.description}</p>
        )}
        
        {currentSession?.status === 'COMPLETED' && (
          <div className="mt-3 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Completed
          </div>
        )}
      </div>
    </div>
  )
}