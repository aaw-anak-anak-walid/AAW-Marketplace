import { InternalServerErrorResponse, NotFoundResponse } from "@src/commons/patterns";
import { deleteCartItemByProductId } from "../dao/deleteCartItemByProductId.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "DeleteCartItemService";

export const deleteCartItemService = async (
    user: User,
    product_id: string,
) => {
    logger.info("Delete cart item attempt initiated", { userId: user?.id, productId: product_id, component: COMPONENT_NAME });
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server Tenant ID (TENANT_ID) not found for deleting cart item.", { userId: user?.id, productId: product_id, component: COMPONENT_NAME });
            return new InternalServerErrorResponse('Tenant ID not found').generate();
        }

        if (!user.id) {
            logger.warn("User ID not found in user object when attempting to delete cart item.", { productId: product_id, component: COMPONENT_NAME });
            return new NotFoundResponse('User not found').generate();
        }

        const cart = await deleteCartItemByProductId(SERVER_TENANT_ID, user.id, product_id);
        logger.info("Cart item(s) successfully deleted from database by product ID", { userId: user.id, productId: product_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

        return {
            data: cart,
            status: 200,
        }
    } catch (err: any) {
        logger.error("Unexpected error in deleteCartItemService", {
            userId: user?.id,
            productId: product_id,
            errorMessage: err.message,
            errorName: err.name,
            stack: err.stack,
            component: COMPONENT_NAME
        });
        return new InternalServerErrorResponse(err).generate();
    }
}