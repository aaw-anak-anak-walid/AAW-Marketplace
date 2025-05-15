import { InternalServerErrorResponse } from "@src/commons/patterns";
import { updateWishlistById } from "../dao/updateWishlistById.dao";
import logger from "@src/config/logger";

const COMPONENT_NAME = "UpdateWishlistService";

export const updateWishlistService = async (
    id: string,
    name?: string,
) => {
    try {
        logger.info("Starting process to update wishlist", {
            component: COMPONENT_NAME,
            wishlistId: id,
            updateData: { name },
        });

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID is missing", {
                component: COMPONENT_NAME,
            });
            return new InternalServerErrorResponse('Server tenant ID is missing').generate();
        }

        const wishlist = await updateWishlistById(SERVER_TENANT_ID, id, {
            name
        });

        logger.info("Wishlist updated successfully", {
            component: COMPONENT_NAME,
            wishlistId: id,
            updatedData: wishlist,
        });

        return {
            data: wishlist,
            status: 200,
        };
    } catch (err: any) {
        logger.error("An error occurred while updating wishlist", {
            component: COMPONENT_NAME,
            wishlistId: id,
            updateData: { name },
            error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return new InternalServerErrorResponse(err).generate();
    }
}