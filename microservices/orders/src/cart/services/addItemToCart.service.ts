import { NewCart } from "@db/schema/cart";
import { InternalServerErrorResponse, NotFoundResponse } from "@src/commons/patterns";
import { addItemToCart } from "../dao/addItemToCart.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "AddItemToCartService";

export const addItemToCartService = async (
    user: User,
    product_id: string,
    quantity: number,
) => {
    logger.info("Add item to cart attempt initiated", { userId: user?.id, productId: product_id, quantity, component: COMPONENT_NAME });
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server Tenant ID (TENANT_ID) not found for adding item to cart.", { userId: user?.id, productId: product_id, component: COMPONENT_NAME });
            return new InternalServerErrorResponse('Tenant ID not found').generate();
        }

        if (!user.id) {
            logger.warn("User ID not found in user object when attempting to add item to cart.", { productId: product_id, quantity, component: COMPONENT_NAME });
            return new NotFoundResponse('User not found').generate();
        }

        const cartData: NewCart = {
            tenant_id: SERVER_TENANT_ID,
            user_id: user.id,
            product_id: product_id,
            quantity: quantity,
        }

        const item = await addItemToCart(cartData);
        logger.info("Item successfully added to cart in database", { cartId: item.id, userId: user.id, productId: product_id, quantity: item.quantity, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

        return {
            data: {
                ...item,
            },
            status: 201,
        }
    } catch (err: any) {
        logger.error("Unexpected error in addItemToCartService", {
            userId: user?.id,
            productId: product_id,
            quantity,
            errorMessage: err.message,
            errorName: err.name,
            stack: err.stack,
            component: COMPONENT_NAME
        });
        return new InternalServerErrorResponse(err).generate();
    }
}