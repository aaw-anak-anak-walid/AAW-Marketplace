import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";
import { getFromCache, saveToCache, productCache } from "@src/commons/utils/redis";

export const getAllProductsService = async (page: number, limit: number) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const cacheKey = productCache.listKey(SERVER_TENANT_ID, page, limit);
    const cachedData = await getFromCache<any>(cacheKey);
    
    if (cachedData) {
      return {
        status: 200,
        data: cachedData
      };
    }

    const offset = (page - 1) * limit;
    const { items: products, total } = await getAllProductsByTenantId(
      SERVER_TENANT_ID,
      limit,
      offset
    );

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

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
