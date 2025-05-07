import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editCategoryById } from "../dao/editCategoryById.dao";
import { productCache } from "@src/commons/utils/redis";

export const editCategoryService = async (
  category_id: string,
  name?: string
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const category = await editCategoryById(SERVER_TENANT_ID, category_id, {
      name,
    });

    // Invalidate category caches
    await productCache.invalidateCategories(SERVER_TENANT_ID);

    // Invalidate products associated with this category
    await productCache.invalidateProductsByCategory(
      SERVER_TENANT_ID,
      category_id
    );

    return {
      data: category,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
