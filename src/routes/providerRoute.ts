import express from 'express';
import { searchUsers } from '../controllers/searchProviders';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// GET /api/users/search?skill=tailor&longitude=3.3792&latitude=6.5244
router.get('/search', authenticateToken, searchUsers);

export default router;
