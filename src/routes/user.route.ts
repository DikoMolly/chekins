import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  getUsersOnlineStatus,
  getUserStatus,
  setUserOnline,
} from '../controllers/user.controller';

const router = Router();

// User status routes
router.post('/status', authenticateToken, getUsersOnlineStatus);
router.get('/status/:userId', authenticateToken, getUserStatus);
router.get('/set-online', authenticateToken, setUserOnline);

export default router; 