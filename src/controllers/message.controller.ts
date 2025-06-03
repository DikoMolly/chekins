import { Request, Response } from 'express';
import { Message, MessageStatus } from '../models/message.model';
import { Conversation } from '../models/conversation.model';
import { Types } from 'mongoose';
import cloudinaryService from '../services/cloudinary.service';
import { socketService } from '../services/socket.service';
import fs from 'fs';
import path from 'path';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

// Send a new message
export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { conversationId } = req.params;
    const { content } = req.body;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a participant',
      });
      return;
    }

    // Find the recipient (the other participant)
    const recipientId = conversation.participants.find(
      (id) => id.toString() !== userId,
    );

    if (!recipientId) {
      res.status(400).json({
        success: false,
        message: 'Recipient not found in conversation',
      });
      return;
    }

    // Handle file uploads if any
    const attachments = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          // Determine file type
          const mimeType = file.mimetype;
          let fileType: 'image' | 'video' | 'document' = 'document';

          if (mimeType.startsWith('image/')) {
            fileType = 'image';
          } else if (mimeType.startsWith('video/')) {
            fileType = 'video';
          }

          // Upload to Cloudinary
          const result = await cloudinaryService.uploadFile(file.path, {
            resourceType: fileType === 'document' ? 'auto' : fileType,
            folder: 'chekins_messages',
          });

          // Add to attachments
          attachments.push({
            type: fileType,
            url: result.url,
            publicId: result.publicId,
            filename: file.originalname,
            filesize: file.size,
            mimeType: file.mimetype,
          });

          // Clean up the temp file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // Continue with other files if one fails
        }
      }
    }

    // Ensure message has either content or attachments
    if (!content && attachments.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Message must have either content or attachments',
      });
      return;
    }

    // Create the message
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      recipient: recipientId,
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: MessageStatus.SENT,
    });

    await message.save();

    // Update the conversation's lastMessage
    conversation.lastMessage = message._id as unknown as Types.ObjectId;
    await conversation.save();

    // Populate sender info for the response
    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email profilePic',
    );

    // Emit socket event for real-time delivery
    socketService.emitToUser(recipientId.toString(), 'new_message', {
      message: populatedMessage,
    });

    // Don't send notification for messages if user is online (they'll get it in real-time)
    const isRecipientOnline = socketService.isUserOnline(recipientId.toString());
    if (!isRecipientOnline) {
      await notificationService.createNotification({
        recipient: recipientId.toString(),
        sender: userId,
        type: NotificationType.NEW_MESSAGE,
        content: 'sent you a message',
        reference: {
          type: 'message',
          id: (message._id as Types.ObjectId).toString(),
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message',
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a participant',
      });
      return;
    }

    // Find the sender (the other participant)
    const senderId = conversation.participants.find(
      (id) => id.toString() !== userId,
    );

    // Mark all unread messages from the other user as read
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        sender: senderId,
        recipient: userId,
        status: { $ne: MessageStatus.READ },
      },
      {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    );

    // Emit socket event to notify the sender that messages were read
    if (result.modifiedCount > 0 && senderId) {
      socketService.emitToUser(senderId.toString(), 'messages_read', {
        conversationId,
        readBy: userId,
        count: result.modifiedCount,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        count: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read',
    });
  }
};

// Delete a message (for the current user only)
export const deleteMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete messages you sent',
      });
      return;
    }

    // If message has attachments, delete them from Cloudinary
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        try {
          const resourceType =
            attachment.type === 'image'
              ? 'image'
              : attachment.type === 'video'
                ? 'video'
                : 'raw';

          await cloudinaryService.deleteFile(
            attachment.publicId,
            resourceType as any,
          );
        } catch (deleteError) {
          console.error('Error deleting attachment:', deleteError);
          // Continue with other attachments if one fails
        }
      }
    }

    // Delete the message
    await message.deleteOne();

    // If this was the last message in the conversation, update lastMessage
    const conversation = await Conversation.findById(message.conversation);
    if (conversation && conversation.lastMessage?.toString() === messageId) {
      // Find the new last message
      const newLastMessage = await Message.findOne({
        conversation: conversation._id,
      }).sort({ createdAt: -1 });

      conversation.lastMessage = newLastMessage?._id
        ? (newLastMessage._id as unknown as Types.ObjectId)
        : undefined;
      await conversation.save();
    }

    // Notify the other user that the message was deleted
    socketService.emitToUser(message.recipient.toString(), 'message_deleted', {
      messageId,
      conversationId: message.conversation,
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message',
    });
  }
};
