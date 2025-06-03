import { Schema, model, Document, Types } from 'mongoose';

export enum HireRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface IHireRequest extends Document {
  client: Types.ObjectId;  // User who is hiring
  provider: Types.ObjectId;  // User being hired (individual or business)
  status: HireRequestStatus;
  description: string;
  budget?: number;
  timeline?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HireRequestSchema = new Schema<IHireRequest>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(HireRequestStatus),
      default: HireRequestStatus.PENDING,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
    },
    timeline: {
      type: String,
    },
  },
  { timestamps: true }
);

export const HireRequest = model<IHireRequest>('HireRequest', HireRequestSchema); 