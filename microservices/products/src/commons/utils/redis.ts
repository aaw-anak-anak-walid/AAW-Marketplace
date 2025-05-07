import { getRedisClient } from "@src/db/redis";

// Cache TTL defaults in seconds
export const DEFAULT_TTL = {
  PRODUCTS: 300, // 5 minutes
  CATEGORIES: 600, // 10 minutes
  PRODUCT_DETAILS: 300, // 5 minutes
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
  ttl: number = DEFAULT_TTL.PRODUCTS
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
 * @param pattern Key pattern to match for deletion (e.g. 'products:*')
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
 * Product specific cache keys and invalidation functions
 */
export const productCache = {
  // Key generators
  listKey: (tenantId: string, page: number, limit: number) =>
    `products:tenant:${tenantId}:list:page:${page}:limit:${limit}`,

  detailKey: (tenantId: string, productId: string) =>
    `products:tenant:${tenantId}:detail:${productId}`,

  categoryListKey: (tenantId: string, page: number, limit: number) =>
    `products:tenant:${tenantId}:categories:page:${page}:limit:${limit}`,

  productsByCategoryKey: (
    tenantId: string,
    categoryId: string,
    page: number,
    limit: number
  ) =>
    `products:tenant:${tenantId}:category:${categoryId}:page:${page}:limit:${limit}`,

  // Invalidation functions
  invalidateProductLists: async (tenantId: string) =>
    invalidateCacheByPattern(`products:tenant:${tenantId}:list:*`),

  invalidateProductDetail: async (tenantId: string, productId: string) =>
    invalidateCacheByPattern(`products:tenant:${tenantId}:detail:${productId}`),

  invalidateCategories: async (tenantId: string) =>
    invalidateCacheByPattern(`products:tenant:${tenantId}:categories:*`),

  invalidateProductsByCategory: async (
    tenantId: string,
    categoryId?: string
  ) => {
    const pattern = categoryId
      ? `products:tenant:${tenantId}:category:${categoryId}:*`
      : `products:tenant:${tenantId}:category:*`;
    return invalidateCacheByPattern(pattern);
  },

  // Common invalidation combinations
  invalidateAll: async (tenantId: string) => {
    await invalidateCacheByPattern(`products:tenant:${tenantId}:*`);
  },

  invalidateForProductChange: async (
    tenantId: string,
    productId: string,
    categoryId?: string
  ) => {
    await productCache.invalidateProductLists(tenantId);
    await productCache.invalidateProductDetail(tenantId, productId);
    if (categoryId) {
      await productCache.invalidateProductsByCategory(tenantId, categoryId);
    }
  },

  invalidateForCategoryChange: async (tenantId: string, categoryId: string) => {
    await productCache.invalidateCategories(tenantId);
    await productCache.invalidateProductsByCategory(tenantId, categoryId);
  },
};
