import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { getOrderById } from "../dao/getOrderById.dao";
import { cancelOrder } from "../dao/cancelOrder.dao";
import { User } from "@type/user";
import { orderCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "CancelOrderService";

export const cancelOrderService = async (user: User, order_id: string) => {
  logger.info("Cancel order attempt initiated", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) not found for cancelling order.", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server tenant id not found"
      ).generate();
    }

    if (!user.id) {
      logger.warn("User ID not provided for cancelOrderService.", { orderId: order_id, component: COMPONENT_NAME });
      return new NotFoundResponse("User id not found").generate();
    }

    const order = await getOrderById(SERVER_TENANT_ID, user.id, order_id);
    if (!order) {
      logger.warn("Order not found for cancellation", { userId: user.id, orderId: order_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return new NotFoundResponse("Order not found").generate();
    }

    if (order.user_id !== user.id) {
      logger.warn("User not authorized to cancel this order", { userId: user.id, orderOwnerId: order.user_id, orderId: order_id, component: COMPONENT_NAME });
      return new UnauthorizedResponse(
        "User not authorized to cancel this order"
      ).generate();
    }

    if (["CANCELLED", "REFUNDED"].includes(order.order_status)) {
      logger.warn("Order already in a final state, cannot cancel", { userId: user.id, orderId: order_id, currentStatus: order.order_status, component: COMPONENT_NAME });
      return new UnauthorizedResponse("Order already cancelled").generate();
    }

    await cancelOrder(SERVER_TENANT_ID, user.id, order_id);
    order.order_status = "CANCELLED";

    await orderCache.invalidateOrderDetail(order_id);
    logger.info("Order detail cache invalidated", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
    await orderCache.invalidateOrderList(user.id);
    logger.info("User's order list cache invalidated", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });

    logger.info("Order cancelled successfully and caches invalidated", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
    return {
      data: order,
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in cancelOrderService", {
      userId: user.id,
      orderId: order_id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};