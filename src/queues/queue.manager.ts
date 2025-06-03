import { Queue, Worker, QueueEvents } from 'bullmq';
import { EventEmitter } from 'events';
import notificationService from '../services/notification.service';
require('dotenv').config();

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export class QueueManager extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new queue
   */
  createQueue<T>(name: string, options: any = {}): Queue<T> {
    if (this.queues.has(name)) {
      return this.queues.get(name) as Queue<T>;
    }

    const queue = new Queue<T>(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      ...options,
    });

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Create a worker for a queue
   */
  createWorker<T>(
    name: string,
    processor: (job: any) => Promise<any>,
    options: any = {},
  ): Worker<T, any, string> {
    if (this.workers.has(name)) {
      return this.workers.get(name) as Worker<T, any, string>;
    }

    const worker = new Worker<T, any, string>(name, processor, {
      connection,
      ...options,
    });

    worker.on('completed', (job, result) => {
      this.emit(`${name}:completed`, job, result);
      console.log(`[${name}] Job ${job?.id || 'unknown'} completed`);
    });

    worker.on('failed', (job, error) => {
      this.emit(`${name}:failed`, job, error);

      const attemptsMade = job?.attemptsMade || 0;
      const maxAttempts = job?.opts?.attempts || 3;

      console.error(`[${name}] Job ${job?.id || 'unknown'} failed:`, error);

      // If this was the final retry, emit a critical failure event
      if (attemptsMade >= maxAttempts) {
        this.emit(`${name}:criticalFailure`, job, error);
        console.error(
          `[${name}] CRITICAL: Job ${job?.id || 'unknown'} has failed all ${maxAttempts} retry attempts`,
        );

        // Update the post status to failed if this was the last retry
        this.handleFinalFailure(job);
      }
    });

    worker.on('progress', (job, progress) => {
      this.emit(`${name}:progress`, job, progress);
      console.log(
        `[${name}] Job ${job?.id || 'unknown'} progress: ${progress}%`,
      );
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Create queue events
   */
  createQueueEvents(name: string): QueueEvents {
    if (this.queueEvents.has(name)) {
      return this.queueEvents.get(name) as QueueEvents;
    }

    const queueEvents = new QueueEvents(name, { connection });
    this.queueEvents.set(name, queueEvents);
    return queueEvents;
  }

  /**
   * Get a queue by name
   */
  getQueue<T>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  /**
   * Handle final failure of a job
   */
  private async handleFinalFailure(job: any): Promise<void> {
    if (!job || !job.data) return;

    // Send admin notification
    notificationService.sendAdminAlert(
      'Media Processing Failed',
      `Job ${job.id} failed after all retry attempts: ${job.failedReason || 'Unknown error'}`,
    );

    // If this is a media processing job, update the post status
    if (job.data.postId && job.data.mediaIndex !== undefined) {
      try {
        const { Post } = require('../models/post.model');

        // Update the specific media item
        await Post.findByIdAndUpdate(job.data.postId, {
          $set: {
            [`media.${job.data.mediaIndex}.processingStatus`]: 'failed',
            [`media.${job.data.mediaIndex}.processingError`]:
              job.failedReason || 'Processing failed after multiple attempts',
          },
        });

        console.log(
          `Updated post ${job.data.postId} with failed status for media at index ${job.data.mediaIndex}`,
        );
      } catch (error) {
        console.error('Error updating post status after final failure:', error);
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(name: string): Promise<any> {
    const queue = this.getQueue(name);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(name: string, limit = 10): Promise<any[]> {
    const queue = this.getQueue(name);
    if (!queue) return [];

    const jobs = await queue.getFailed(0, limit);
    return jobs.map((job) => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  /**
   * Close all queues and workers
   */
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    // Close all workers
    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }

    // Close all queue events
    for (const queueEvents of this.queueEvents.values()) {
      closePromises.push(queueEvents.close());
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }

    await Promise.all(closePromises);
  }
}

// Export a singleton instance
export default new QueueManager();
