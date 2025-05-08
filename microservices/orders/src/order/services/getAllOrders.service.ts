import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllOrders } from "../dao/getAllOrders.dao";
import { User } from "@type/user";
import {
  getFromCache,
  saveToCache,
  orderCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetAllOrdersService";

export const getAllOrdersService = async (
  user: User,
  page: number,
  limit: number
) => {
  logger.info("Get all orders attempt initiated", { userId: user.id, page, limit, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) is not defined.", { userId: user.id, component: COMPONENT_NAME });
      throw new Error("SERVER_TENANT_ID is not defined");
    }

    if (!user.id) {
      logger.warn("User ID not provided for getAllOrdersService.", { component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "User ID is not defined"
      ).generate();
    }

    const cacheKey = orderCache.listKey(user.id, page, limit);
    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      logger.info("Successfully retrieved all orders from cache", { userId: user.id, page, limit, cacheKey, component: COMPONENT_NAME });
      return {
        status: 200,
        data: cachedData,
      };
    }
    logger.info("All orders not found in cache, fetching from database", { userId: user.id, page, limit, cacheKey, component: COMPONENT_NAME });

    const offset = (page - 1) * limit;

    const { items: orders, total } = await getAllOrders(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );
    logger.info("Successfully fetched all orders from database", { userId: user.id, page, limit, fetchedCount: orders.length, totalItems: total, component: COMPONENT_NAME });

    const responseData = {
      orders,
      meta: {
        totalItems: total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await saveToCache(cacheKey, responseData, DEFAULT_TTL.ORDERS);
    logger.info("Successfully saved all orders to cache", { userId: user.id, page, limit, cacheKey, component: COMPONENT_NAME });

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    logger.error("Unexpected error in getAllOrdersService", {
      userId: user.id,
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