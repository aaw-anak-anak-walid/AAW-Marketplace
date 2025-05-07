// src/services/category.service.ts
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";

export const getAllCategoriesService = async (page: number, limit: number) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Try to get categories from cache first
    const cacheKey = productCache.categoryListKey(
      SERVER_TENANT_ID,
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
    const offset = (page - 1) * limit;
    const { items: categories, total } = await getAllCategoriesByTenantId(
      SERVER_TENANT_ID,
      limit,
      offset
    );

    // Prepare the response data
    const responseData = {
      categories,
      meta: {
        totalItems: total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response with category-specific TTL
    // Categories change less frequently, so we use a longer TTL
    await saveToCache(cacheKey, responseData, DEFAULT_TTL.CATEGORIES);

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
