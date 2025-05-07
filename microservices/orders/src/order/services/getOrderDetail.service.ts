import { InternalServerErrorResponse, NotFoundResponse, UnauthorizedResponse } from "@src/commons/patterns";
import { getOrderById } from "../dao/getOrderById.dao";
import { getOrderDetail } from "../dao/getOrderDetail.dao";
import { User } from "@type/user";
import { getFromCache, saveToCache, orderCache, DEFAULT_TTL } from "@src/commons/utils/redis";

export const getOrderDetailService = async (
    user: User,
    order_id: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            throw new Error("SERVER_TENANT_ID is not defined");
        }

        if (!user.id) {
            return new InternalServerErrorResponse("User ID is not defined").generate();
        }

        if (!order_id) {
            return new InternalServerErrorResponse("Order ID is not defined").generate();
        }
        
        // Try to get from cache first
        const cacheKey = orderCache.detailKey(order_id);
        const cachedData = await getFromCache<any>(cacheKey);
        
        if (cachedData) {
            // Verify the cached order belongs to this user for security
            if (cachedData.order && cachedData.order.user_id === user.id) {
                return {
                    status: 200,
                    data: cachedData
                };
            }
        }

        const orderDetail = await getOrderDetail(SERVER_TENANT_ID, order_id);
        if (!orderDetail) {
            return new NotFoundResponse("Order detail not found").generate();
        }

        const order = await getOrderById(SERVER_TENANT_ID, user.id, orderDetail?.order_id);
        if (!order) {
            return new NotFoundResponse("Order not found").generate();
        }
        
        if (order.user_id !== user.id) {
            return new UnauthorizedResponse("User is not authorized").generate();
        }
        
        const responseData = {
            order,
            orderDetail
        };
        
        // Save to cache
        await saveToCache(cacheKey, responseData, DEFAULT_TTL.ORDER_DETAIL);

        return {
            data: responseData,
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}