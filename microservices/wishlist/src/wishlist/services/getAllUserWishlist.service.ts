import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { getAllUserWishlist } from "../dao/getAllUserWishlist.dao";
import { User } from "@type/user";
import logger from "@src/config/logger";

const COMPONENT_NAME = "GetAllUserWishlistService";

export const getAllUserWishlistService = async (
  user: User,
  page: number,
  limit: number
) => {
  try {
    logger.info("Starting process to fetch all user wishlists", {
      component: COMPONENT_NAME,
      userId: user.id,
      page,
      limit,
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
      logger.warn("User ID is missing", {
        component: COMPONENT_NAME,
      });
      return new NotFoundResponse("User ID is missing").generate();
    }

    const offset = (page - 1) * limit;
    const { items: wishlists, total } = await getAllUserWishlist(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );

    logger.info("Successfully fetched user wishlists", {
      component: COMPONENT_NAME,
      userId: user.id,
      totalItems: total,
      page,
      perPage: limit,
    });

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
    logger.error("An error occurred while fetching user wishlists", {
      component: COMPONENT_NAME,
      userId: user.id,
      page,
      limit,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};