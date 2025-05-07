// src/services/order.service.ts
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllOrders } from "../dao/getAllOrders.dao";
import { User } from "@type/user";

export const getAllOrdersService = async (
  user: User,
  page: number,
  limit: number
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      throw new Error("SERVER_TENANT_ID is not defined");
    }

    if (!user.id) {
      return new InternalServerErrorResponse(
        "User ID is not defined"
      ).generate();
    }

    const offset = (page - 1) * limit;

    // DAO now returns { items, total }
    const { items: orders, total } = await getAllOrders(
      SERVER_TENANT_ID,
      user.id,
      limit,
      offset
    );

    return {
      status: 200,
      data: {
        orders,
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
