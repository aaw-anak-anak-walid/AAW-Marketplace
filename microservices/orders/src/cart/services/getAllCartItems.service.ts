// src/services/cart.service.ts
import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { getAllCartItems } from "../dao/getAllCartItems.dao";
import { User } from "@type/user";

export const getAllCartItemsService = async (
  user: User,
  page: number,
  limit: number
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse("Tenant ID not found").generate();
    }
    if (!user.id) {
      return new NotFoundResponse("User not found").generate();
    }

    const offset = (page - 1) * limit;
    // DAO now returns { items, total }
    const { items: cartItems, total } = await getAllCartItems(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );

    return {
      status: 200,
      data: {
        cartItems,
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
