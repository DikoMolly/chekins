import { Schema, model, Document, Types } from 'mongoose';

export interface IBusinessUser extends Document {
  user: Types.ObjectId; // Reference to main user
  companyName: string;
  companyEmail: string;
  profilePicture?: string;
  bio?: string;
  // location: {
  //   city: string;
  //   state: string;
  //   country: string;
  //   coordinates?: {
  //     lat: number;
  //     lng: number;
  //   };
  // };
  website?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const businessUserSchema = new Schema<IBusinessUser>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: { type: String, required: true },
    companyEmail: { type: String, required: true },
    profilePicture: { type: String },
    bio: { type: String },
    // location: {
      
    //   state: { type: String, required: true },
    //   country: { type: String, required: true },
    //   city: { type: String, required: true },
    //   coordinates: {
    //     lat: { type: Number },
    //     lng: { type: Number },
    //   },
    // },
    website: { type: String },
    isVerified: { type: Boolean, default: false },
    version: {
      type: Number,
      default: 0
    },
  },
  { timestamps: true },
);

export const BusinessUser = model<IBusinessUser>(
  'BusinessUser',
  businessUserSchema,
);
