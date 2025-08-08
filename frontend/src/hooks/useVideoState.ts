import { useState, useEffect, useCallback } from 'react'
import { useVideoStateManager } from '../contexts/VideoStateContext'
import type { VideoState, SessionState } from '../stores/VideoStateManager'

export function useVideoState(videoId: string | undefined) {
  const manager = useVideoStateManager()
  const [state, setState] = useState<VideoState | undefined>(
    videoId ? manager.getVideoState(videoId) : undefined
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!videoId) {
      setState(undefined)
      return
    }
    
    // Subscribe to video state changes
    const unsubscribe = manager.subscribeToVideo(videoId, (id, videoState) => {
      setState(videoState)
      setLoading(videoState.metadata.isLoading)
      setError(videoState.metadata.error)
    })
    
    // Load video if not in cache
    const existingState = manager.getVideoState(videoId)
    if (!existingState) {
      setLoading(true)
      manager.loadVideo(videoId).catch(err => {
        setError(err.message || 'Failed to load video')
        setLoading(false)
      })
    }
    
    return unsubscribe
  }, [videoId, manager])
  
  const refresh = useCallback(async () => {
    if (!videoId) return
    setLoading(true)
    try {
      await manager.loadVideo(videoId, true)
    } catch (err: any) {
      setError(err.message || 'Failed to refresh video')
    } finally {
      setLoading(false)
    }
  }, [videoId, manager])
  
  return {
    state,
    loading,
    error,
    refresh,
    video: state?.video,
    milestones: state?.milestones || [],
    questions: state?.questions || new Map(),
    metadata: state?.metadata
  }
}

export function useSessionState(sessionId: string | undefined) {
  const manager = useVideoStateManager()
  const [state, setState] = useState<SessionState | undefined>(
    sessionId ? manager.getSessionState(sessionId) : undefined
  )
  
  useEffect(() => {
    if (!sessionId) {
      setState(undefined)
      return
    }
    
    // Subscribe to session state changes
    const unsubscribe = manager.subscribeToSession(sessionId, (id, sessionState) => {
      setState(sessionState)
    })
    
    return unsubscribe
  }, [sessionId, manager])
  
  return {
    state,
    session: state?.session,
    milestoneProgress: state?.milestoneProgress,
    questionAnswers: state?.questionAnswers,
    currentMilestone: state?.currentMilestone,
    metadata: state?.metadata
  }
}

export function useAllVideosState() {
  const manager = useVideoStateManager()
  const [videos, setVideos] = useState<Map<string, VideoState>>(new Map())
  const [sessions, setSessions] = useState<Map<string, SessionState>>(new Map())
  
  useEffect(() => {
    const unsubscribe = manager.subscribe((state) => {
      setVideos(new Map(state.videos))
      setSessions(new Map(state.sessions))
    })
    
    return unsubscribe
  }, [manager])
  
  return { videos, sessions }
}