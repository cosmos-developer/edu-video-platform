import type { Milestone } from '../../services/video'

interface MilestoneMarkersProps {
  milestones: Milestone[]
  duration: number
  currentTime: number
  reachedMilestones: string[]
}

export function MilestoneMarkers({ 
  milestones, 
  duration, 
  currentTime, 
  reachedMilestones 
}: MilestoneMarkersProps) {
  if (duration === 0 || milestones.length === 0) return null

  return (
    <div className="absolute bottom-16 left-4 right-4 h-2 pointer-events-none">
      {milestones.map((milestone) => {
        const percentage = (milestone.timestamp / duration) * 100
        const isReached = reachedMilestones.includes(milestone.id)
        const isCurrent = Math.abs(currentTime - milestone.timestamp) <= 2

        return (
          <div
            key={milestone.id}
            className="absolute transform -translate-x-1/2"
            style={{ left: `${percentage}%` }}
            title={`${milestone.title} - ${Math.floor(milestone.timestamp / 60)}:${(milestone.timestamp % 60).toFixed(0).padStart(2, '0')}`}
          >
            {/* Milestone Marker */}
            <div 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                isCurrent
                  ? 'bg-yellow-400 border-yellow-400 scale-125 shadow-lg'
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
            >
              {/* Icon based on milestone type */}
              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                {milestone.type === 'QUIZ' ? (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                ) : milestone.type === 'CHECKPOINT' ? (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                )}
              </div>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="font-semibold">{milestone.title}</div>
              <div className="text-gray-300">
                {Math.floor(milestone.timestamp / 60)}:{(milestone.timestamp % 60).toFixed(0).padStart(2, '0')}
              </div>
              {milestone.description && (
                <div className="text-gray-400 max-w-48 truncate">
                  {milestone.description}
                </div>
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}