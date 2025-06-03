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
    availableForHire: boolean;
    displayRatesPublicly: boolean;
    rates: {
      hourly: number;
      fixed: number;
      currency: string;
    };
    skills: string[];
    servicesOffered: string[];
    preferredPaymentMethods: string[];
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
  hiringSettings: {
    availableForHire: {
      type: Boolean,
      default: false,
    },
    displayRatesPublicly: {
      type: Boolean,
      default: false,
    },
    rates: {
      hourly: Number,
      fixed: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    skills: [String],
    servicesOffered: [String],
    preferredPaymentMethods: [String],
  },
});

export const user = model<IUser>('User', userSchema);
