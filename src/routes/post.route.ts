import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  deletePost,
} from '../controllers/post.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload, processPostFiles } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import {
  createComment,
  getPostComments,
  getCommentReplies,
  toggleCommentLike,
  deleteComment,
} from '../controllers/comment.controller';
import { togglePostLike, getPostLikes } from '../controllers/like.controller';

const router = Router();

// Create a new post - requires authentication and file upload
router.post(
  '/',
  authenticateToken,
  upload.array('media', 10), // Allow up to 10 files
  processPostFiles,
  createPost,
);

// Get all posts with pagination
router.get('/', cacheMiddleware(600, 'posts'), getPosts);

// Get a single post by ID
router.get('/:id', cacheMiddleware(1800, 'post'), getPostById);

// Delete a post - requires authentication
router.delete('/:id', authenticateToken, deletePost);

// Like routes
router.post('/:postId/like', authenticateToken, togglePostLike);
router.get('/:postId/likes', getPostLikes);

// Comment routes
router.post('/:postId/comments', authenticateToken, createComment);
router.get(
  '/:postId/comments',
  cacheMiddleware(300, 'comments'),
  getPostComments,
);
router.get(
  '/comments/:commentId/replies',
  cacheMiddleware(300, 'replies'),
  getCommentReplies,
);
router.post('/comments/:commentId/like', authenticateToken, toggleCommentLike);
router.delete('/comments/:commentId', authenticateToken, deleteComment);

export default router;
