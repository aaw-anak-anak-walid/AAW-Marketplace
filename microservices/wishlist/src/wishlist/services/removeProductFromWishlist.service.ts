import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getWishlistDetailById } from "../dao/getWishlistDetailById.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { removeProductFromWishlist } from "../dao/removeProductFromWishlist.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";

export const removeProductFromWishlistService = async (
  id: string,
  user: User
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }

    if (!user.id) {
      return new InternalServerErrorResponse("User ID is missing").generate();
    }

    const wishlistDetail = await withRetry(() => getWishlistDetailById(id));
    if (!wishlistDetail) {
      return new InternalServerErrorResponse(
        "Wishlist detail not found"
      ).generate();
    }

    const wishlist = await withRetry(() =>
      getWishlistById(SERVER_TENANT_ID, wishlistDetail.wishlist_id)
    );
    if (!wishlist) {
      return new InternalServerErrorResponse("Wishlist not found").generate();
    }

    if (wishlist.user_id !== user.id) {
      return new InternalServerErrorResponse(
        "User is not authorized to remove product from this wishlist"
      ).generate();
    }

    const removeWishlistDetailData = await removeProductFromWishlist(id);

    return {
      data: removeWishlistDetailData,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
