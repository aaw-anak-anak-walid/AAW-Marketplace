import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { NewPayment } from "@db/schema/payment";
import { payOrder } from "../dao/payOrder.dao";
import { getOrderById } from "../dao/getOrderById.dao";
import { orderCache } from "@src/commons/utils/redis";

export const payOrderService = async (
  orderId: string,
  payment_method: string,
  payment_reference: string,
  amount: number
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server tenant id not found"
      ).generate();
    }

    // First get order details to get the user ID needed for cache invalidation
    // This could be optimized to avoid an extra DB call if the user ID were passed in
    const order = await getOrderById(SERVER_TENANT_ID, null, orderId);
    if (!order) {
      return new NotFoundResponse("Order not found").generate();
    }

    const paymentData: NewPayment = {
      tenant_id: SERVER_TENANT_ID,
      order_id: orderId,
      payment_method,
      payment_reference,
      amount,
    };

    const payment = await payOrder(paymentData);

    // Invalidate both the order detail and order list caches because payment changes order status
    await orderCache.invalidateOrderDetail(orderId);
    if (order.user_id) {
      await orderCache.invalidateOrderList(order.user_id);
    }

    return {
      data: payment,
      status: 200,
    };
  } catch (err: any) {
    if (err.message === "Rollback") {
      return new BadRequestResponse(
        "Payment amount does not match order total amount"
      ).generate();
    }

    return new InternalServerErrorResponse(err).generate();
  }
};
