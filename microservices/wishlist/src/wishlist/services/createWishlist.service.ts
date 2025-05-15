import { NewWishlist } from "@db/schema/wishlist";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createWishlist } from "../dao/createWishlist.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "CreateWishlistService";

export const createWishlistService = async (
    user: User,
    name: string,
) => {
    try {
        logger.info("Starting process to create wishlist", {
            component: COMPONENT_NAME,
            userId: user.id,
            wishlistName: name,
        });

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID is missing", {
                component: COMPONENT_NAME,
            });
            return new InternalServerErrorResponse('Server tenant ID is missing').generate();
        }

        if (!user.id) {
            logger.error("User ID is missing", {
                component: COMPONENT_NAME,
            });
            return new InternalServerErrorResponse('User ID is missing').generate();
        }

        const wishlistData: NewWishlist = {
            name,
            user_id: user.id,
            tenant_id: SERVER_TENANT_ID,
        };

        const wishlist = await createWishlist(wishlistData);

        logger.info("Wishlist created successfully", {
            component: COMPONENT_NAME,
            wishlistId: wishlist.id,
            userId: user.id,
        });

        return {
            data: wishlist,
            status: 201,
        };
    } catch (err: any) {
        logger.error("An error occurred while creating wishlist", {
            component: COMPONENT_NAME,
            userId: user.id,
            wishlistName: name,
            error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return new InternalServerErrorResponse(err).generate();
    }
};