import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { getWishlistDetailByWishlistId } from "../dao/getWishlistDetailByWishlistId.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";

export const getWishlistByIdService = async (
  wishlist_id: string,
  user: User
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }

    const wishlistDetail = await withRetry(() =>
      getWishlistDetailByWishlistId(wishlist_id)
    );
    if (!wishlistDetail) {
      return new NotFoundResponse("Wishlist is empty").generate();
    }

    const wishlist = await withRetry(() =>
      getWishlistById(SERVER_TENANT_ID, wishlist_id)
    );
    if (!wishlist) {
      return new NotFoundResponse("Wishlist not found").generate();
    }

    if (wishlist.user_id !== user.id) {
      return new UnauthorizedResponse(
        "User is not authorized to access this wishlist"
      ).generate();
    }

    return {
      data: wishlistDetail,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
