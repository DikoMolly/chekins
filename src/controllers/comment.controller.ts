import { Request, Response } from 'express';
import { Comment } from '../models/comment.model';
import { Post } from '../models/post.model';
import { Types } from 'mongoose';
import { invalidateCache } from '../middlewares/cache.middleware';
import notificationService from '../services/notification.service';
import { NotificationType } from '../models/notification.model';

// Create a new comment
export const createComment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.postId;
    const userId = (req as any).user.userId;

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found',
      });
      return;
    }

    // Create the comment
    const comment = new Comment({
      post: postId,
      user: userId,
      content,
      parentComment: parentComment || null,
    });

    // Save the comment
    await comment.save();

    // Add comment reference to the post
    post.comments.push(comment._id as unknown as Types.ObjectId);
    await post.save();

    // Invalidate cache
    await invalidateCache(`post:*${postId}*`);
    await invalidateCache(`comments:*${postId}*`);

    // Fetch the populated comment to return
    const populatedComment = await Comment.findById(comment._id).populate(
      'user',
      'name profilePic',
    );

    if (comment.parentComment) {
      // This is a reply to another comment - notify the original commenter
      const parentComment = await Comment.findById(comment.parentComment);
      if (parentComment && parentComment.user.toString() !== userId) {
        await notificationService.createNotification({
          recipient: parentComment.user.toString(),
          sender: userId,
          type: NotificationType.COMMENT_REPLY,
          content: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          reference: {
            type: 'comment',
            id: (comment._id as Types.ObjectId).toString(),
          },
        });
      }
    } else {
      // This is a comment on a post - notify the post author
      if (post.user.toString() !== userId) {
        await notificationService.createNotification({
          recipient: post.user.toString(),
          sender: userId,
          type: NotificationType.NEW_COMMENT,
          content: `commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          reference: {
            type: 'post',
            id: (post._id as Types.ObjectId).toString(),
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during comment creation',
    });
  }
};

// Get all comments for a post
export const getPostComments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get only top level comments (no parent)
    const comments = await Comment.find({
      post: postId,
      parentComment: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name profilePic')
      .populate({
        path: 'likedBy',
        select: '_id name',
        options: { limit: 5 },
      });

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
    });

    res.status(200).json({
      success: true,
      data: {
        comments,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching comments',
    });
  }
};

// Get replies for a comment
export const getCommentReplies = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const replies = await Comment.find({
      parentComment: commentId,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name profilePic');

    const total = await Comment.countDocuments({
      parentComment: commentId,
    });

    res.status(200).json({
      success: true,
      data: {
        replies,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching replies',
    });
  }
};

// Like or unlike a comment
export const toggleCommentLike = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    // Check if user already liked this comment
    const userIdObj = new Types.ObjectId(userId);
    const alreadyLiked = comment.likedBy.some((id) => id.equals(userIdObj));

    if (alreadyLiked) {
      // Unlike: Remove user from likedBy and decrement likes
      comment.likedBy = comment.likedBy.filter(
        (id) => !id.equals(userIdObj),
      ) as any;
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Like: Add user to likedBy and increment likes
      comment.likedBy.push(userIdObj);
      comment.likes += 1;
    }

    await comment.save();

    // Invalidate cache for the post
    await invalidateCache(`post:*${comment.post}*`);
    await invalidateCache(`comments:*${comment.post}*`);
    await invalidateCache(`replies:*${comment.parentComment || ''}*`);

    res.status(200).json({
      success: true,
      message: alreadyLiked ? 'Comment unliked' : 'Comment liked',
      data: {
        likes: comment.likes,
        liked: !alreadyLiked,
      },
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing like action',
    });
  }
};

// Delete a comment
export const deleteComment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    // Check if user is authorized to delete this comment
    if (comment.user.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
      return;
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: commentId },
    });

    // Delete all replies to this comment
    await Comment.deleteMany({ parentComment: commentId });

    // Delete the comment
    await comment.deleteOne();

    // Invalidate cache
    await invalidateCache(`post:*${comment.post}*`);
    await invalidateCache(`comments:*${comment.post}*`);
    await invalidateCache(`replies:*${commentId}*`);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting comment',
    });
  }
};
