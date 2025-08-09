import { Storage } from '@google-cloud/storage';
import { logger } from '../../utils/logger';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class GCSService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
    this.bucketName = process.env.GCS_BUCKET_NAME || 'interactive-learning-videos';
  }

  /**
   * Upload video file to Google Cloud Storage
   */
  async uploadVideo(
    file: Express.Multer.File,
    lessonId: string,
    videoGroupId: string,
    userId: string
  ): Promise<{
    gcsPath: string;
    gcsUrl: string;
    publicUrl: string;
  }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      
      // Generate unique file path
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const gcsPath = `lessons/${lessonId}/videos/${fileName}`;
      
      const gcsFile = bucket.file(gcsPath);

      // Upload file
      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedBy: userId,
            lessonId: lessonId,
            videoGroupId: videoGroupId,
            uploadTimestamp: new Date().toISOString()
          }
        }
      });

      // Generate signed URL for streaming (expires in 1 year)
      const [signedUrl] = await gcsFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      // Generate public URL (if bucket is public)
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

      logger.info(`Video uploaded to GCS: ${gcsPath}`, {
        originalName: file.originalname,
        size: file.size,
        userId,
        lessonId,
        videoGroupId
      });

      return {
        gcsPath,
        gcsUrl: signedUrl,
        publicUrl
      };
    } catch (error) {
      logger.error('Error uploading video to GCS:', error);
      throw new Error('Failed to upload video to cloud storage');
    }
  }

  /**
   * Upload thumbnail image to Google Cloud Storage
   */
  async uploadThumbnail(
    thumbnailBuffer: Buffer,
    videoId: string,
    mimeType: string
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      
      const fileName = `${videoId}_thumbnail.jpg`;
      const gcsPath = `thumbnails/${fileName}`;
      
      const gcsFile = bucket.file(gcsPath);

      await gcsFile.save(thumbnailBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            videoId: videoId,
            type: 'thumbnail',
            generatedAt: new Date().toISOString()
          }
        }
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

      logger.info(`Thumbnail uploaded to GCS: ${gcsPath}`, { videoId });

      return publicUrl;
    } catch (error) {
      logger.error('Error uploading thumbnail to GCS:', error);
      throw new Error('Failed to upload thumbnail to cloud storage');
    }
  }

  /**
   * Delete video file from Google Cloud Storage
   */
  async deleteVideo(gcsPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      await file.delete();

      logger.info(`Video deleted from GCS: ${gcsPath}`);
    } catch (error) {
      logger.error('Error deleting video from GCS:', error);
      throw new Error('Failed to delete video from cloud storage');
    }
  }

  /**
   * Generate new signed URL for video streaming
   */
  async refreshVideoUrl(gcsPath: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      return signedUrl;
    } catch (error) {
      logger.error('Error refreshing video URL:', error);
      throw new Error('Failed to refresh video URL');
    }
  }

  /**
   * Get video metadata from Google Cloud Storage
   */
  async getVideoMetadata(gcsPath: string): Promise<any> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      const [metadata] = await file.getMetadata();

      return {
        size: metadata.size,
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        md5Hash: metadata.md5Hash,
        etag: metadata.etag,
        customMetadata: metadata.metadata
      };
    } catch (error) {
      logger.error('Error getting video metadata from GCS:', error);
      throw new Error('Failed to get video metadata');
    }
  }

  /**
   * Check if video file exists in Google Cloud Storage
   */
  async videoExists(gcsPath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error('Error checking video existence in GCS:', error);
      return false;
    }
  }

  /**
   * Copy video to different location in bucket
   */
  async copyVideo(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const sourceFile = bucket.file(sourcePath);
      const destinationFile = bucket.file(destinationPath);

      await sourceFile.copy(destinationFile);

      logger.info(`Video copied in GCS: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      logger.error('Error copying video in GCS:', error);
      throw new Error('Failed to copy video in cloud storage');
    }
  }

  /**
   * List all videos in a lesson directory
   */
  async listLessonVideos(lessonId: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const prefix = `lessons/${lessonId}/videos/`;

      const [files] = await bucket.getFiles({ prefix });
      
      return files.map(file => file.name);
    } catch (error) {
      logger.error('Error listing lesson videos in GCS:', error);
      throw new Error('Failed to list lesson videos');
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    videoCount: number;
    thumbnailCount: number;
  }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles();

      let totalSize = 0;
      let videoCount = 0;
      let thumbnailCount = 0;

      files.forEach(file => {
        const metadata = file.metadata;
        totalSize += parseInt(String(metadata.size || '0'));

        if (file.name.startsWith('lessons/') && file.name.includes('/videos/')) {
          videoCount++;
        } else if (file.name.startsWith('thumbnails/')) {
          thumbnailCount++;
        }
      });

      return {
        totalSize,
        fileCount: files.length,
        videoCount,
        thumbnailCount
      };
    } catch (error) {
      logger.error('Error getting storage statistics:', error);
      throw new Error('Failed to get storage statistics');
    }
  }
}

export const gcsService = new GCSService();