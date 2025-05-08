import { InternalServerErrorResponse, NotFoundResponse, UnauthorizedResponse } from "@src/commons/patterns";
import { getOrderById } from "../dao/getOrderById.dao";
import { getOrderDetail } from "../dao/getOrderDetail.dao";
import { User } from "@type/user";
import { getFromCache, saveToCache, orderCache, DEFAULT_TTL } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetOrderDetailService";

export const getOrderDetailService = async (
    user: User,
    order_id: string,
) => {
    logger.info("Get order detail attempt initiated", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID (TENANT_ID) is not defined.", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
            throw new Error("SERVER_TENANT_ID is not defined");
        }

        if (!user.id) {
            logger.warn("User ID not provided for getOrderDetailService.", { orderId: order_id, component: COMPONENT_NAME });
            return new InternalServerErrorResponse("User ID is not defined").generate();
        }

        if (!order_id) {
            logger.warn("Order ID not provided for getOrderDetailService.", { userId: user.id, component: COMPONENT_NAME });
            return new InternalServerErrorResponse("Order ID is not defined").generate();
        }

        const cacheKey = orderCache.detailKey(order_id);
        const cachedData = await getFromCache<any>(cacheKey);

        if (cachedData) {
            if (cachedData.order && cachedData.order.user_id === user.id) {
                logger.info("Order detail successfully retrieved from cache", { userId: user.id, orderId: order_id, cacheKey, component: COMPONENT_NAME });
                return {
                    status: 200,
                    data: cachedData
                };
            } else {
                logger.warn("Cached order detail user ID mismatch or malformed data. Fetching from DB.", { userId: user.id, orderId: order_id, cachedUserId: cachedData.order?.user_id, component: COMPONENT_NAME });
            }
        } else {
            logger.info("Order detail not found in cache, fetching from database", { userId: user.id, orderId: order_id, cacheKey, component: COMPONENT_NAME });
        }

        const orderDetailItems = await getOrderDetail(SERVER_TENANT_ID, order_id);
        if (!orderDetailItems) {
            logger.warn("Order detail items not found in database", { userId: user.id, orderId: order_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
            return new NotFoundResponse("Order detail not found").generate();
        }

        const orderHeader = await getOrderById(SERVER_TENANT_ID, user.id, orderDetailItems?.order_id);
        if (!orderHeader) {
            logger.warn("Order header not found in database for the given order detail", { userId: user.id, orderId: order_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
            return new NotFoundResponse("Order not found").generate();
        }

        if (orderHeader.user_id !== user.id) {
            logger.warn("User not authorized to view this order", { userId: user.id, orderOwnerId: orderHeader.user_id, orderId: orderHeader.id, component: COMPONENT_NAME });
            return new UnauthorizedResponse("User is not authorized").generate();
        }

        logger.info("Successfully fetched order details from database", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });

        const responseData = {
            order: orderHeader,
            orderDetail: orderDetailItems
        };

        await saveToCache(cacheKey, responseData, DEFAULT_TTL.ORDER_DETAIL);
        logger.info("Order detail successfully saved to cache", { userId: user.id, orderId: order_id, cacheKey, component: COMPONENT_NAME });

        logger.info("Order detail successfully retrieved and processed", { userId: user.id, orderId: order_id, component: COMPONENT_NAME });
        return {
            data: responseData,
            status: 200,
        }
    } catch (err: any) {
        logger.error("Unexpected error in getOrderDetailService", {
            userId: user.id,
            orderId: order_id,
            errorMessage: err.message,
            errorName: err.name,
            stack: err.stack,
            component: COMPONENT_NAME
        });
        return new InternalServerErrorResponse(err).generate();
    }
}