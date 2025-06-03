import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Message, MessageStatus } from '../models/message.model';
import { presenceService } from './presence.service';
import { HireRequest, HireRequestStatus } from '../models/hire-request.model';
import { notificationService } from './notification.service';
import { NotificationType } from '../models/notification.model';

class SocketService {
  private io: SocketIOServer | null = null;
  private userSocketMap: Map<string, string[]> = new Map();

  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.use((socket: any, next: any) => {
      // Get token from handshake auth
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        // Verify the token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key',
        ) as any;
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`User connected: ${userId}`);

      // Add socket to user's socket list
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, []);
      }
      this.userSocketMap.get(userId)?.push(socket.id);

      // Update user's online status in Redis
      presenceService.setUserOnline(userId);

      // Handle user online status
      this.emitUserStatus(userId, true);

      // Handle typing indicators
      socket.on(
        'typing',
        (data: { conversationId: string; isTyping: boolean }) => {
          const { conversationId, isTyping } = data;

          // Find recipient and emit typing status
          this.emitToConversation(conversationId, userId, 'typing_indicator', {
            conversationId,
            userId,
            isTyping,
          });
        },
      );

      // Handle message delivery status updates
      socket.on('message_delivered', async (data: { messageId: string }) => {
        try {
          const message = await Message.findById(data.messageId);
          if (
            message &&
            message.recipient.toString() === userId &&
            message.status === MessageStatus.SENT
          ) {
            message.status = MessageStatus.DELIVERED;
            message.deliveredAt = new Date();
            await message.save();

            // Notify sender
            this.emitToUser(
              message.sender.toString(),
              'message_status_update',
              {
                messageId: message._id,
                status: MessageStatus.DELIVERED,
              },
            );
          }
        } catch (error) {
          console.error('Error updating message delivery status:', error);
        }
      });

      // Handle heartbeat
      socket.on('heartbeat', async () => {
        // Update user's online status in Redis
        await presenceService.setUserOnline(userId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);

        // Remove socket from user's socket list
        const userSockets = this.userSocketMap.get(userId) || [];
        const updatedSockets = userSockets.filter((id) => id !== socket.id);

        if (updatedSockets.length === 0) {
          // User is completely offline
          this.userSocketMap.delete(userId);
          this.emitUserStatus(userId, false);
        } else {
          // User still has other active connections
          this.userSocketMap.set(userId, updatedSockets);
        }
      });

      // Handle hire request responses
      socket.on(
        'hire_response',
        async (data: { requestId: string; accept: boolean }) => {
          try {
            if (!userId || !data.requestId) return;

            const hireRequest = await HireRequest.findById(data.requestId);
            if (!hireRequest || hireRequest.provider.toString() !== userId)
              return;

            // Update the hire request status
            hireRequest.status = data.accept
              ? HireRequestStatus.ACCEPTED
              : HireRequestStatus.DECLINED;

            await hireRequest.save();

            // Notify the client of the response
            const statusMessage = data.accept
              ? 'accepted your hire request'
              : 'declined your hire request';

            await notificationService.createNotification({
              recipient: hireRequest.client.toString(),
              sender: userId,
              type: NotificationType.HIRE_REQUEST,
              content: statusMessage,
              reference: {
                type: 'user',
                id: hireRequest._id.toString(),
              },
            });

            // Emit confirmation back to provider
            socket.emit('hire_response_confirmed', {
              requestId: data.requestId,
              status: hireRequest.status,
            });
          } catch (error) {
            console.error('Error handling hire response:', error);
          }
        },
      );
    });
  }

  // Emit to a specific user across all their connected devices
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const userSockets = this.userSocketMap.get(userId) || [];
    userSockets.forEach((socketId) => {
      this.io?.to(socketId).emit(event, data);
    });
  }

  // Emit to all participants in a conversation except the sender
  emitToConversation(
    conversationId: string,
    senderId: string,
    event: string,
    data: any,
  ): void {
    if (!this.io) return;

    // This is a simplified approach. In a real app, you'd query the database
    // to find all participants in the conversation and emit to them.
    this.io.emit('conversation_event', {
      conversationId,
      senderId,
      event,
      data,
    });
  }

  // Emit user online/offline status to all connected clients
  private emitUserStatus(userId: string, isOnline: boolean): void {
    if (!this.io) return;

    this.io.emit('user_status', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  // Check if a user is online
  isUserOnline(userId: string): boolean {
    return (
      this.userSocketMap.has(userId) &&
      (this.userSocketMap.get(userId)?.length || 0) > 0
    );
  }
}

export const socketService = new SocketService();
