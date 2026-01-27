/**
 * Redis Client Service
 */

import Redis from 'ioredis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export async function initializeRedis(): Promise<Redis> {
  if (redisClient) return redisClient;

  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  await redisClient.connect();
  return redisClient;
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> {
  const redis = getRedis();
  const serialized = JSON.stringify(value);

  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const value = await redis.get(key);

  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function publishEvent(channel: string, data: any): Promise<void> {
  const redis = getRedis();
  await redis.publish(channel, JSON.stringify(data));
}
