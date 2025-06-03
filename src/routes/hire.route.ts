import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  sendHireRequest,
  getClientHireRequests,
  getProviderHireRequests,
  updateHireRequestStatus,
  getHireRequest,
  quickHire,
  hireButton,
} from '../controllers/hire.controller';

const router = Router();

// Send a hire request
router.post('/', authenticateToken, sendHireRequest);

// Get hire requests where user is hiring
router.get('/client', authenticateToken, getClientHireRequests);

// Get hire requests where user is being hired
router.get('/provider', authenticateToken, getProviderHireRequests);

// Update hire request status
router.patch('/:requestId/status', authenticateToken, updateHireRequestStatus);

// Get a single hire request
router.get('/:requestId', authenticateToken, getHireRequest);

// Add this route to your existing hire routes
router.post('/quick', authenticateToken, quickHire);

// Add this route to your existing hire routes
router.post('/button/:providerId', authenticateToken, hireButton);

export default router;
