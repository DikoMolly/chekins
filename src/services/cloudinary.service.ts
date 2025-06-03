import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any;
}

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  resourceType: string;
}

export class CloudinaryService {
  constructor() {
    // Ensure Cloudinary is configured
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a file to Cloudinary
   * @param filePath Path to the file on disk
   * @param options Cloudinary upload options
   */
  async uploadFile(
    filePath: string,
    options: CloudinaryUploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions: any = {
        resource_type: options.resourceType || 'auto',
      };

      if (options.folder) {
        uploadOptions.folder = options.folder;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error(
        `Failed to upload file to Cloudinary: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId The public ID of the resource to delete
   * @param resourceType The type of resource (image, video, raw)
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      throw new Error(
        `Failed to delete file from Cloudinary: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Generate a video thumbnail
   */
  async generateVideoThumbnail(publicId: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        resource_type: 'video',
        eager: [
          { format: 'jpg', transformation: [{ width: 640, crop: 'limit' }] },
        ],
      });

      return result.eager[0].secure_url;
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
      throw error;
    }
  }

  /**
   * Generate a secure URL for a Cloudinary resource
   * @param publicId The public ID of the resource
   * @param options Transformation options
   */
  getSecureUrl(publicId: string, options: any = {}): string {
    return cloudinary.url(publicId, {
      secure: true,
      ...options,
    });
  }
}

const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
