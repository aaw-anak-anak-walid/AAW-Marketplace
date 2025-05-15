import { NewWishlistDetail } from "@db/schema/wishlistDetail";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { addProductToWishlist } from "../dao/addProductToWishlist.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";
import logger from "@src/config/logger";

const COMPONENT_NAME = "AddProductToWishlistService";

export const addProductToWishlistService = async (
  wishlist_id: string,
  product_id: string,
  user: User
) => {
  try {
    logger.info("Starting process to add product to wishlist", {
      component: COMPONENT_NAME,
      wishlistId: wishlist_id,
      productId: product_id,
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

    const wishlist = await withRetry(() =>
      getWishlistById(SERVER_TENANT_ID, wishlist_id)
    );
    if (!wishlist) {
      logger.warn("Wishlist not found", {
        component: COMPONENT_NAME,
        wishlistId: wishlist_id,
        tenantId: SERVER_TENANT_ID,
      });
      return new InternalServerErrorResponse("Wishlist not found").generate();
    }

    if (wishlist.user_id !== user.id) {
      logger.warn("Unauthorized attempt to add product to wishlist", {
        component: COMPONENT_NAME,
        wishlistId: wishlist_id,
        productId: product_id,
        userId: user.id,
        wishlistOwnerId: wishlist.user_id,
      });
      return new InternalServerErrorResponse(
        "User is not authorized to add product to this wishlist"
      ).generate();
    }

    const wishlistDetailData: NewWishlistDetail = {
      product_id,
      wishlist_id,
    };

    const wishlistDetail = await addProductToWishlist(wishlistDetailData);

    logger.info("Product added to wishlist successfully", {
      component: COMPONENT_NAME,
      wishlistDetail,
    });

    return {
      data: wishlistDetail,
      status: 201,
    };
  } catch (err: any) {
    logger.error("An error occurred while adding product to wishlist", {
      component: COMPONENT_NAME,
      wishlistId: wishlist_id,
      productId: product_id,
      userId: user.id,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};