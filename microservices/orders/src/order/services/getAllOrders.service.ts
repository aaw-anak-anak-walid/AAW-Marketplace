// src/services/order.service.ts
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllOrders } from "../dao/getAllOrders.dao";
import { User } from "@type/user";
import {
  getFromCache,
  saveToCache,
  orderCache,
  DEFAULT_TTL,
} from "@src/commons/utils/redis";

export const getAllOrdersService = async (
  user: User,
  page: number,
  limit: number
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      throw new Error("SERVER_TENANT_ID is not defined");
    }

    if (!user.id) {
      return new InternalServerErrorResponse(
        "User ID is not defined"
      ).generate();
    }

    // Try to get from cache first
    const cacheKey = orderCache.listKey(user.id, page, limit);
    const cachedData = await getFromCache<any>(cacheKey);

    if (cachedData) {
      return {
        status: 200,
        data: cachedData,
      };
    }

    const offset = (page - 1) * limit;

    // DAO now returns { items, total }
    const { items: orders, total } = await getAllOrders(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );

    const responseData = {
      orders,
      meta: {
        totalItems: total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Save to cache
    await saveToCache(cacheKey, responseData, DEFAULT_TTL.ORDERS);

    return {
      status: 200,
      data: responseData,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
