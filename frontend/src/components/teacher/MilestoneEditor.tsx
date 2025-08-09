import React, { useState, useEffect, useRef } from 'react'
import { milestoneService, videoService } from '../../services/video'
import type { Video, Milestone } from '../../services/video'

interface MilestoneEditorProps {
  video: Video
  milestone?: Milestone | null
  onMilestoneAdded: (milestone: Milestone) => void
  onClose: () => void
}

export function MilestoneEditor({ video, milestone, onMilestoneAdded, onClose }: MilestoneEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(video.duration || 0)
  
  const [formData, setFormData] = useState({
    timestamp: milestone?.timestamp || 0,
    title: milestone?.title || '',
    description: milestone?.description || '',
    type: milestone?.type || 'QUIZ' as 'PAUSE' | 'QUIZ' | 'CHECKPOINT'
  })

  const isEditing = !!milestone

  useEffect(() => {
    if (milestone) {
      setFormData({
        timestamp: milestone.timestamp,
        title: milestone.title,
        description: milestone.description || '',
        type: milestone.type
      })
    }
  }, [milestone])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration)
      setIsVideoLoaded(true)
    }

    const handleTimeUpdate = () => {
      setVideoCurrentTime(video.currentTime)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timestamp' ? parseInt(value) || 0 : value
    }))
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoDuration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const timestamp = Math.floor(percentage * videoDuration)
    
    setFormData(prev => ({ ...prev, timestamp }))
    
    // Seek video to clicked position
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
    }
  }

  const handleUseCurrentTime = () => {
    if (videoRef.current) {
      const currentTime = Math.floor(videoRef.current.currentTime)
      setFormData(prev => ({ ...prev, timestamp: currentTime }))
    }
  }

  const handleSeekToMilestone = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = formData.timestamp
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (formData.timestamp < 0 || (videoDuration && formData.timestamp > videoDuration)) {
      setError('Timestamp must be within the video duration')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response
      
      if (isEditing && milestone) {
        response = await milestoneService.updateMilestone(milestone.id, {
          timestamp: formData.timestamp,
          title: formData.title,
          description: formData.description || undefined,
          type: formData.type
        })
      } else {
        response = await milestoneService.createMilestone({
          videoId: video.id,
          timestamp: formData.timestamp,
          title: formData.title,
          description: formData.description || undefined,
          type: formData.type
        })
      }

      onMilestoneAdded(response)
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} milestone:`, err)
      const message = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} milestone`
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Milestone' : 'Add Milestone'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Video: {video.title} 
                {video.duration && ` (${formatTime(video.duration)})`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Video Preview */}
          <div className="mb-6">
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoService.getStreamingUrl(video.id)}
                className="w-full h-48 object-contain"
                controls
                playsInline
              />
            </div>
            
            {/* Timeline */}
            {isVideoLoaded && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Click on timeline to set milestone position
                </label>
                <div 
                  className="relative h-8 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
                  onClick={handleTimelineClick}
                >
                  {/* Progress bar */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-200 rounded-full"
                    style={{ width: `${(videoCurrentTime / videoDuration) * 100}%` }}
                  />
                  
                  {/* Existing milestones */}
                  {video.milestones?.map((m) => {
                    if (m.id === milestone?.id) return null
                    return (
                      <div
                        key={m.id}
                        className="absolute top-0 w-1 h-full bg-red-500 opacity-75"
                        style={{ left: `${(m.timestamp / videoDuration) * 100}%` }}
                        title={`${m.title} (${formatTime(m.timestamp)})`}
                      />
                    )
                  })}
                  
                  {/* Current milestone marker */}
                  <div
                    className="absolute top-0 w-3 h-full bg-green-500 rounded-full transform -translate-x-1/2 border-2 border-white shadow-lg"
                    style={{ left: `${(formData.timestamp / videoDuration) * 100}%` }}
                    title={`Milestone: ${formatTime(formData.timestamp)}`}
                  />
                  
                  {/* Timeline markers */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-1">
                    <span>0:00</span>
                    <span>{formatTime(videoDuration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                  <span>Current: {formatTime(videoCurrentTime)}</span>
                  <span>Milestone: {formatTime(formData.timestamp)}</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Milestone Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Milestone Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="QUIZ">Quiz - Pause video for questions</option>
                <option value="CHECKPOINT">Checkpoint - Mark progress point</option>
                <option value="PAUSE">Pause - Simple pause point</option>
              </select>
              <div className="text-xs text-gray-500 mt-1">
                {formData.type === 'QUIZ' && 'Video will pause and show questions to students'}
                {formData.type === 'CHECKPOINT' && 'Mark important learning milestones'}
                {formData.type === 'PAUSE' && 'Pause point for reflection or discussion'}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-2">
                Timestamp (seconds) *
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  id="timestamp"
                  name="timestamp"
                  value={formData.timestamp}
                  onChange={handleInputChange}
                  min="0"
                  max={videoDuration || undefined}
                  step="1"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="text-sm text-gray-500">
                  = {formatTime(formData.timestamp)}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-2">
                <button
                  type="button"
                  onClick={handleUseCurrentTime}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Use Current Time ({formatTime(videoCurrentTime)})
                </button>
                <button
                  type="button"
                  onClick={handleSeekToMilestone}
                  className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  Seek to Milestone
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-1">
                When this milestone should appear in the video
                {videoDuration && ` (max: ${formatTime(videoDuration)})`}
              </p>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter milestone title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description or instructions for students"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading 
                  ? (isEditing ? 'Updating...' : 'Creating...')
                  : (isEditing ? 'Update Milestone' : 'Create Milestone')
                }
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Next Steps</h3>
            <p className="text-sm text-blue-700">
              {formData.type === 'QUIZ' 
                ? 'After creating this milestone, you can add questions that students will answer when they reach this point in the video.'
                : formData.type === 'CHECKPOINT'
                ? 'Checkpoints help track student progress and can be used for analytics and completion tracking.'
                : 'Pause points allow for reflection time or can be used to sync with classroom discussions.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}