import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import { seedRoles } from './seeders/role.seeder';
import updateRoutes from './routes/update.route';
import postRoutes from './routes/post.route';
import messageRoutes from './routes/message.route';
import cleanupService from './services/cleanup.service';
import adminRoutes from './routes/admin.route';
import redisService from './services/redis.service';
import { socketService } from './services/socket.service';
import userRoutes from './routes/user.route';
import hireRoutes from './routes/hire.route';

// Load environment variables
dotenv.config();

// Import cloudinary configuration
import './utils/cloudinary.config';

const app = express();
const server = http.createServer(app);

import authRoutes from './routes/auth.route';

app.use(express.json());
cleanupService.startScheduledCleanup();

// Initialize Socket.io
socketService.initialize(server);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chekins')
  .then(() => {
    console.log('Connected to MongoDB');

    // Seed roles after connecting to the database
    return seedRoles();
  })
  .then(() => {
    // Import and use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/update', updateRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/hire', hireRoutes);

    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
  });

// Handle application shutdown
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down...');
  await redisService.close();
  await mongoose.connection.close();
  process.exit(0);
});
