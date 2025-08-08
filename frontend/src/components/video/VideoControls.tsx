import React from 'react'
import type { Milestone } from '../../services/video'

interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  milestones?: Milestone[]
  reachedMilestones?: string[]
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onMute: () => void
  onFullscreen: () => void
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  milestones = [],
  reachedMilestones = [],
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMute,
  onFullscreen
}: VideoControlsProps) {
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    onSeek(newTime)
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    onVolumeChange(percentage)
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-gray-900 p-4">
      {/* Progress Bar with Milestones */}
      <div className="mb-4">
        <div 
          className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative group"
          onClick={handleProgressClick}
        >
          {/* Progress Fill */}
          <div 
            className="h-full bg-blue-500 rounded-full relative transition-all"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          {/* Milestone Markers */}
          {milestones.map((milestone) => {
            const percentage = duration > 0 ? (milestone.timestamp / duration) * 100 : 0
            const isReached = reachedMilestones.includes(milestone.id)
            const isCurrent = Math.abs(currentTime - milestone.timestamp) <= 1
            
            return (
              <div
                key={milestone.id}
                className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${percentage}%` }}
                title={`${milestone.title} - ${formatTime(milestone.timestamp)}`}
              >
                <div 
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                    isCurrent
                      ? 'bg-yellow-400 border-yellow-400 scale-150 shadow-lg animate-pulse'
                      : milestone.type === 'QUIZ'
                      ? isReached 
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-red-500 border-red-500'
                      : milestone.type === 'CHECKPOINT'
                      ? isReached
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-blue-300 border-blue-300'
                      : isReached
                        ? 'bg-gray-500 border-gray-500'
                        : 'bg-gray-300 border-gray-300'
                  }`}
                />
                
                {/* Milestone tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                  <div className="font-semibold">{milestone.title}</div>
                  <div className="text-gray-300">{formatTime(milestone.timestamp)}</div>
                  {milestone.type === 'QUIZ' && milestone._count?.questions && (
                    <div className="text-gray-400">{milestone._count.questions} questions</div>
                  )}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Milestone Legend */}
        {milestones.length > 0 && (
          <div className="flex items-center justify-end mt-2 space-x-4 text-xs text-gray-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              <span>Quiz</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              <span>Checkpoint</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
              <span>Pause</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-white">
        {/* Left Controls */}
        <div className="flex items-center space-x-4">
          {/* Play/Pause Button */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Time Display */}
          <div className="text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-4">
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onMute}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.783L4.216 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.216l4.167-3.783zm0 14.166L6.383 14H2V8h4.383L9.383 4.834v12.332zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                  <path d="M13.243 8.757a1 1 0 011.414 0A5.98 5.98 0 0116 12a5.98 5.98 0 01-1.343 3.243 1 1 0 01-1.414-1.414A3.99 3.99 0 0014 12a3.99 3.99 0 00-.757-2.343 1 1 0 010-1.414z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.783L4.216 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.216l4.167-3.783zm0 14.166L6.383 14H2V8h4.383L9.383 4.834v12.332zM13.243 8.757a1 1 0 011.414 0A5.98 5.98 0 0116 12a5.98 5.98 0 01-1.343 3.243 1 1 0 01-1.414-1.414A3.99 3.99 0 0014 12a3.99 3.99 0 00-.757-2.343 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.783L4.216 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.216l4.167-3.783zm0 14.166L6.383 14H2V8h4.383L9.383 4.834v12.332zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                  <path d="M13.243 8.757a1 1 0 011.414 0A5.98 5.98 0 0116 12a5.98 5.98 0 01-1.343 3.243 1 1 0 01-1.414-1.414A3.99 3.99 0 0014 12a3.99 3.99 0 00-.757-2.343 1 1 0 010-1.414z" />
                </svg>
              )}
            </button>

            {/* Volume Slider */}
            <div 
              className="w-16 h-1 bg-gray-600 rounded-full cursor-pointer relative hidden sm:block"
              onClick={handleVolumeClick}
            >
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={onFullscreen}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}