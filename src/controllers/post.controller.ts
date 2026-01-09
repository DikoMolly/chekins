import { Request, Response } from 'express';
import { Post } from '../models/post.model';
import {
  createPostSchema,
  updatePostSchema,
} from '../validators/post.validator';
import { addMediaProcessingJob } from '../queues/media.queue';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import { invalidateCache } from '../middlewares/cache.middleware';

// Create a new post

export const createPost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Extract just the description for validation
    const { description } = req.body;

    // Validate only the description
    const { error } = createPostSchema.validate({ description });
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    // Check if media is present
    if (!req.body.media || req.body.media.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one media file (image or video) is required',
      });
      return;
    }

    // Create new post with placeholder media and processing status
    const post = new Post({
      user: (req as any).user.userId,
      description: req.body.description,
      media: req.body.media.map(({ _filePath, ...media }: any) => ({
        ...media,
        processingStatus: 'pending',
        processingAttempts: 0,
        processingError: null,
      })),
      processingStatus: 'pending',
      processedMediaCount: 0,
      totalMediaCount: req.body.media.length,
    });

    // Save post to database
    await post.save();

    // Queue up media processing jobs
    for (let i = 0; i < req.body.media.length; i++) {
      const media = req.body.media[i];
      await addMediaProcessingJob({
        filePath: media._filePath,
        folder: 'chekins_posts',
        postId: post._id!.toString(),
        mediaIndex: i,
      });
    }

    // Invalidate posts list cache
    await invalidateCache('posts:*');

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Post created successfully. Media processing has been queued.',
      data: post,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during post creation',
    });
  }
};

// Get all posts (with pagination)
// Get posts (single or paginated)
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, page = '1', limit = '10' } = req.query;

    // ✅ If an ID is provided, fetch that single post
    if (id) {
      const post = await Post.findById(id)
        .populate('user', 'name email profilePic')
        .populate({
          path: 'comments',
          options: { limit: 5, sort: { createdAt: -1 } },
          populate: { path: 'user', select: 'name profilePic' },
        });

      if (!post) {
        res.status(404).json({
          success: false,
          message: 'Post not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { post },
      });
      return;
    }

    // ✅ Otherwise, handle normal pagination
    const currentPage = parseInt(page as string, 10);
    const perPage = parseInt(limit as string, 10);
    const skip = (currentPage - 1) * perPage;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('user', 'name email profilePic')
      .lean();

    const total = await Post.countDocuments();
    const totalPages = Math.ceil(total / perPage);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          totalPages,
          currentPage,
          limit: perPage,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching posts',
    });
  }
};

// Get a single post by ID
export const getPostById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const post = await Post.findById(req.params.id)
      .populate('user', 'name email profilePic')
      .populate({
        path: 'comments',
        options: { limit: 5, sort: { createdAt: -1 } },
        populate: { path: 'user', select: 'name profilePic' },
      });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found',
      });
      return;
    }

    // Add hasLiked field if a user is logged in
    const responsePost = post.toObject();
    if (userId) {
      responsePost.hasLiked = post.likedBy.some(
        (id: any) => id.toString() === userId.toString(),
      );
    }

    res.status(200).json({
      success: true,
      data: responsePost,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching post',
    });
  }
};

// Delete a post
export const deletePost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found',
      });
      return;
    }

    // Check if user is authorized to delete this post
    if (post.user.toString() !== (req as any).user.userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post',
      });
      return;
    }

    // Delete media files from Cloudinary
    const deletePromises = post.media.map((item) => {
      const resourceType = item.type === 'video' ? 'video' : 'image';
      return cloudinary.uploader.destroy(item.publicId, {
        resource_type: resourceType,
      });
    });

    await Promise.all(deletePromises);

    // Delete the post from database
    await post.deleteOne();

    // Invalidate both the post detail and posts list caches
    await Promise.all([
      invalidateCache(`post:*${req.params.id}*`),
      invalidateCache('posts:*'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting post',
    });
  }
};
