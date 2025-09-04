import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Types.ObjectId;
  businessProfile: Types.ObjectId;
  individualProfile: Types.ObjectId;
  isVerified: boolean;
  verificationCode: string;
  verificationCodeExpires: Date;
  hiringSettings: {
    skills: string[];
    servicesOffered: string[];
  
  };
  profilePic?: string;
  availability: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role' },
  businessProfile: { type: Schema.Types.ObjectId, ref: 'BusinessUser' },
  individualProfile: { type: Schema.Types.ObjectId, ref: 'IndividualUser' },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  hiringSettings: {
    skills: { type: [String], default: [] },
    servicesOffered: { type: [String], default: [] },
  },
  // hiringSettings: {
  //   availableForHire: {
  //     type: Boolean,
  //     default: false,
  //   },
  //   displayRatesPublicly: {
  //     type: Boolean,
  //     default: false,
  //   },
  //   rates: {
  //     hourly: Number,
  //     fixed: Number,
  //     currency: {
  //       type: String,
  //       default: 'USD',
  //     },
  //   },
  //   skills: [String],
  //   servicesOffered: [String],
  //   preferredPaymentMethods: [String],
  //   // ✅ Added fields for location & availability
  //   profilePic: { type: String },
  //   availability: { type: Boolean, default: true }, // ON by default
  //   location: {
  //     type: {
  //       type: String,
  //       enum: ['Point'],
  //       default: 'Point',
  //     },
  //     coordinates: {
  //       type: [Number], // [longitude, latitude]
  //       default: [0, 0],
  //     },
      
  //   },
  // },
});

userSchema.index({ location: '2dsphere' });

export const user = model<IUser>('User', userSchema);
