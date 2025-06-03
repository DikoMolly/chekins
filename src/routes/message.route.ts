import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getConversations,
  getOrCreateConversation,
  getConversationMessages,
} from '../controllers/conversation.controller';
import {
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
} from '../controllers/message.controller';

const router = Router();

// Conversation routes
router.get('/conversations', authenticateToken, getConversations);
router.get(
  '/conversations/:otherUserId',
  authenticateToken,
  getOrCreateConversation,
);
router.get(
  '/conversations/:conversationId/messages',
  authenticateToken,
  getConversationMessages,
);

// Message routes
router.post(
  '/conversations/:conversationId/messages',
  authenticateToken,
  upload.array('attachments', 5), // Allow up to 5 files
  sendMessage,
);
router.patch(
  '/conversations/:conversationId/read',
  authenticateToken,
  markMessagesAsRead,
);
router.delete('/messages/:messageId', authenticateToken, deleteMessage);

export default router;
