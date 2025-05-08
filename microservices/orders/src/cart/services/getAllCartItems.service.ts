// src/services/cart.service.ts
import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { getAllCartItems } from "../dao/getAllCartItems.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetAllCartItemsService";

export const getAllCartItemsService = async (
  user: User,
  page: number,
  limit: number
) => {
  logger.info("Get all cart items attempt initiated", { userId: user?.id, page, limit, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for getting all cart items.", { userId: user?.id, page, limit, component: COMPONENT_NAME });
      return new InternalServerErrorResponse("Tenant ID not found").generate();
    }
    if (!user.id) {
      logger.warn("User ID not found in user object when attempting to get all cart items.", { page, limit, component: COMPONENT_NAME });
      return new NotFoundResponse("User not found").generate();
    }

    const offset = (page - 1) * limit;
    const { items: cartItems, total } = await getAllCartItems(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );
    logger.info("Cart items successfully fetched from database", { userId: user.id, fetchedCount: cartItems.length, totalItems: total, page, limit, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      status: 200,
      data: {
        cartItems,
        meta: {
          totalItems: total,
          page,
          perPage: limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (err: any) {
    logger.error("Unexpected error in getAllCartItemsService", {
      userId: user?.id,
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