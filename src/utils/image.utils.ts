import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export class ImageUtils {
  /**
   * Resize an image and save it to a new file
   */
  static async resizeImage(
    inputPath: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    },
  ): Promise<string> {
    const { width, height, quality = 80, format = 'jpeg' } = options;

    // Create output filename
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_${width}x${height || 'auto'}.${format}`,
    );

    // Process the image
    await sharp(inputPath)
      .resize(width, height)
      .toFormat(format, { quality })
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Compress an image with different quality settings
   */
  static async compressImage(
    imagePath: string,
    quality: number = 80,
  ): Promise<string> {
    const parsedPath = path.parse(imagePath);
    const outputPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_compressed${parsedPath.ext}`,
    );

    try {
      // Process the image
      await sharp(imagePath).jpeg({ quality }).toFile(outputPath);

      // Explicitly close any open file handles
      // This is a workaround for Sharp not always releasing file handles immediately
      if (process.platform === 'win32') {
        // Force garbage collection if possible (not guaranteed to work)
        if (global.gc) {
          global.gc();
        }
      }

      return outputPath;
    } catch (error) {
      console.error(`Error compressing image ${imagePath}:`, error);
      throw error;
    }
  }
}

export default ImageUtils;
