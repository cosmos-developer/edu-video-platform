import { PrismaClient } from '@prisma/client';
import { VideoProcessingService } from '../src/services/VideoProcessingService.js';

const prisma = new PrismaClient();

async function processVideo(videoId) {
  try {
    console.log('Processing video:', videoId);
    
    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      console.error('Video not found:', videoId);
      return;
    }

    console.log('Found video:', {
      id: video.id,
      title: video.title,
      filePath: video.filePath,
      duration: video.duration
    });

    if (!video.filePath) {
      console.error('Video has no file path');
      return;
    }

    // Process the video metadata
    console.log('Extracting metadata from:', video.filePath);
    const metadata = await VideoProcessingService.getVideoMetadata(video.filePath);
    const size = await VideoProcessingService.getFileSize(video.filePath);

    console.log('Extracted metadata:', metadata);
    console.log('Extracted size:', size);

    // Update video with metadata
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        duration: metadata.duration,
        size: size,
        processedAt: new Date(),
        processingStatus: metadata.duration ? 'COMPLETED' : 'FAILED',
        metadata: {
          width: metadata.width,
          height: metadata.height,
          bitrate: metadata.bitrate,
          fps: metadata.fps,
          codec: metadata.codec
        }
      }
    });

    console.log('Updated video successfully:', {
      id: updatedVideo.id,
      duration: updatedVideo.duration,
      size: updatedVideo.size,
      processingStatus: updatedVideo.processingStatus
    });

  } catch (error) {
    console.error('Error processing video:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Process the specific video
const videoId = 'cme33hmyb000bxgonc1t7lrrh';
processVideo(videoId);