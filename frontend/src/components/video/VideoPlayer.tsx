import { useState, useRef, useEffect } from 'react'
import type { Video, VideoSession, Milestone } from '../../services/video'
import { QuestionOverlay } from './QuestionOverlay'
import { MilestoneMarkers } from './MilestoneMarkers'
import { VideoControls } from './VideoControls'

interface VideoPlayerProps {
  video: Video
  session?: VideoSession | null
  onSessionStart: (videoId: string) => Promise<VideoSession>
  onProgressUpdate: (sessionId: string, currentTime: number, totalWatchTime: number) => Promise<void>
  onMilestoneReached: (sessionId: string, milestoneId: string, timestamp: number) => Promise<void>
  onAnswerSubmit: (sessionId: string, questionId: string, answer: string, milestoneId: string) => Promise<{ isCorrect: boolean; explanation?: string }>
  onSessionComplete: (sessionId: string, finalTime: number, totalWatchTime: number) => Promise<void>
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
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Progress tracking
  const progressUpdateInterval = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastProgressUpdate = useRef<number>(0)

  useEffect(() => {
    if (session) {
      setCurrentSession(session)
      setTotalWatchTime(session.totalWatchTime)
      
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

    const currentWatchTime = totalWatchTime + (watchStartTime ? Date.now() - watchStartTime : 0)
    
    try {
      await onProgressUpdate(currentSession.id, currentTime, Math.floor(currentWatchTime / 1000))
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  const checkForMilestones = (currentTime: number) => {
    if (!video.milestones || showQuestionOverlay) return

    const reachedMilestones = currentSession?.milestoneProgress?.map(mp => mp.milestoneId) || []
    
    const milestone = video.milestones.find(m => 
      Math.abs(currentTime - m.timestamp) <= 1 && // Within 1 second
      !reachedMilestones.includes(m.id)
    )

    if (milestone) {
      handleMilestoneReached(milestone)
    }
  }

  const handleMilestoneReached = async (milestone: Milestone) => {
    if (!currentSession) return

    try {
      // Pause video for quiz milestones
      if (milestone.type === 'QUIZ' && videoRef.current) {
        videoRef.current.pause()
      }

      // Mark milestone as reached
      await onMilestoneReached(currentSession.id, milestone.id, milestone.timestamp)
      
      setCurrentMilestone(milestone)
      
      // Show question overlay for quiz milestones
      if (milestone.type === 'QUIZ' && milestone.questions && milestone.questions.length > 0) {
        setShowQuestionOverlay(true)
      }
    } catch (error) {
      console.error('Failed to mark milestone:', error)
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
    setCurrentMilestone(null)
    
    // Resume video
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleVideoComplete = async () => {
    if (!currentSession) return

    updateWatchTime()
    const finalWatchTime = totalWatchTime + (watchStartTime ? Date.now() - watchStartTime : 0)

    try {
      await onSessionComplete(
        currentSession.id,
        duration,
        Math.floor(finalWatchTime / 1000)
      )
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
    <div className="relative bg-black rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white">Starting session...</div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-auto"
        src={video.videoUrl}
        poster={video.thumbnailUrl || undefined}
        playsInline
      />

      {/* Milestone Markers */}
      {video.milestones && (
        <MilestoneMarkers
          milestones={video.milestones}
          duration={duration}
          currentTime={currentTime}
          reachedMilestones={currentSession?.milestoneProgress?.map(mp => mp.milestoneId) || []}
        />
      )}

      {/* Video Controls */}
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
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

      {/* Video Info */}
      <div className="p-4 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900">{video.title}</h2>
        {video.description && (
          <p className="mt-2 text-gray-600">{video.description}</p>
        )}
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            {currentSession ? (
              <span>
                Progress: {formatTime(currentTime)} / {formatTime(duration)}
                {currentSession.status === 'COMPLETED' && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Completed
                  </span>
                )}
              </span>
            ) : (
              <span>Duration: {formatTime(duration)}</span>
            )}
          </div>
          
          <div>
            {video._count && (
              <span>{video._count.milestones} interactive moments</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}