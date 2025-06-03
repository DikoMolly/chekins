import { Router, Request, Response } from 'express';
import queueManager from '../queues/queue.manager';

const router = Router();

// Add routes to view queue status and job history
router.get('/queues/status', async (req: Request, res: Response) => {
  const stats = await queueManager.getQueueStats('media-processing');
  res.json(stats);
});

router.get('/jobs/failed', async (req: Request, res: Response) => {
  const failedJobs = await queueManager.getFailedJobs('media-processing');
  res.json(failedJobs);
});

export default router;
