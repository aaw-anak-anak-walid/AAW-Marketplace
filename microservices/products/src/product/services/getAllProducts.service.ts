import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";

export const getAllProductsService = async (page: number, limit: number) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const offset = (page - 1) * limit;

    // Now calling the DAO with limit & offset
    // (your DAO will need to accept these params and return { items, total })
    const { items: products, total } = await getAllProductsByTenantId(
      SERVER_TENANT_ID,
      limit,
      offset
    );

    return {
      status: 200,
      data: {
        products,
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
