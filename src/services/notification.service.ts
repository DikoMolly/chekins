/**
 * Service for sending notifications and alerts
 */
import { Notification, NotificationType, INotification } from '../models/notification.model';
import { socketService } from './socket.service';
import { Types } from 'mongoose';

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification({
    recipient,
    sender,
    type,
    content,
    reference,
  }: {
    recipient: string;
    sender?: string;
    type: NotificationType;
    content: string;
    reference?: {
      type: 'post' | 'comment' | 'message' | 'user';
      id: string;
    };
  }): Promise<INotification> {
    try {
      // Create notification in database
      const notification = new Notification({
        recipient,
        sender: sender ? new Types.ObjectId(sender) : undefined,
        type,
        content,
        reference: reference ? {
          type: reference.type,
          id: new Types.ObjectId(reference.id),
        } : undefined,
      });

      await notification.save();

      // Send real-time notification
      this.sendRealTimeNotification(recipient, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private sendRealTimeNotification(
    recipientId: string,
    notification: INotification
  ): void {
    // Use socketService to send notification to specific user
    socketService.emitToUser(recipientId, 'new_notification', {
      notification: {
        _id: notification._id,
        type: notification.type,
        content: notification.content,
        createdAt: notification.createdAt || new Date(),
        read: notification.read,
        reference: notification.reference,
      },
    });
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    { page = 1, limit = 20, unreadOnly = false }
  ): Promise<{
    notifications: INotification[];
    pagination: {
      total: number;
      page: number;
      pages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const query = { 
      recipient: userId,
      ...(unreadOnly ? { read: false } : {})
    };

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name profilePic'),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(
    userId: string,
    notificationIds?: string[]
  ): Promise<{ count: number }> {
    const query = {
      recipient: userId,
      read: false,
      ...(notificationIds?.length ? { _id: { $in: notificationIds } } : {}),
    };

    const result = await Notification.updateMany(query, {
      $set: { read: true },
    });

    return { count: result.modifiedCount };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipient: userId,
      read: false,
    });
  }

  /**
   * Send an alert to administrators
   */
  async sendAdminAlert(subject: string, message: string): Promise<void> {
    // Send via email, Slack, etc.
    console.log(`ADMIN ALERT: ${subject} - ${message}`);

    // You could integrate with SendGrid, Nodemailer, or a Slack webhook here
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
