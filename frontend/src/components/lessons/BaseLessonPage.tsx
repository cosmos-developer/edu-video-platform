import React, { useState, useEffect } from 'react'
import { lessonService, type LessonWithVideos, type VideoGroup, type Video } from '../../services/lesson'

interface BaseLessonPageProps {
  lessonId: string
  role: 'TEACHER' | 'STUDENT' | 'ADMIN'
  children: (data: {
    lesson: LessonWithVideos
    videoGroups: VideoGroup[]
    selectedVideo: Video | null
    loading: boolean
    error: string | null
    onVideoSelect: (video: Video) => void
    refreshLesson: () => Promise<void>
  }) => React.ReactNode
}

/**
 * Base component for lesson pages - implements the unified pattern
 * Single API call to get lesson with embedded videoGroups
 */
export function BaseLessonPage({ lessonId, children }: BaseLessonPageProps) {
  const [lesson, setLesson] = useState<LessonWithVideos | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lessonId) {
      loadLesson()
    }
  }, [lessonId])

  const loadLesson = async () => {
    setLoading(true)
    setError(null)

    try {
      // UNIFIED PATTERN: Single API call for ALL roles
      // Backend handles role-based filtering
      const lessonData = await lessonService.getLesson(lessonId)
      setLesson(lessonData)
      
      // Select first video if available
      const firstVideo = lessonData.videoGroups?.[0]?.videos?.[0]
      if (firstVideo) {
        setSelectedVideo(firstVideo)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lesson')
      console.error('Error loading lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
  }

  // Provide data to children
  if (!children) {
    return null
  }

  return (
    <>
      {children({
        lesson: lesson!,
        videoGroups: lesson?.videoGroups || [],
        selectedVideo,
        loading,
        error,
        onVideoSelect: handleVideoSelect,
        refreshLesson: loadLesson
      })}
    </>
  )
}