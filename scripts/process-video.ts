import { VideoService } from '../src/services/VideoService'

async function processVideo() {
  try {
    const videoId = 'cme33hmyb000bxgonc1t7lrrh'
    console.log('Processing video metadata for:', videoId)
    
    const updatedVideo = await VideoService.processVideoMetadata(videoId)
    
    console.log('✅ Video processed successfully!')
    console.log('Updated video:', {
      id: updatedVideo.id,
      title: updatedVideo.title,
      duration: updatedVideo.duration,
      size: updatedVideo.size,
      processingStatus: updatedVideo.processingStatus
    })
    
  } catch (error) {
    console.error('❌ Error processing video:', error)
  }
}

processVideo()