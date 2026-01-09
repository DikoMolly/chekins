import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// Configure ffmpeg paths - updated for your setup
if (process.platform === 'win32') {
  // Updated to match your actual installation path
  ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
  ffmpeg.setFfprobePath('C:/ffmpeg/ffprobe.exe');
} else {
  // For Linux/Mac systems (optional)
  // ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  // ffmpeg.setFfprobePath('/usr/bin/ffprobe');
}

export class VideoUtils {
  /**
   * Generate a thumbnail from a video file
   */
  static async generateThumbnail(videoPath: string): Promise<string> {
    const parsedPath = path.parse(videoPath);
    const thumbnailPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_thumbnail.jpg`
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'], // Take screenshot at 10% of the video
          filename: path.basename(thumbnailPath),
          folder: parsedPath.dir,
          size: '640x?',
        })
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * Transcode a video to a specific resolution
   */
  static async transcodeVideo(
    videoPath: string,
    options: {
      resolution: '480p' | '720p';
      format?: 'mp4' | 'webm';
    }
  ): Promise<string> {
    const { resolution, format = 'mp4' } = options;

    // Determine dimensions based on resolution
    const width = resolution === '480p' ? 854 : 1280;
    const height = resolution === '480p' ? 480 : 720;

    const parsedPath = path.parse(videoPath);
    const outputPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_${resolution}.${format}`
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .size(`${width}x${height}`)
        .format(format)
        .videoBitrate(resolution === '480p' ? '1000k' : '2500k')
        .audioBitrate('128k')
        .outputOptions('-movflags faststart') // Optimize for web streaming
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get video metadata
   */
  static async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata);
      });
    });
  }
}

export default VideoUtils;
