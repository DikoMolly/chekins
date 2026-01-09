import { Router } from 'express';
import multer from "multer";
import {
  signUp,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
  updateProfilePicture,
  getUserProfile
} from '../controllers/auth.controller';
import { validateSignup } from '../validators/auth.validator';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() })

// Public routes
router.post('/signup', validateSignup, signUp);
router.post('/login', loginUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get("/profile", authenticateToken, getUserProfile);
router.put("/profile/picture", authenticateToken, upload.single("profilePicture"), updateProfilePicture);

// Protected routes
router.post('/change-password', authenticateToken, changePassword);

export default router;
