import { InternalServerErrorResponse } from "@src/commons/patterns";
import { deleteCategoryById } from "../dao/deleteCategoryById.dao";
import { productCache } from "@src/commons/utils/redis";

export const deleteCategoryService = async (category_id: string) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const category = await deleteCategoryById(SERVER_TENANT_ID, category_id);

    // Invalidate category caches
    await productCache.invalidateCategories(SERVER_TENANT_ID);

    // Invalidate products associated with this category
    // Products that were in this category will now appear differently in listings
    await productCache.invalidateProductLists(SERVER_TENANT_ID);
    await productCache.invalidateProductsByCategory(
      SERVER_TENANT_ID,
      category_id
    );

    return {
      data: {
        ...category,
      },
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
