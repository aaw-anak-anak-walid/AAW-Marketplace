import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { NewPayment } from "@db/schema/payment";
import { payOrder } from "../dao/payOrder.dao";
import { getOrderById } from "../dao/getOrderById.dao";
import { orderCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "PayOrderService";

export const payOrderService = async (
  orderId: string,
  payment_method: string,
  payment_reference: string,
  amount: number
) => {
  logger.info("Pay order attempt initiated", { orderId, payment_method, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) not found for paying order.", { orderId, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server tenant id not found"
      ).generate();
    }

    const order = await getOrderById(SERVER_TENANT_ID, null, orderId);
    if (!order) {
      logger.warn("Order not found for payment", { orderId, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return new NotFoundResponse("Order not found").generate();
    }

    const paymentData: NewPayment = {
      tenant_id: SERVER_TENANT_ID,
      order_id: orderId,
      payment_method,
      payment_reference,
      amount,
    };

    const result =  await payOrder(paymentData);

    if (!result) {
      logger.error("Payment failed, no result returned", { orderId, component: COMPONENT_NAME });
      return new InternalServerErrorResponse("Payment failed").generate();
    }

    const payment = result.payment;

    logger.info("Invalidating order detail cache", { orderId, component: COMPONENT_NAME });
    await orderCache.invalidateOrderDetail(orderId);

    if (order.user_id) {
      logger.info("Invalidating user's order list cache", { userId: order.user_id, orderId, component: COMPONENT_NAME });
      await orderCache.invalidateOrderList(order.user_id);
    } else {
      logger.warn("User ID not found on order, skipping order list cache invalidation for user.", { orderId, component: COMPONENT_NAME });
    }

    logger.info("Order payment processed successfully", { orderId, paymentId: payment.id, component: COMPONENT_NAME });
    return {
      data: payment,
      status: 200,
    };
  } catch (err: any) {
    if (err.message === "Rollback") {
      logger.warn("Payment rollback due to amount mismatch", { orderId, payment_method, amount, errorMessage: err.message, component: COMPONENT_NAME });
      return new BadRequestResponse(
        "Payment amount does not match order total amount"
      ).generate();
    }

    logger.error("Unexpected error during pay order process", {
      orderId,
      payment_method,
      amount,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};