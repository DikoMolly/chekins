import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test function
async function testCloudinaryUpload() {
  try {
    // Create a simple test image
    const testFile = path.join(__dirname, '../../test-image.jpg');

    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? 'present' : 'missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'present' : 'missing',
    });

    console.log(`Testing upload for file: ${testFile}`);
    console.log(`File exists: ${fs.existsSync(testFile)}`);

    // Try to upload
    const result = await cloudinary.uploader.upload(testFile, {
      resource_type: 'auto',
      folder: 'test',
    });

    console.log('Upload successful! Result:', result);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Run the test
testCloudinaryUpload()
  .then(() => console.log('Test completed successfully'))
  .catch((err) => console.error('Test failed:', err));
