import { type VideoGroup, type Video } from '../../services/lesson'

interface VideoListProps {
  videoGroups: VideoGroup[]
  selectedVideoId?: string | null
  onVideoSelect: (video: Video) => void
  showManageButtons?: boolean // For teachers
  onUploadClick?: () => void
}

export function VideoList({ 
  videoGroups, 
  selectedVideoId, 
  onVideoSelect,
  showManageButtons = false,
  onUploadClick
}: VideoListProps) {
  const allVideos = videoGroups.flatMap(g => g.videos || [])
  
  if (allVideos.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 mb-4">No videos added yet</p>
        {showManageButtons && onUploadClick && (
          <button
            onClick={onUploadClick}
            className="btn-primary"
          >
            Upload First Video
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allVideos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          index={index}
          isSelected={selectedVideoId === video.id}
          onClick={() => onVideoSelect(video)}
        />
      ))}
    </div>
  )
}

interface VideoCardProps {
  video: Video
  index: number
  isSelected: boolean
  onClick: () => void
}

function VideoCard({ video, index, isSelected, onClick }: VideoCardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 w-12 h-8 bg-gray-300 rounded overflow-hidden mr-3">
          {video.thumbnailPath || video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl || `/api/v1/videos/${video.id}/thumbnail`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                `
              }}
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
  )
}