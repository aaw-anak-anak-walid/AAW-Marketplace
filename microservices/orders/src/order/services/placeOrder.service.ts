import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import axios from "@src/utils/axios";
import type { AxiosResponse } from "axios";
import { withRetry } from "@src/utils/retry";
import { Product } from "@type/product";
import { User } from "@type/user";

import logger from "@src/config/logger";
import { getAllCartItemsService } from "../../cart/services/getAllCartItems.service";
import { createOrder } from "../dao/createOrder.dao";
import { orderCache, cartCache } from "@src/commons/utils/redis";

const COMPONENT_NAME = "PlaceOrderService";

export const placeOrderService = async (
  user: User,
  shipping_provider: string
) => {
  logger.info("Place order attempt initiated", { userId: user.id, shipping_provider, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) not found for placing order.", { userId: user.id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server tenant id not found"
      ).generate();
    }
    logger.info("Tenant ID successfully retrieved for order placement", { tenantId: SERVER_TENANT_ID, userId: user.id, component: COMPONENT_NAME });

    if (
      !["JNE", "TIKI", "SICEPAT", "GOSEND", "GRAB_EXPRESS"].includes(
        shipping_provider
      )
    ) {
      logger.warn("Shipping provider not found", { userId: user.id, shipping_provider, component: COMPONENT_NAME });
      return new NotFoundResponse("Shipping provider not found").generate();
    }

    if (!user.id) {
      logger.error("User ID not found in user object for placing order.", { component: COMPONENT_NAME });
      return new InternalServerErrorResponse("User id not found").generate();
    }
    const userId = user.id;
    logger.info("User ID validated for order placement", { userId, component: COMPONENT_NAME });

    logger.info("Fetching cart items for user", { userId, component: COMPONENT_NAME });
    const cartResponse = await withRetry(() =>
      getAllCartItemsService(user, 1, 1_000_000)
    );
    if (cartResponse.status !== 200) {
      logger.warn("Failed to fetch cart items, received non-200 status from getAllCartItemsService", { userId, cartStatus: cartResponse.status, component: COMPONENT_NAME });
      return cartResponse;
    }
    logger.info("Successfully fetched cart items", { userId, itemCount: (cartResponse.data as any).cartItems?.length, component: COMPONENT_NAME });

    const data = cartResponse.data;
    if (!("cartItems" in data)) {
      logger.error("Cart items not found in response data despite 200 status from cart service", { userId, component: COMPONENT_NAME });
      return new BadRequestResponse("Unable to load cart items").generate();
    }
    const cartItems = data.cartItems;

    if (cartItems.length === 0) {
      logger.info("Cart is empty, cannot place order", { userId, component: COMPONENT_NAME });
      return new BadRequestResponse("Cart is empty").generate();
    }
    logger.info(`Cart contains ${cartItems.length} items. Proceeding to fetch product details.`, { userId, itemCount: cartItems.length, component: COMPONENT_NAME });

    const productIds = cartItems.map((item) => item.product_id);
    logger.info("Fetching product details from product microservice", { userId, productIdsCount: productIds.length, component: COMPONENT_NAME });
    const products: AxiosResponse<Product[]> = await axios.post(
      `${process.env.PRODUCT_MS_URL}/product/many`,
      { productIds }
    );
    if (products.status !== 200) {
      logger.error("Failed to get products from product microservice", { userId, productMSStatus: products.status, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Failed to get products"
      ).generate();
    }
    logger.info("Successfully fetched product details", { userId, productCount: products.data.length, component: COMPONENT_NAME });


    logger.info("Creating order in database", { userId, shipping_provider, component: COMPONENT_NAME });
    const { order } = await withRetry(() =>
      createOrder(
        SERVER_TENANT_ID,
        userId,
        cartItems,
        products.data,
        shipping_provider as
        | "JNE"
        | "TIKI"
        | "SICEPAT"
        | "GOSEND"
        | "GRAB_EXPRESS"
      )
    );
    logger.info("Order successfully created in database", { userId, orderId: order.id, component: COMPONENT_NAME });

    logger.info("Invalidating user's order list cache", { userId, component: COMPONENT_NAME });
    await orderCache.invalidateOrderList(user.id);
    logger.info("User's order list cache invalidated", { userId, component: COMPONENT_NAME });

    logger.info("Invalidating user's cart cache", { userId, component: COMPONENT_NAME });
    await cartCache.invalidateCart(user.id);
    logger.info("User's cart cache invalidated", { userId, component: COMPONENT_NAME });

    logger.info("Order placed successfully", { userId, orderId: order.id, component: COMPONENT_NAME });
    return {
      status: 201,
      data: order,
    };
  } catch (err: any) {
    logger.error("Unexpected error during place order process", {
      userId: user.id,
      shipping_provider,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};