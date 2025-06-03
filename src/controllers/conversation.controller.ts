import { Request, Response } from 'express';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { Types } from 'mongoose';
import { invalidateCache } from '../middlewares/cache.middleware';
import { MessageStatus } from '../models/message.model';

// Get all conversations for the current user
export const getConversations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email profilePic')
      .populate({
        path: 'lastMessage',
        select: 'content status createdAt sender',
        populate: {
          path: 'sender',
          select: 'name profilePic',
        },
      });

    // Format the response to be more client-friendly
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p: any) => p._id.toString() !== userId,
      );

      return {
        _id: conv._id,
        otherUser: otherParticipant,
        lastMessage: conv.lastMessage,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations',
    });
  }
};

// Get or create a conversation with another user
export const getOrCreateConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { otherUserId } = req.params;

    if (!Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Check if users are the same
    if (userId === otherUserId) {
      res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself',
      });
      return;
    }

    // Try to find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    })
      .populate('participants', 'name email profilePic')
      .populate({
        path: 'lastMessage',
        select: 'content status createdAt sender',
        populate: {
          path: 'sender',
          select: 'name profilePic',
        },
      });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, otherUserId],
      });

      await conversation.save();

      // Populate the newly created conversation
      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'name email profilePic',
      );
    }

    // Format the response
    const otherParticipant = conversation?.participants?.find(
      (p: any) => p._id.toString() !== userId,
    );

    const formattedConversation = {
      _id: conversation?._id,
      otherUser: otherParticipant,
      lastMessage: conversation?.lastMessage,
      updatedAt: conversation?.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedConversation,
    });
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing conversation',
    });
  }
};

// Get messages for a specific conversation
export const getConversationMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Verify the conversation exists and user is a participant
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

    // Get messages with pagination, newest first
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email profilePic');

    const total = await Message.countDocuments({
      conversation: conversationId,
    });

    // Mark unread messages as delivered if recipient is current user
    const unreadMessages = messages.filter(
      (msg) =>
        msg.recipient.toString() === userId &&
        msg.status === 'sent' &&
        !msg.deliveredAt,
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg._id);

      await Message.updateMany(
        { _id: { $in: messageIds } },
        {
          status: MessageStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      );

      // Update the messages in the response
      unreadMessages.forEach((msg) => {
        msg.status = MessageStatus.DELIVERED;
        msg.deliveredAt = new Date();
      });
    }

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages',
    });
  }
};
