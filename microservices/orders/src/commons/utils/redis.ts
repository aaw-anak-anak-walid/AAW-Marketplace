import { getRedisClient } from "@src/db/redis";

// Cache TTL defaults in seconds
export const DEFAULT_TTL = {
  ORDERS: 300, // 5 minutes
  ORDER_DETAIL: 600, // 10 minutes
  CART: 120, // 2 minutes (short TTL as cart changes frequently)
};

/**
 * Generic cache retrieval function
 * @param key The cache key
 * @returns The cached data or null if not found
 */
export const getFromCache = async <T>(key: string): Promise<T | null> => {
  const redisClient = getRedisClient();
  if (!redisClient?.isReady) {
    return null;
  }

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedData) as T;
    }
    console.log(`Cache miss for ${key}`);
    return null;
  } catch (error) {
    console.error(`Error retrieving from cache (${key}):`, error);
    return null;
  }
};

/**
 * Generic cache storage function
 * @param key The cache key
 * @param data The data to store
 * @param ttl Time to live in seconds
 */
export const saveToCache = async <T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL.ORDERS
): Promise<void> => {
  const redisClient = getRedisClient();
  if (!redisClient?.isReady) {
    return;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    console.log(`Cache set for ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Error saving to cache (${key}):`, error);
  }
};

/**
 * Invalidate cache by pattern
 * @param pattern Key pattern to match for deletion (e.g. 'orders:*')
 */
export const invalidateCacheByPattern = async (
  pattern: string
): Promise<void> => {
  const redisClient = getRedisClient();
  if (!redisClient?.isReady) {
    return;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(
        `Invalidated ${keys.length} cache entries matching pattern ${pattern}`
      );
    }
  } catch (error) {
    console.error(`Error invalidating cache (${pattern}):`, error);
  }
};

/**
 * Order specific cache utilities
 */
export const orderCache = {
  // Key generators
  listKey: (userId: string, page: number, limit: number) =>
    `orders:user:${userId}:list:page:${page}:limit:${limit}`,

  detailKey: (orderId: string) => `orders:detail:${orderId}`,

  // Invalidation functions
  invalidateOrderList: async (userId: string) =>
    invalidateCacheByPattern(`orders:user:${userId}:list:*`),

  invalidateOrderDetail: async (orderId: string) =>
    invalidateCacheByPattern(`orders:detail:${orderId}`),

  invalidateAllUserOrders: async (userId: string) => {
    await invalidateCacheByPattern(`orders:user:${userId}:*`);
  },
};

/**
 * Cart specific cache utilities
 */
export const cartCache = {
  // Key generators
  listKey: (userId: string) => `cart:user:${userId}:items`,

  // Invalidation functions
  invalidateCart: async (userId: string) =>
    invalidateCacheByPattern(`cart:user:${userId}:*`),
};
