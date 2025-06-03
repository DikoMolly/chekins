import { Request, Response } from 'express';
import { presenceService } from '../services/presence.service';
import { user as User } from '../models/user.model';
import { Types } from 'mongoose';

// Get online status for a list of users
export const getUsersOnlineStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      res.status(400).json({
        success: false,
        message: 'userIds must be an array',
      });
      return;
    }

    // Validate user IDs
    const validUserIds = userIds.filter((id) => Types.ObjectId.isValid(id));

    // Get online status for all valid users
    const onlineStatus =
      await presenceService.getUsersOnlineStatus(validUserIds);

    res.status(200).json({
      success: true,
      data: onlineStatus,
    });
  } catch (error) {
    console.error('Error fetching online status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching online status',
    });
  }
};

// Get user status with last active time
export const getUserStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Check if user exists
    const user = await User.findById(userId).select('name profilePic');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Get online status and last active time
    const isOnline = await presenceService.isUserOnline(userId);
    const lastActive = await presenceService.getUserLastActive(userId);

    res.status(200).json({
      success: true,
      data: {
        user,
        status: {
          online: isOnline,
          lastActive,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user status',
    });
  }
};

// Add this function to user.controller.ts
export const setUserOnline = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await presenceService.setUserOnline(userId);

    res.status(200).json({
      success: true,
      message: 'User marked as online',
      data: {
        userId,
        online: true,
      },
    });
  } catch (error) {
    console.error('Error setting user online:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting user online',
    });
  }
};
