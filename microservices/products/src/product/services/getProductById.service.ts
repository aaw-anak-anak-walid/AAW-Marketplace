import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getProductById } from "../dao/getProductById.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetProductByIdService";

export const getProductByIdService = async (id: string) => {
  logger.info("Get product by ID attempt initiated", { productId: id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting product by ID.", { productId: id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const cacheKey = productCache.detailKey(SERVER_TENANT_ID, id);
    const cachedProduct = await getFromCache<any>(cacheKey);

    if (cachedProduct) {
      logger.info("Product retrieved from cache", { cacheKey, tenantId: SERVER_TENANT_ID, productId: id, component: COMPONENT_NAME });
      return {
        data: cachedProduct,
        status: 200,
      };
    }
    logger.info("Product not found in cache, fetching from database", { cacheKey, tenantId: SERVER_TENANT_ID, productId: id, component: COMPONENT_NAME });

    const product = await withRetry(() => getProductById(SERVER_TENANT_ID, id));

    if (product) {
      await saveToCache(cacheKey, product, DEFAULT_TTL.PRODUCT_DETAILS);
      logger.info("Product fetched from database and saved to cache", { productId: id, tenantId: SERVER_TENANT_ID, cacheKey, component: COMPONENT_NAME });
    } else {
      logger.warn("Product not found in database", { productId: id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
    }

    return {
      data: product ? { ...product } : null,
      status: product ? 200 : 404,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getProductByIdService", {
      productId: id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};