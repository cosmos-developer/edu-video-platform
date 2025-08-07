import path from 'path'
import fs from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getThumbnailFilePath } from '../middleware/upload/videoUploadMiddleware'

const execAsync = promisify(exec)

interface VideoMetadata {
  duration: number | null
  width: number | null
  height: number | null
  bitrate: number | null
  fps: number | null
  codec: string | null
}

export class VideoProcessingService {
  /**
   * Generate thumbnail for video file using ffprobe and ffmpeg (if available)
   * Falls back to placeholder if ffmpeg is not available
   */
  static async generateThumbnail(videoPath: string, filename: string): Promise<string | null> {
    try {
      const thumbnailName = `${path.parse(filename).name}.jpg`
      const thumbnailPath = getThumbnailFilePath(thumbnailName)
      
      // Try to use ffmpeg to generate thumbnail
      try {
        // Generate thumbnail at 1 second mark
        await execAsync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -y "${thumbnailPath}"`)
        return thumbnailName
      } catch (ffmpegError) {
        console.warn('ffmpeg not available, skipping thumbnail generation:', ffmpegError)
        return null
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      return null
    }
  }

  /**
   * Extract video metadata using ffprobe (if available)
   */
  static async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    const defaultMetadata: VideoMetadata = {
      duration: null,
      width: null,
      height: null,
      bitrate: null,
      fps: null,
      codec: null
    }

    try {
      // Try to use ffprobe to get video metadata
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`)
      const data = JSON.parse(stdout)
      
      // Find video stream
      const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video')
      
      if (videoStream) {
        return {
          duration: data.format?.duration ? parseFloat(data.format.duration) : null,
          width: videoStream.width || null,
          height: videoStream.height || null,
          bitrate: data.format?.bit_rate ? parseInt(data.format.bit_rate) : null,
          fps: videoStream.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : null,
          codec: videoStream.codec_name || null
        }
      }
    } catch (error) {
      console.warn('ffprobe not available, using default metadata:', error)
    }

    // Fallback: try to get basic file stats
    try {
      const stats = await fs.stat(videoPath)
      return {
        ...defaultMetadata,
        duration: null // Cannot determine without ffprobe
      }
    } catch (error) {
      console.error('Error getting file stats:', error)
      return defaultMetadata
    }
  }

  /**
   * Parse frame rate string (e.g., "30/1" -> 30)
   */
  private static parseFrameRate(frameRate: string): number | null {
    try {
      const [numerator, denominator] = frameRate.split('/').map(Number)
      return denominator !== 0 ? numerator / denominator : null
    } catch {
      return null
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      console.error('Error getting file size:', error)
      return 0
    }
  }

  /**
   * Validate video file exists and is accessible
   */
  static async validateVideoFile(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/mov',
      '.wmv': 'video/wmv',
      '.flv': 'video/flv',
      '.webm': 'video/webm'
    }
    
    return mimeTypes[ext] || 'video/mp4'
  }
}