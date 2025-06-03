import path from 'path';
import { addMediaProcessingJob } from '../queues/media.queue';

// Add batch processing for multiple files
export class BatchService {
  /**
   * Process a batch of files
   */
  async processBatch(files: string[], postId: string): Promise<void> {
    // Group files by type for more efficient processing
    const images = files.filter((file) => !this.isVideo(file));
    const videos = files.filter((file) => this.isVideo(file));

    // Process in parallel with limits
    await Promise.all([
      this.processImageBatch(images, postId),
      this.processVideoBatch(videos, postId),
    ]);
  }

  /**
   * Check if a file is video based on extension
   */
  private isVideo(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'].includes(
      ext,
    );
  }

  /**
   * Process a batch of images
   */
  private async processImageBatch(
    images: string[],
    postId: string,
  ): Promise<void> {
    // Process images in parallel with concurrency limit
    const concurrencyLimit = 3; // Process 3 images at a time

    for (let i = 0; i < images.length; i += concurrencyLimit) {
      const batch = images.slice(i, i + concurrencyLimit);
      await Promise.all(
        batch.map((filePath, index) =>
          addMediaProcessingJob({
            filePath,
            folder: 'chekins_posts',
            postId,
            mediaIndex: i + index,
          }),
        ),
      );
    }
  }

  /**
   * Process a batch of videos
   */
  private async processVideoBatch(
    videos: string[],
    postId: string,
  ): Promise<void> {
    // Process videos sequentially to avoid overloading the system
    for (let i = 0; i < videos.length; i++) {
      await addMediaProcessingJob({
        filePath: videos[i],
        folder: 'chekins_posts',
        postId,
        mediaIndex: i, // Use separate index space
      });
    }
  }
}

export default new BatchService();
