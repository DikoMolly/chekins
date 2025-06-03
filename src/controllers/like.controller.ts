import { Request, Response } from 'express';
import { Post } from '../models/post.model';
import { Types } from 'mongoose';
import { invalidateCache } from '../middlewares/cache.middleware';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

// Toggle like status for a post
export const togglePostLike = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { postId } = req.params;
    const userId = (req as any).user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found',
      });
      return;
    }

    // Check if user already liked this post
    const userIdObj = new Types.ObjectId(userId);
    const alreadyLiked = post.likedBy.some((id) => id.equals(userIdObj));

    if (alreadyLiked) {
      // Unlike: Remove user from likedBy and decrement likes
      post.likedBy = post.likedBy.filter((id) => !id.equals(userIdObj)) as any;
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // Like: Add user to likedBy and increment likes
      post.likedBy.push(userIdObj);
      post.likes += 1;

      // Notify post author about the like
      if (post.user.toString() !== userId) {
        await notificationService.createNotification({
          recipient: post.user.toString(),
          sender: userId,
          type: NotificationType.POST_LIKE,
          content: 'liked your post',
          reference: {
            type: 'post',
            id: postId,
          },
        });
      }
    }

    await post.save();

    // Invalidate cache for the post
    await invalidateCache(`post:*${postId}*`);
    await invalidateCache('posts:*'); // Also invalidate posts lists as they might show like counts

    res.status(200).json({
      success: true,
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
      data: {
        likes: post.likes,
        liked: !alreadyLiked,
      },
    });
  } catch (error) {
    console.error('Error toggling post like:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing like action',
    });
  }
};

// Get users who liked a post (with pagination)
export const getPostLikes = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId).select('likedBy likes').populate({
      path: 'likedBy',
      select: 'name profilePic',
      options: { skip, limit },
    });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found',
      });
      return;
    }

    const total = post.likes || 0;

    res.status(200).json({
      success: true,
      data: {
        users: post.likedBy,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching post likes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching likes',
    });
  }
};
