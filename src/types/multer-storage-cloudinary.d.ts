declare module 'multer-storage-cloudinary' {
  import { StorageEngine } from 'multer';
  import { v2 as cloudinary } from 'cloudinary';

  export interface CloudinaryStorageOptions {
    cloudinary: typeof cloudinary;
    params: {
      folder?: string;
      format?: string;
      public_id?: (req: any, file: any) => string;
      resource_type?: string;
    };
  }

  // Note: CloudinaryStorage doesn't fully implement StorageEngine
  // but we'll use type assertions in our code to make it work
  export class CloudinaryStorage {
    constructor(options: CloudinaryStorageOptions);
  }
}
