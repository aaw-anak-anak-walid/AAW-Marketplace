import { NewCategory } from "@db/schema/categories";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createNewCategory } from "../dao/createNewCategory.dao";
import { productCache } from "@src/commons/utils/redis";

export const createCategoryService = async (name: string) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const categoryData: NewCategory = {
      tenant_id: SERVER_TENANT_ID,
      name,
    };

    const newCategory = await createNewCategory(categoryData);

    // Invalidate category caches
    await productCache.invalidateCategories(SERVER_TENANT_ID);

    return {
      data: {
        ...newCategory,
      },
      status: 201,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
