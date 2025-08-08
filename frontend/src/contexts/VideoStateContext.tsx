import React, { createContext, useContext, ReactNode } from 'react'
import { videoStateManager } from '../stores/VideoStateManager'
import type { VideoStateManager } from '../stores/VideoStateManager'

interface VideoStateContextType {
  manager: typeof videoStateManager
}

const VideoStateContext = createContext<VideoStateContextType | undefined>(undefined)

export function VideoStateProvider({ children }: { children: ReactNode }) {
  return (
    <VideoStateContext.Provider value={{ manager: videoStateManager }}>
      {children}
    </VideoStateContext.Provider>
  )
}

export function useVideoStateManager() {
  const context = useContext(VideoStateContext)
  if (!context) {
    throw new Error('useVideoStateManager must be used within VideoStateProvider')
  }
  return context.manager
}