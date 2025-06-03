import { Request, Response } from 'express';
import { user as User } from '../models/user.model';
import { presenceService } from '../services/presence.service';

// Account settings
export const updateAccountSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { name, bio, location, website, profileVisibility } = req.body;

    await User.findByIdAndUpdate(userId, {
      name,
      bio,
      location,
      website,
      profileVisibility,
    });

    res.status(200).json({
      success: true,
      message: 'Account settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating account settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating account settings',
    });
  }
};
