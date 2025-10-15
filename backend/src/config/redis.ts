import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Too many retries, stopping reconnection');
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      await this.client.connect();

    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      // Don't exit process - app can work without cache
      this.client = null;
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not available for GET operation');
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, expiresIn?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not available for SET operation');
      return;
    }
    try {
      if (expiresIn) {
        await this.client.setEx(key, expiresIn, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not available for DEL operation');
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flush(): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not available for FLUSH operation');
      return;
    }
    try {
      await this.client.flushAll();
      logger.info('Redis cache flushed');
    } catch (error) {
      logger.error('Redis FLUSH error:', error);
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();
