import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editCartDataById } from "../dao/editCartDataById.dao";
import { deleteCartItem } from "../dao/deleteCartItem.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "EditCartItemService";

export const editCartItemService = async (
    user: User,
    cart_id: string,
    quantity?: number
) => {
    logger.info("Edit cart item attempt initiated", { userId: user?.id, cartId: cart_id, newQuantity: quantity, component: COMPONENT_NAME });
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server Tenant ID (TENANT_ID) not found for editing cart item.", { userId: user?.id, cartId: cart_id, component: COMPONENT_NAME });
            return new InternalServerErrorResponse('Tenant ID not found').generate();
        }

        if (!user.id) {
            logger.error("User ID not found in user object when attempting to edit cart item.", { cartId: cart_id, newQuantity: quantity, component: COMPONENT_NAME });
            return new InternalServerErrorResponse('User ID not found').generate();
        }

        let cart;
        if (quantity !== undefined && quantity < 1) {
            cart = await deleteCartItem(SERVER_TENANT_ID, user.id, cart_id);
            if (cart) {
                logger.info("Cart item deleted from database due to quantity < 1", { cartId: cart_id, userId: user.id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
                cart.quantity = 0;
            } else {
                logger.warn("Attempted to delete cart item due to quantity < 1, but item not found or not deleted", { cartId: cart_id, userId: user.id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
            }
        } else {
            cart = await editCartDataById(SERVER_TENANT_ID, cart_id, {
                quantity,
            });
            if (cart) {
                logger.info("Cart item quantity successfully updated in database", { cartId: cart.id, newQuantity: cart.quantity, userId: user.id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
            } else {
                logger.warn("Attempted to update cart item quantity, but item not found or not updated", { cartId: cart_id, newQuantity: quantity, userId: user.id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
            }
        }

        return {
            data: cart,
            status: 200,
        }
    } catch (err: any) {
        logger.error("Unexpected error in editCartItemService", {
            userId: user?.id,
            cartId: cart_id,
            newQuantity: quantity,
            errorMessage: err.message,
            errorName: err.name,
            stack: err.stack,
            component: COMPONENT_NAME
        });
        return new InternalServerErrorResponse(err).generate();
    }
}