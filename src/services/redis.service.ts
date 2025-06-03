import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
  private client: Redis;
  private isConnected: boolean = false;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('Redis client connected');
    });

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('Redis client disconnected');
    });
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<any> {
    try {
      if (!this.isConnected) return null;

      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(
    key: string,
    value: any,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      if (!this.isConnected) return;

      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      if (!this.isConnected) return;

      // Use SCAN instead of KEYS for production environment
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(
          `Deleted ${keys.length} cache keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      console.error(`Redis delete by pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) return;

      await this.client.del(key);
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
    }
  }

  /**
   * Check if the client is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }
}

// Export a singleton instance
const redisService = new RedisService();
export default redisService;
