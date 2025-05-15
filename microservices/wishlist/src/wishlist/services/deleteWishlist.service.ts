import { InternalServerErrorResponse } from "@src/commons/patterns";
import { deleteWishlistById } from "../dao/deleteWishlistById.dao";
import logger from "@src/config/logger";

const COMPONENT_NAME = "DeleteWishlistService";

export const deleteWishlistService = async(
    id: string,
) => {
    try {
        logger.info("Starting process to delete wishlist", {
            component: COMPONENT_NAME,
            wishlistId: id,
        });

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID is missing", {
                component: COMPONENT_NAME,
            });
            return new InternalServerErrorResponse('Server tenant ID is missing').generate();
        }

        const wishlist = await deleteWishlistById(SERVER_TENANT_ID, id);
        if (!wishlist) {
            logger.warn("Wishlist not found", {
                component: COMPONENT_NAME,
                wishlistId: id,
                tenantId: SERVER_TENANT_ID,
            });
            return new InternalServerErrorResponse('Wishlist not found').generate();
        }

        logger.info("Wishlist deleted successfully", {
            component: COMPONENT_NAME,
            wishlistId: id,
        });

        return {
            data: wishlist,
            status: 200,
        };
    } catch (err: any) {
        logger.error("An error occurred while deleting wishlist", {
            component: COMPONENT_NAME,
            wishlistId: id,
            error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return new InternalServerErrorResponse(err).generate();
    }
}