import Redis from 'ioredis';
import { MemoryCache, globalMemoryCache } from './memoryCache';
import config from '../config';

/**
 * Cache abstraction layer
 * Attempts to use Redis, falls back to in-memory cache
 * TODO: Add cache invalidation strategies
 * TODO: Add cache warming on startup
 */

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

class RedisCache implements ICache {
  private redis: Redis;
  private hasLoggedError = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times: number): number | null {
        // Only retry 3 times, then give up
        if (times > 3) return null;
        return Math.min(times * 1000, 5000);
      },
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      if (!this.hasLoggedError) {
        console.warn('[Redis] Connection error (suppressing further):', err.message);
        this.hasLoggedError = true;
      }
    });

    this.redis.on('connect', () => {
      this.hasLoggedError = false;
      console.log('[Redis] Connected');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('[Cache] Set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('[Cache] Delete error:', error);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      console.error('[Cache] Has error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('[Cache] Clear error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

class FallbackCache implements ICache {
  constructor(private memCache: MemoryCache) {}

  async get<T>(key: string): Promise<T | null> {
    return this.memCache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.memCache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return this.memCache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.memCache.has(key);
  }

  async clear(): Promise<void> {
    this.memCache.clear();
  }
}

let cacheInstance: ICache;

/**
 * Initialize cache
 * Attempts Redis connection, falls back to in-memory
 */
export async function initializeCache(): Promise<ICache> {
  try {
    const redisCache = new RedisCache(config.redisUrl);
    // Test connection with a short timeout
    await Promise.race([
      redisCache['redis'].ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    console.log('[Cache] Using Redis cache');
    cacheInstance = redisCache;
  } catch {
    console.warn('[Cache] Redis unavailable, using in-memory cache');
    cacheInstance = new FallbackCache(globalMemoryCache);
  }

  return cacheInstance;
}

/**
 * Get the cache instance
 */
export function getCache(): ICache {
  if (!cacheInstance) {
    cacheInstance = new FallbackCache(globalMemoryCache);
  }
  return cacheInstance;
}

export default {
  initializeCache,
  getCache,
};
