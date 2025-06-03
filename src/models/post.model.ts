import { Schema, model, Document, Types } from 'mongoose';

// Interface for media items
interface IMedia {
  type: 'image' | 'video';
  url: string;
  publicId: string;
  previewImage: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  processingAttempts?: number;
}

// Interface for Post document
export interface IPost extends Document {
  user: Types.ObjectId;
  description: string;
  media: IMedia[];
  likes: number;
  likedBy: Types.ObjectId[];
  comments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processedMediaCount: number;
  totalMediaCount: number;
  hasLiked?: boolean;
}

// Schema for media items within posts
const MediaSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  previewImage: {
    type: String,
    required: true,
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: {
    type: String,
  },
  processingAttempts: {
    type: Number,
    default: 0,
  },
});

// Main Post schema
const PostSchema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    media: {
      type: [MediaSchema],
      validate: {
        validator: function (media: IMedia[]) {
          return media.length > 0;
        },
        message: 'Post must include at least one image or video',
      },
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    version: {
      type: Number,
      default: 0,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processedMediaCount: {
      type: Number,
      default: 0,
    },
    totalMediaCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Post = model<IPost>('Post', PostSchema);
