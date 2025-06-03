import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redis.service';

/**
 * Middleware to cache API responses
 * @param ttl Time to live in seconds
 * @param keyPrefix Optional prefix for the cache key
 */
export const cacheMiddleware = (ttl: number = 3600, keyPrefix: string = '') => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Create a cache key based on the URL and query parameters
      const key = `${keyPrefix}:${req.originalUrl || req.url}`;

      // Try to get data from cache
      const cachedData = await redisService.get(key);

      if (cachedData) {
        console.log(`Cache hit for ${key}`);
        res.status(200).json({
          success: true,
          data: cachedData,
          fromCache: true,
        });
        return;
      }

      console.log(`Cache miss for ${key}`);

      // Store the original send method
      const originalSend = res.send;

      // Override the send method
      res.send = function (body: any): Response {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            if (data.success && data.data) {
              // Store in cache
              redisService.set(key, data.data, ttl);
            }
          } catch (error) {
            console.error('Error parsing response body for caching:', error);
          }
        }

        // Call the original send method
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Function to invalidate cache for a specific pattern
 * @param pattern Pattern to match cache keys
 */
export const invalidateCache = async (pattern: string): Promise<void> => {
  await redisService.deleteByPattern(pattern);
};
