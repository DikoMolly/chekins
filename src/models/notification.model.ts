import { Schema, model, Document, Types } from 'mongoose';

export enum NotificationType {
  NEW_COMMENT = 'new_comment',
  COMMENT_REPLY = 'comment_reply',
  POST_LIKE = 'post_like',
  COMMENT_LIKE = 'comment_like',
  NEW_FOLLOWER = 'new_follower',
  NEW_MESSAGE = 'new_message',
  MENTION = 'mention',
  SYSTEM = 'system',
  HIRE_REQUEST = 'hire_request',
}

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender?: Types.ObjectId;
  type: NotificationType;
  read: boolean;
  content: string;
  reference?: {
    type: 'post' | 'comment' | 'message' | 'user';
    id: Types.ObjectId;
  };
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      required: true,
    },
    reference: {
      type: {
        type: String,
        enum: ['post', 'comment', 'message', 'user'],
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', NotificationSchema); 