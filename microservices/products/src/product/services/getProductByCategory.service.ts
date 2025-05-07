import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getProductByCategory } from "../dao/getProductByCategory.dao";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";

export const getProductByCategoryService = async (
  category_id: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Try to get products by category from cache first
    const cacheKey = productCache.productsByCategoryKey(
      SERVER_TENANT_ID,
      category_id,
      page,
      limit
    );

    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      return {
        status: 200,
        data: cachedData,
      };
    }

    // If not in cache, get from database
    const products = await getProductByCategory(SERVER_TENANT_ID, category_id);

    // Prepare response data
    const responseData = {
      products,
      category_id,
      count: products.length,
    };

    // Cache the response
    await saveToCache(cacheKey, responseData, DEFAULT_TTL.PRODUCTS);

    return {
      data: responseData,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
