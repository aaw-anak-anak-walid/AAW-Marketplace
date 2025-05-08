import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  productCache,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetAllProductsService";

export const getAllProductsService = async (page: number, limit: number) => {
  logger.info("Get all products attempt initiated", { page, limit, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting all products.", { component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const cacheKey = productCache.listKey(SERVER_TENANT_ID, page, limit);
    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      logger.info("Products retrieved from cache", { cacheKey, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });
      return {
        status: 200,
        data: cachedData,
      };
    }
    logger.info("Products not found in cache, fetching from database", { cacheKey, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });

    const offset = (page - 1) * limit;

    const { items: products, total } = await withRetry(() =>
      getAllProductsByTenantId(SERVER_TENANT_ID, limit, offset)
    );
    logger.info("Products fetched from database", { count: products.length, totalItems: total, tenantId: SERVER_TENANT_ID, page, limit, component: COMPONENT_NAME });

    const responseData = {
      products,
      meta: {
        totalItems: total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await saveToCache(cacheKey, responseData);
    logger.info("Products saved to cache", { cacheKey, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getAllProductsService", {
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