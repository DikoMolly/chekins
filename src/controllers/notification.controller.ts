import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

// Get all notifications for current user
export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
    });
  }
};

// Mark notifications as read
export const markNotificationsAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { notificationIds } = req.body;

    const result = await notificationService.markAsRead(
      userId,
      notificationIds
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.count} notifications as read`,
      data: result,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notifications',
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification count',
    });
  }
}; 