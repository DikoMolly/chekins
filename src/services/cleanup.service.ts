import fs from 'fs';
import path from 'path';

export class CleanupService {
  private uploadsDir: string;
  private maxAge: number; // in milliseconds

  constructor(uploadsDir = 'uploads', maxAgeHours = 24) {
    this.uploadsDir = uploadsDir;
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
  }

  /**
   * Run cleanup of old files
   */
  public async cleanupOldFiles(): Promise<void> {
    console.log('Running scheduled cleanup of old files...');

    try {
      const files = fs.readdirSync(this.uploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);

        try {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtimeMs;

          // Delete files older than maxAge
          if (fileAge > this.maxAge) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old file: ${filePath}`);
          }
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
        }
      }

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Start scheduled cleanup
   */
  public startScheduledCleanup(intervalMinutes = 10): void {
    // Run cleanup immediately
    this.cleanupOldFiles();

    // Schedule regular cleanup
    setInterval(
      () => {
        this.cleanupOldFiles();
      },
      intervalMinutes * 60 * 1000,
    );

    console.log(
      `Scheduled cleanup will run every ${intervalMinutes} minute(s)`,
    );
  }
}

// Create and export singleton
export default new CleanupService();
