import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetAllCategoriesService";

export const getAllCategoriesService = async (page: number, limit: number) => {
  logger.info("Get all categories attempt initiated", { page, limit, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting all categories.", { component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const cacheKey = productCache.categoryListKey(
      SERVER_TENANT_ID,
      page,
      limit
    );
    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      logger.info("Categories retrieved from cache", { cacheKey, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });
      return {
        status: 200,
        data: cachedData,
      };
    }
    logger.info("Categories not found in cache, fetching from database", { cacheKey, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });

    const offset = (page - 1) * limit;

    const { items: categories, total } = await withRetry(() =>
      getAllCategoriesByTenantId(SERVER_TENANT_ID, limit, offset)
    );
    logger.info("Categories fetched from database", { count: categories.length, totalItems: total, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });

    const responseData = {
      categories,
      meta: {
        totalItems: total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await saveToCache(cacheKey, responseData, DEFAULT_TTL.CATEGORIES);
    logger.info("Categories saved to cache", { cacheKey, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getAllCategoriesService", {
      page,
      limit,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};