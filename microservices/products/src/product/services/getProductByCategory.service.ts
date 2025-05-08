import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getProductByCategory } from "../dao/getProductByCategory.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetProductByCategoryService";

export const getProductByCategoryService = async (
  category_id: string,
  page: number = 1,
  limit: number = 10
) => {
  logger.info("Get products by category attempt initiated", { categoryId: category_id, page, limit, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting products by category.", { categoryId: category_id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const cacheKey = productCache.productsByCategoryKey(
      SERVER_TENANT_ID,
      category_id,
      page,
      limit
    );

    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      logger.info("Products by category retrieved from cache", { cacheKey, tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });
      return {
        status: 200,
        data: cachedData,
      };
    }
    logger.info("Products by category not found in cache, fetching from database", { cacheKey, tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });

    const products = await withRetry(() =>
      getProductByCategory(SERVER_TENANT_ID, category_id)
    );
    logger.info("Products by category fetched from database", { categoryId: category_id, count: products.length, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    const responseData = {
      products,
      category_id,
      count: products.length,
    };

    await saveToCache(cacheKey, responseData, DEFAULT_TTL.PRODUCTS);
    logger.info("Products by category saved to cache", { cacheKey, tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });

    return {
      data: responseData,
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getProductByCategoryService", {
      categoryId: category_id,
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