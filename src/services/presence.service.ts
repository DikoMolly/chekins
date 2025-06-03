import redisService from './redis.service';

class PresenceService {
  private readonly PRESENCE_KEY_PREFIX = 'presence:';
  private readonly DEFAULT_EXPIRY = 60; // seconds

  // Set a user as online
  async setUserOnline(userId: string): Promise<void> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    await redisService.set(key, Date.now().toString(), this.DEFAULT_EXPIRY);
  }

  // Check if a user is online
  async isUserOnline(userId: string): Promise<boolean> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const value = await redisService.get(key);
    return !!value;
  }

  // Get the last active timestamp for a user
  async getUserLastActive(userId: string): Promise<number | null> {
    const key = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const value = await redisService.get(key);
    return value ? parseInt(value) : null;
  }

  // Get online status for multiple users
  async getUsersOnlineStatus(
    userIds: string[],
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    // Use Promise.all to check all users in parallel
    await Promise.all(
      userIds.map(async (userId) => {
        result[userId] = await this.isUserOnline(userId);
      }),
    );

    return result;
  }
}

export const presenceService = new PresenceService();
