import { Router } from 'express';
import {
  signUp,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller';
import { validateSignup } from '../validators/auth.validator';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/signup', validateSignup, signUp);
router.post('/login', loginUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/change-password', authenticateToken, changePassword);

export default router;
