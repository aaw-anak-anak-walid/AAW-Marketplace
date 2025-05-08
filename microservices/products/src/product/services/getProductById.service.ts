import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getProductById } from "../dao/getProductById.dao";
import { withRetry } from "../../utils/withRetry";
import {
  getFromCache,
  saveToCache,
  productCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";

export const getProductByIdService = async (id: string) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Try to get from cache first
    const cacheKey = productCache.detailKey(SERVER_TENANT_ID, id);
    const cachedProduct = await getFromCache<any>(cacheKey);

    if (cachedProduct) {
      return {
        data: cachedProduct,
        status: 200,
      };
    }

    const product = await withRetry(() => getProductById(SERVER_TENANT_ID, id));

    if (product) {
      await saveToCache(cacheKey, product, DEFAULT_TTL.PRODUCT_DETAILS);
    }

    return {
      data: product ? { ...product } : null,
      status: product ? 200 : 404,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
