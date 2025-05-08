import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getManyProductDatasById } from "../dao/getManyProductDatasById.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetManyProductDatasByIdService";

export const getManyProductDatasByIdService = async (productIds: string[]) => {
  logger.info("Get many products by IDs attempt initiated", { productIdsCount: productIds.length, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting many products.", { component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const sortedIds = [...productIds].sort();
    const cacheKey = `products:tenant:${SERVER_TENANT_ID}:many:${sortedIds.join(
      "-"
    )}`;

    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      logger.info("Multiple products retrieved from cache", { cacheKey, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return {
        status: 200,
        data: cachedData,
      };
    }
    logger.info("Multiple products not found in cache, fetching from database", { cacheKey, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    const products = await withRetry(() =>
      getManyProductDatasById(SERVER_TENANT_ID, productIds)
    );
    logger.info("Multiple products fetched from database", { fetchedCount: products.length, requestedCount: productIds.length, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await saveToCache(cacheKey, products, DEFAULT_TTL.PRODUCTS);
    logger.info("Multiple products saved to cache", { cacheKey, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      data: products,
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getManyProductDatasByIdService", {
      productIdsCount: productIds.length,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};