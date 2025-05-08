import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getManyProductDatasById } from "../dao/getManyProductDatasById.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";

export const getManyProductDatasByIdService = async (productIds: string[]) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Sort IDs for consistent cache key generation
    const sortedIds = [...productIds].sort();
    const cacheKey = `products:tenant:${SERVER_TENANT_ID}:many:${sortedIds.join(
      "-"
    )}`;

    // Try to get from cache first
    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      return {
        status: 200,
        data: cachedData,
      };
    }

    // If not in cache, get from database
    const products = await withRetry(() =>
      getManyProductDatasById(SERVER_TENANT_ID, productIds)
    );

    // Save to cache
    await saveToCache(cacheKey, products, DEFAULT_TTL.PRODUCTS);

    return {
      data: products,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
