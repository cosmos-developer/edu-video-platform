import { useState, useRef, useEffect } from 'react'
import type { Video, VideoSession, Milestone } from '../../services/video'
import { videoService } from '../../services/video'
import { QuestionOverlay } from './QuestionOverlay'
import { MilestoneMarkers } from './MilestoneMarkers'
import { VideoControls } from './VideoControls'
import { useVideoState } from '../../hooks/useVideoState'
// import { useVideoStateManager } from '../../contexts/VideoStateContext'

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
  console.log('🎬 VideoPlayer received video prop:', {
    id: video.id,
    title: video.title,
    milestonesCount: video.milestones?.length || 0,
    milestones: video.milestones?.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      hasQuestions: m.questions?.length || 0
    }))
  });
  const videoRef = useRef<HTMLVideoElement>(null)
  // const manager = useVideoStateManager() // Not currently used
  const { milestones: stateMilestones, metadata } = useVideoState(video.id)
  console.log('🔍 useVideoState returned:', {
    stateMilestonesCount: stateMilestones?.length || 0,
    stateMilestones: stateMilestones?.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      hasQuestions: m.questions?.length || 0
    })),
    metadata
  });
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(session || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null)
  const [totalWatchTime, setTotalWatchTime] = useState(0)
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [showQuestionOverlay, setShowQuestionOverlay] = useState(false)
  const [locallyReachedMilestones, setLocallyReachedMilestones] = useState<string[]>([])
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
      // Calculate total watch time from session data if available
      const watchTime = session.sessionData?.totalWatchTime || 0
      setTotalWatchTime(watchTime)
      
      // Resume video from last position
      if (videoRef.current && session.currentPosition > 0) {
        videoRef.current.currentTime = session.currentPosition
      }
    }
  }, [session])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      console.log('🎬 Video metadata loaded - duration:', video.duration)
      setDuration(video.duration)
      
      // Resume from session position
      if (currentSession?.currentPosition) {
        console.log('⏭️ Resuming from position:', currentSession.currentPosition)
        video.currentTime = currentSession.currentPosition
        setCurrentTime(currentSession.currentPosition)
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
    // Use milestones from unified state instead of video prop
    const milestones = stateMilestones || video.milestones || []
    
    // Only log when near the milestone to reduce noise
    const nearMilestone = milestones.some(m => Math.abs(currentTime - m.timestamp) <= 3)
    if (nearMilestone || currentTime < 1) {
      console.log('🎯 Checking milestones at time:', currentTime.toFixed(3))
      console.log('📍 Available milestones:', milestones.length, milestones.map(m => ({ id: m.id, timestamp: m.timestamp, type: m.type, hasQuestions: m.questions?.length || 0 })))
      console.log('🎬 Show overlay?', showQuestionOverlay)
      console.log('📊 Current session:', currentSession?.id)
    }
    
    if (milestones.length === 0 || showQuestionOverlay) {
      console.log('🚫 Early return - no milestones or overlay already showing')
      return
    }

    const reachedMilestones = currentSession?.milestoneProgress?.map(mp => mp.milestoneId) || []
    const allReachedMilestones = [...reachedMilestones, ...locallyReachedMilestones]
    if (nearMilestone || currentTime < 1) {
      console.log('✅ Reached milestones:', reachedMilestones)
      console.log('🏠 Locally reached milestones:', locallyReachedMilestones)
      console.log('📊 Session milestone progress:', currentSession?.milestoneProgress)
    }
    
    const milestone = milestones.find(m => {
      const timeDiff = Math.abs(currentTime - m.timestamp)
      const isInRange = timeDiff <= 2
      const notReached = !allReachedMilestones.includes(m.id)
      return isInRange && notReached
    })

    if (milestone) {
      console.log('🎉 MILESTONE TRIGGERED:', milestone.id, 'at', currentTime)
      handleMilestoneReached(milestone)
    } else if (nearMilestone || currentTime < 1) {
      console.log('❌ No milestone triggered at', currentTime.toFixed(3))
    }
    
  }

  const handleMilestoneReached = async (milestone: Milestone) => {
    console.log('🚀 handleMilestoneReached called:', milestone.id)
    console.log('📋 Milestone details:', { id: milestone.id, timestamp: milestone.timestamp, type: milestone.type, hasQuestions: milestone.questions?.length || 0 })
    console.log('❓ Milestone questions array:', milestone.questions)
    console.log('🎮 Current session:', currentSession?.id)
    
    if (!currentSession) {
      console.log('❌ No current session, aborting milestone handling')
      return
    }

    // Immediately add to local tracking to prevent re-triggering
    setLocallyReachedMilestones(prev => 
      prev.includes(milestone.id) ? prev : [...prev, milestone.id]
    )

    try {
      console.log('🎯 Processing milestone with questions:', milestone.questions?.length || 0)
      
      // Pause video for milestones with questions
      if (milestone.questions && milestone.questions.length > 0 && videoRef.current) {
        console.log('⏸️ PAUSING VIDEO for milestone with questions')
        videoRef.current.pause()
      } else {
        console.log('▶️ Not pausing video - no questions or no video ref')
      }

      // Mark milestone as reached
      console.log('📝 Marking milestone as reached...')
      await onMilestoneReached(currentSession.id, milestone.id, milestone.timestamp)
      console.log('✅ Milestone marked as reached')
      
      setCurrentMilestone(milestone)
      console.log('🎯 Current milestone set to:', milestone.id)
      
      // Show question overlay for any milestone with questions
      if (milestone.questions && milestone.questions.length > 0) {
        console.log('🔥 SHOWING QUESTION OVERLAY')
        setShowQuestionOverlay(true)
      } else {
        console.log('🚫 Not showing overlay - no questions')
      }
    } catch (error) {
      console.error('❌ Failed to mark milestone:', error)
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
        const watchTime = newSession.sessionData?.totalWatchTime || 0
        setTotalWatchTime(watchTime)
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
        src={videoService.getStreamingUrl(video.id)}
        poster={video.thumbnailUrl ? videoService.getThumbnailUrl(video.id) : undefined}
        playsInline
        crossOrigin="anonymous"
      />

      {/* Milestone Markers - Use milestones from unified state */}
      {(stateMilestones || video.milestones) && (
        <MilestoneMarkers
          milestones={stateMilestones || video.milestones || []}
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
            {/* Use metadata from unified state for accurate counts */}
            {metadata ? (
              <span>
                {metadata.totalMilestones} milestones, {metadata.totalQuestions} questions
              </span>
            ) : (
              video._count && (
                <span>{video._count.milestones} interactive moments</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}