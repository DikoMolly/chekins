import { Document, Types } from 'mongoose';

// Create this file if it doesn't exist
declare module 'mongoose' {
  interface Document {
    _id: Types.ObjectId;
  }
} 