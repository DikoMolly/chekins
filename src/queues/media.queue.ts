import { Job } from 'bullmq';
import queueManager from './queue.manager';
import mediaService from '../services/media.service';
import { Post } from '../models/post.model';

// Define job types
export interface MediaProcessingJob {
  filePath: string;
  folder: string;
  postId: string;
  mediaIndex: number;
}

// Error classification
enum ErrorType {
  TRANSIENT = 'transient', // Temporary errors that should be retried
  PERMANENT = 'permanent', // Permanent errors that should not be retried
}

// Queue name
export const QUEUE_NAME = 'media-processing';

// Create the queue
const mediaQueue = queueManager.createQueue<MediaProcessingJob>(QUEUE_NAME);

// Create the worker
queueManager.createWorker<MediaProcessingJob>(
  QUEUE_NAME,
  async (job: Job<MediaProcessingJob>) => {
    const { filePath, folder, postId, mediaIndex } = job.data;

    try {
      // Update status to processing
      await updateMediaStatus(postId, mediaIndex, 'processing');

      // Report progress
      await job.updateProgress(10);
      console.log(`Processing media file: ${filePath} for post ${postId}`);

      // Process the media file
      const result = await mediaService.processMedia(filePath, folder);

      // Report progress
      await job.updateProgress(70);

      // Update the post with the processed media
      if (postId && mediaIndex !== undefined) {
        const post = await Post.findById(postId);

        if (post && post.media[mediaIndex]) {
          post.media[mediaIndex].url = result.url;
          post.media[mediaIndex].publicId = result.publicId;
          post.media[mediaIndex].previewImage = result.previewImage;
          post.media[mediaIndex].processingStatus = 'completed';
          post.processedMediaCount += 1;

          // Check if all media is processed
          if (post.processedMediaCount === post.totalMediaCount) {
            post.processingStatus = 'completed';
          }

          await post.save();

          await job.updateProgress(100);
          console.log(
            `Updated post ${postId} with processed media at index ${mediaIndex}`,
          );
        } else {
          console.error(
            `Post ${postId} or media index ${mediaIndex} not found`,
          );
        }
      }

      return result;
    } catch (error: unknown) {
      // Classify the error
      const errorType = classifyError(error);

      // Update status to failed if it's a permanent error
      if (errorType === ErrorType.PERMANENT) {
        await updateMediaStatus(
          postId,
          mediaIndex,
          'failed',
          getErrorMessage(error),
        );
        // Skip retries for permanent errors
        await job.discard();
        console.log(
          `Skipping retries for permanent error: ${getErrorMessage(error)}`,
        );
      } else {
        // For transient errors, let the retry mechanism handle it
        console.log(
          `Transient error will be retried: ${getErrorMessage(error)}`,
        );
      }

      console.error(`Error processing media file ${filePath}:`, error);
      throw error;
    }
  },
);

// Set up queue events
const queueEvents = queueManager.createQueueEvents(QUEUE_NAME);

// Helper function to add a job to the queue
export const addMediaProcessingJob = async (
  jobData: MediaProcessingJob,
  jobId?: string,
): Promise<Job<MediaProcessingJob>> => {
  const id = jobId || `post-${jobData.postId}-media-${jobData.mediaIndex}`;
  return await mediaQueue.add(id, jobData);
};

/**
 * Classify errors as transient or permanent
 */
function classifyError(error: unknown): ErrorType {
  if (!(error instanceof Error)) {
    return ErrorType.PERMANENT; // If it's not an Error object, treat as permanent
  }

  const message = error.message.toLowerCase();

  // Permanent errors - issues with the file itself or validation
  if (
    message.includes('invalid file') ||
    message.includes('unsupported format') ||
    message.includes('corrupt') ||
    message.includes('validation failed') ||
    message.includes('not found') ||
    message.includes('permission denied')
  ) {
    return ErrorType.PERMANENT;
  }

  // Transient errors - network or service issues that might resolve on retry
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('connection') ||
    message.includes('temporarily unavailable')
  ) {
    return ErrorType.TRANSIENT;
  }

  // Default to transient for unknown errors to allow retries
  return ErrorType.TRANSIENT;
}

/**
 * Update media status in the database
 */
async function updateMediaStatus(
  postId: string,
  mediaIndex: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  try {
    const updateData: any = {
      [`media.${mediaIndex}.processingStatus`]: status,
    };

    if (errorMessage) {
      updateData[`media.${mediaIndex}.processingError`] = errorMessage;
    }

    // Create the update object with both $set and $inc operators
    const updateObject: any = { $set: updateData };

    // Add increment for processing attempts separately from $set
    if (status === 'processing') {
      updateObject.$inc = {
        [`media.${mediaIndex}.processingAttempts`]: 1,
      };
    }

    await Post.findByIdAndUpdate(postId, updateObject, { new: true });
  } catch (dbError) {
    console.error(`Failed to update media status for post ${postId}:`, dbError);
  }
}

/**
 * Get error message safely
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default mediaQueue;
