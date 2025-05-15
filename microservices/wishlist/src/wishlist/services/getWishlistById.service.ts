import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { getWishlistDetailByWishlistId } from "../dao/getWishlistDetailByWishlistId.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetWishlistByIdService";

export const getWishlistByIdService = async (
  wishlist_id: string,
  user: User
) => {
  try {
    logger.info("Starting process to fetch wishlist by ID", {
      component: COMPONENT_NAME,
      wishlistId: wishlist_id,
      userId: user.id,
    });

    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID is missing", {
        component: COMPONENT_NAME,
      });
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }

    const wishlistDetail = await withRetry(() =>
      getWishlistDetailByWishlistId(wishlist_id)
    );
    if (!wishlistDetail) {
      logger.warn("Wishlist is empty", {
        component: COMPONENT_NAME,
        wishlistId: wishlist_id,
      });
      return new NotFoundResponse("Wishlist is empty").generate();
    }

    const wishlist = await withRetry(() =>
      getWishlistById(SERVER_TENANT_ID, wishlist_id)
    );
    if (!wishlist) {
      logger.warn("Wishlist not found", {
        component: COMPONENT_NAME,
        wishlistId: wishlist_id,
        tenantId: SERVER_TENANT_ID,
      });
      return new NotFoundResponse("Wishlist not found").generate();
    }

    if (wishlist.user_id !== user.id) {
      logger.warn("Unauthorized access attempt to wishlist", {
        component: COMPONENT_NAME,
        wishlistId: wishlist_id,
        userId: user.id,
        wishlistOwnerId: wishlist.user_id,
      });
      return new UnauthorizedResponse(
        "User is not authorized to access this wishlist"
      ).generate();
    }

    logger.info("Wishlist fetched successfully", {
      component: COMPONENT_NAME,
      wishlistId: wishlist_id,
      userId: user.id,
    });

    return {
      data: wishlistDetail,
      status: 200,
    };
  } catch (err: any) {
    logger.error("An error occurred while fetching wishlist by ID", {
      component: COMPONENT_NAME,
      wishlistId: wishlist_id,
      userId: user.id,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};
