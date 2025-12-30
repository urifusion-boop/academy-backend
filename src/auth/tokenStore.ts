import Redis from 'ioredis';
import { env } from '../config/env';

const isTest = process.env.NODE_ENV === 'test';
const revokedInMemory = new Set<string>();

const redis = isTest
  ? null
  : new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null, // Disable auto-reconnect to prevent loops
    });

// Silence global error events to prevent "Unhandled error event" logs
if (redis) {
  redis.on('error', () => {
    // Ignore Redis errors; we fall back to memory
  });
}

export async function revokeRefreshJti(jti: string, ttlSeconds: number) {
  if (redis) {
    try {
      if (redis.status === 'wait' || redis.status === 'close') {
        await redis.connect();
      }
      await redis.set(`revoked:${jti}`, '1', 'EX', ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }
  revokedInMemory.add(jti);
}

export async function isRevoked(jti: string) {
  if (redis) {
    try {
      if (redis.status === 'wait' || redis.status === 'close') {
        await redis.connect();
      }
      const res = await redis.get(`revoked:${jti}`);
      return res === '1';
    } catch {
      // fall through to memory
    }
  }
  return revokedInMemory.has(jti);
}
