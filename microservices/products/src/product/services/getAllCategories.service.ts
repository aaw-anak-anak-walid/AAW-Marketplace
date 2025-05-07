// src/services/category.service.ts
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";

export const getAllCategoriesService = async (page: number, limit: number) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const offset = (page - 1) * limit;

    // now the DAO returns { items, total }
    const { items: categories, total } = await getAllCategoriesByTenantId(
      SERVER_TENANT_ID,
      limit,
      offset
    );

    return {
      status: 200,
      data: {
        categories,
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
