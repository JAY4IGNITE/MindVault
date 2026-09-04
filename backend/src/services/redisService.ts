import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisCacheService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    const url = config.redisUrl || process.env.REDIS_URL;
    if (!url) {
      logger.info('Redis URL not configured. In-memory fallback / no-op caching mode active.');
      return;
    }

    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        retryStrategy(times) {
          if (times > 5) return null; // stop retrying after 5 attempts
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to Redis caching server successfully.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.warn({ err: err.message }, 'Redis caching connection warning; falling back to direct DB.');
      });

      this.client.connect().catch((err) => {
        logger.warn({ err: err.message }, 'Failed initial Redis connection; caching disabled.');
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Could not initialize Redis client.');
    }
  }

  public isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (e) {
      return null;
    }
  }

  public async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (e) {
      // non-blocking
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (e) {
      // non-blocking
    }
  }

  public async delPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (e) {
      // non-blocking
    }
  }
}

export const redisService = new RedisCacheService();
