import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file: any, cb) => {
    // Use originalname to determine file extension
    const originalExt = path.extname(file.originalname).toLowerCase();

    // If no extension or invalid, set default based on mimetype
    let extension = originalExt;
    if (!extension || extension === '.') {
      if (file.mimetype.startsWith('image/jpeg')) extension = '.jpg';
      else if (file.mimetype.startsWith('image/png')) extension = '.png';
      else if (file.mimetype.startsWith('image/gif')) extension = '.gif';
      else if (file.mimetype.startsWith('image/webp')) extension = '.webp';
      else if (file.mimetype.startsWith('video/mp4')) extension = '.mp4';
      else if (file.mimetype.startsWith('video/mov')) extension = '.mov';
      else if (file.mimetype.startsWith('video/avi')) extension = '.avi';
      else if (file.mimetype.startsWith('video/wmv')) extension = '.wmv';
      else if (file.mimetype.startsWith('video/flv')) extension = '.flv';
      else if (file.mimetype.startsWith('video/webm')) extension = '.webm';
      else extension = '';
    }

    cb(null, `${Date.now()}${extension}`);
  },
});

// Define file filter with proper typing
const fileFilter = (
  req: any,
  file: any,
  callback: FileFilterCallback,
): void => {
  // Accept images and videos only
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/')
  ) {
    callback(null, true);
  } else {
    callback(
      new Error('Unsupported file type. Only images and videos are allowed.'),
    );
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max file size
  },
});

// Middleware to handle file uploads and queue processing
export const processPostFiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please upload at least one media file (image or video).',
      });
      return;
    }

    console.log(`Received ${files.length} files for upload`);

    // Create placeholder media items
    const mediaItems = files.map((file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const isVideo = [
        '.mp4',
        '.mov',
        '.avi',
        '.wmv',
        '.flv',
        '.webm',
        '.mkv',
      ].includes(ext);

      return {
        type: isVideo ? 'video' : 'image',
        url: 'pending', // Will be updated after processing
        publicId: 'pending',
        previewImage: 'pending',
        // Store the file path for processing
        _filePath: file.path,
      };
    });

    // Add media to request body
    req.body.media = mediaItems;

    // Continue to the next middleware/controller
    // The post will be created with placeholder media
    next();
  } catch (error) {
    console.error('Error handling uploaded files:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing uploaded files',
    });
  }
};

// Middleware to process a single profile picture
export const processProfilePicture = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      next(); // No file uploaded, continue
      return;
    }

    // Upload directly to Cloudinary for profile pictures (no queue)
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

    if (!isImage) {
      res.status(400).json({
        success: false,
        message: 'Profile picture must be an image file',
      });
      return;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'image',
      folder: 'chekins_profiles',
    });

    // Clean up the file
    fs.unlinkSync(file.path);

    // Add profile picture URL to request body
    req.body.profilePicture = result.secure_url;

    next();
  } catch (error) {
    console.error('Error processing profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing profile picture',
    });
  }
};
