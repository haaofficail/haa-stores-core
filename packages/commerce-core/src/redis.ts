import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const isManagedEnv = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (!REDIS_URL) {
    if (isManagedEnv) {
      throw new Error('REDIS_URL is required in staging/production.');
    }
    return null;
  }
  if (!redisInstance) {
    try {
      redisInstance = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      redisInstance.on('error', () => {
        // Silently handle Redis errors to prevent log flooding
      });
    } catch {
      return null;
    }
  }
  return redisInstance;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  bumpNamespace(namespace: string): Promise<number>;
  namespaceVersion(namespace: string): Promise<number>;
}

function namespaceKey(namespace: string): string {
  return `ns:${namespace}`;
}

function versionedKey(namespace: string, key: string, version: number): string {
  return `${namespace}:v${version}:${key}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silently fail when redis unavailable
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // silently fail when redis unavailable
  }
}

export async function cacheNamespaceVersion(namespace: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 1;
  try {
    const value = await redis.get(namespaceKey(namespace));
    return value ? Number(value) || 1 : 1;
  } catch {
    return 1;
  }
}

export async function cacheBumpNamespace(namespace: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return Date.now();
  try {
    return await redis.incr(namespaceKey(namespace));
  } catch {
    return Date.now();
  }
}

export async function cacheGetVersioned<T>(namespace: string, key: string): Promise<T | null> {
  const version = await cacheNamespaceVersion(namespace);
  return cacheGet<T>(versionedKey(namespace, key, version));
}

export async function cacheSetVersioned(namespace: string, key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
  const version = await cacheNamespaceVersion(namespace);
  await cacheSet(versionedKey(namespace, key, version), value, ttlSeconds);
}

export const cacheStore: CacheStore = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  bumpNamespace: cacheBumpNamespace,
  namespaceVersion: cacheNamespaceVersion,
};

export async function cacheDelPattern(_pattern: string): Promise<void> {
  if (isManagedEnv) {
    throw new Error('cacheDelPattern is disabled in staging/production. Use cacheBumpNamespace instead.');
  }
}

export async function acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const result = await redis.set(key, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch {
    return false;
  }
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // silently fail when redis unavailable
  }
}

export async function redisPing(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
