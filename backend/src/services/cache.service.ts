import { createClient } from 'redis';

class CacheService {
  private client: any;
  private connected: boolean = false;

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || 'vpnredis2025',
      });

      this.client.on('error', (err: Error) => {
        console.log('Redis Client Error (non-fatal):', err.message);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected successfully');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.log('Redis connection failed (continuing without cache):', error);
      this.connected = false;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.connected) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.log('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.log('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.log('Cache delete error:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default new CacheService();
