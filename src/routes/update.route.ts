import { Router } from 'express';
import { updateProfile } from '../controllers/update.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload, processProfilePicture } from '../middleware/upload.middleware';

const router = Router();

// Update profile with optional profile picture upload
router.patch(
  '/profile',
  authenticateToken,
  upload.single('profilePicture'),
  processProfilePicture,
  updateProfile,
);

export default router;