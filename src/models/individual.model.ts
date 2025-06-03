import { Schema, model, Document, Types } from 'mongoose';

export interface IIndividualUser extends Document {
  user: Types.ObjectId; // Reference to main user
  name: string;
  profilePicture?: string;
  bio?: string;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const individualUserSchema = new Schema<IIndividualUser>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    profilePicture: { type: String },
    bio: { type: String },
    location: {
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const IndividualUser = model<IIndividualUser>(
  'IndividualUser',
  individualUserSchema,
);
