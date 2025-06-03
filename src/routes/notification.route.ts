import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.patch('/read', authenticateToken, markNotificationsAsRead);
router.get('/unread/count', authenticateToken, getUnreadCount);

export default router; 