// src/services/wishlist.service.ts
import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { getAllUserWishlist } from "../dao/getAllUserWishlist.dao";
import { User } from "@type/user";

export const getAllUserWishlistService = async (
  user: User,
  page: number,
  limit: number
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }

    if (!user.id) {
      return new NotFoundResponse("User ID is missing").generate();
    }

    const offset = (page - 1) * limit;
    const { items: wishlists, total } = await getAllUserWishlist(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );

    return {
      status: 200,
      data: {
        wishlists,
        meta: {
          totalItems: total,
          page,
          perPage: limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
