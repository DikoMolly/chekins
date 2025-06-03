import { Schema, model, Document, Types } from 'mongoose';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface IAttachment {
  type: 'image' | 'video' | 'document';
  url: string;
  publicId: string;
  filename: string;
  filesize?: number;
  mimeType?: string;
}

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  content?: string;
  attachments?: IAttachment[];
  status: MessageStatus;
  readAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'document'],
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
  filename: {
    type: String,
    required: true,
  },
  filesize: {
    type: Number,
  },
  mimeType: {
    type: String,
  },
});

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    attachments: [AttachmentSchema],
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
    },
    readAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Create compound indexes for efficient queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, recipient: 1 });

// Validate that a message has either content or attachments
MessageSchema.pre('validate', function (next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    next(new Error('Message must have either content or attachments'));
  } else {
    next();
  }
});

export const Message = model<IMessage>('Message', MessageSchema); 