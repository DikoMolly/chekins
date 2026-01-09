import path from 'path';
import fs from 'fs';
import cloudinaryService from './cloudinary.service';
import ImageUtils from '../utils/image.utils';
import VideoUtils from '../utils/video.utils';

export class MediaService {
  /**
   * Process an image file
   */
  async processImage(
    filePath: string,
    folder: string = 'chekins_posts',
  ): Promise<{
    type: 'image';
    url: string;
    publicId: string;
    previewImage: string;
  }> {
    try {
      // Compress the image
      const compressedPath = await ImageUtils.compressImage(filePath, 85);

      // Upload to Cloudinary
      const result = await cloudinaryService.uploadFile(compressedPath, {
        resourceType: 'image',
        folder,
      });

      // Add a small delay to ensure Sharp has released the file handles
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clean up temporary files
      this.cleanupFiles([filePath, compressedPath]);

      return {
        type: 'image',
        url: result.url,
        publicId: result.publicId,
        previewImage: result.url, // For images, preview is the same as the image
      };
    } catch (error: unknown) {
      this.cleanupFiles([filePath]);
      throw error;
    }
  }

  /**
   * Process a video file
   */
  async processVideo(
    filePath: string,
    folder: string = 'chekins_posts',
  ): Promise<{
    type: 'video';
    url: string;
    publicId: string;
    previewImage: string;
  }> {
    const generatedFiles: string[] = [filePath];

    try {
      // Generate thumbnail
      const thumbnailPath = await VideoUtils.generateThumbnail(filePath);
      generatedFiles.push(thumbnailPath);

      // Transcode to 720p
      const transcodedPath = await VideoUtils.transcodeVideo(filePath, {
        resolution: '720p',
        format: 'mp4',
      });
      generatedFiles.push(transcodedPath);

      // Upload video to Cloudinary
      const videoResult = await cloudinaryService.uploadFile(transcodedPath, {
        resourceType: 'video',
        folder,
      });

      // Upload thumbnail to Cloudinary
      const thumbnailResult = await cloudinaryService.uploadFile(
        thumbnailPath,
        {
          resourceType: 'image',
          folder: `${folder}_thumbnails`,
        },
      );

      // Clean up temporary files
      this.cleanupFiles(generatedFiles);

      return {
        type: 'video',
        url: videoResult.url,
        publicId: videoResult.publicId,
        previewImage: thumbnailResult.url,
      };
    } catch (error: unknown) {
      this.cleanupFiles(generatedFiles);
      throw error;
    }
  }

  /**
   * Process a media file based on its type
   */
  async processMedia(
    filePath: string,
    folder: string = 'chekins_posts',
  ): Promise<{
    type: 'image' | 'video';
    url: string;
    publicId: string;
    previewImage: string;
  }> {
    const ext = path.extname(filePath).toLowerCase();
    const isVideo = [
      '.mp4',
      '.mov',
      '.avi',
      '.wmv',
      '.flv',
      '.webm',
      '.mkv',
    ].includes(ext);

    // Check if FFmpeg is available for video processing
    if (isVideo) {
      try {
        // Simple test to see if ffprobe is available
        await VideoUtils.getVideoMetadata(filePath);
        return this.processVideo(filePath, folder);
      } catch (error: unknown) {
        // Type guard to check if error is an Error object with message property
        if (
          error instanceof Error &&
          error.message.includes('Cannot find ffprobe')
        ) {
          console.error(
            'FFmpeg/FFprobe not found. Please install FFmpeg to process video files.',
          );
          // Fall back to treating it as an image or provide a placeholder
          return {
            type: 'video',
            url: 'https://res.cloudinary.com/your-cloud-name/video/upload/v1/placeholder-video.mp4',
            publicId: 'placeholder-video',
            previewImage:
              'https://res.cloudinary.com/your-cloud-name/image/upload/v1/placeholder-video-thumbnail.jpg',
          };
        }
        throw error;
      }
    } else {
      return this.processImage(filePath, folder);
    }
  }

  /**
  * Clean up temporary files with retries (handles Windows file locks)
  */
  private async cleanupFiles(filePaths: string[]): Promise<void> {
    const maxRetries = 5;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const filePath of filePaths) {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          break; // ✅ success, break out of retry loop
        } catch (error: any) {
          attempt++;
          console.warn(
            `Attempt ${attempt} to remove ${filePath} failed: ${error.message}`
          );

          if (attempt < maxRetries) {
            await delay(500 * attempt); // backoff delay (0.5s, 1s, 1.5s...)
          } else {
            console.error(
              `Failed to remove ${filePath} after ${maxRetries} attempts.`
            );
          }
        }
      }
    }
  }

}

export default new MediaService();
