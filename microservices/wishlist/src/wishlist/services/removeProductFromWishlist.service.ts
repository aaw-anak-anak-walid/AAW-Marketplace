import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getWishlistDetailById } from "../dao/getWishlistDetailById.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { removeProductFromWishlist } from "../dao/removeProductFromWishlist.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";
import logger from "@src/config/logger";

const COMPONENT_NAME = "RemoveProductFromWishlistService";

export const removeProductFromWishlistService = async (
  id: string,
  user: User
) => {
  try {
    logger.info("Starting process to remove product from wishlist", {
      component: COMPONENT_NAME,
      wishlistDetailId: id,
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

    if (!user.id) {
      logger.error("User ID is missing", {
        component: COMPONENT_NAME,
      });
      return new InternalServerErrorResponse("User ID is missing").generate();
    }

    const wishlistDetail = await withRetry(() => getWishlistDetailById(id));
    if (!wishlistDetail) {
      logger.warn("Wishlist detail not found", {
        component: COMPONENT_NAME,
        wishlistDetailId: id,
      });
      return new InternalServerErrorResponse(
        "Wishlist detail not found"
      ).generate();
    }

    const wishlist = await withRetry(() =>
      getWishlistById(SERVER_TENANT_ID, wishlistDetail.wishlist_id)
    );
    if (!wishlist) {
      logger.warn("Wishlist not found", {
        component: COMPONENT_NAME,
        tenantId: SERVER_TENANT_ID,
        wishlistId: wishlistDetail.wishlist_id,
      });
      return new InternalServerErrorResponse("Wishlist not found").generate();
    }

    if (wishlist.user_id !== user.id) {
      logger.warn("Unauthorized attempt to remove product from wishlist", {
        component: COMPONENT_NAME,
        userId: user.id,
        wishlistId: wishlistDetail.wishlist_id,
        wishlistOwnerId: wishlist.user_id,
      });
      return new InternalServerErrorResponse(
        "User is not authorized to remove product from this wishlist"
      ).generate();
    }

    const removeWishlistDetailData = await removeProductFromWishlist(id);

    logger.info("Product removed from wishlist successfully", {
      component: COMPONENT_NAME,
      wishlistDetailId: id,
      userId: user.id,
    });

    return {
      data: removeWishlistDetailData,
      status: 200,
    };
  } catch (err: any) {
    logger.error("An error occurred while removing product from wishlist", {
      component: COMPONENT_NAME,
      wishlistDetailId: id,
      userId: user.id,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};