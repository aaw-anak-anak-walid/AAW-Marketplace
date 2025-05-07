import { InternalServerErrorResponse } from "@src/commons/patterns";
import { deleteProductById } from "../dao/deleteProductById.dao";
import { getProductById } from "../dao/getProductById.dao";
import { productCache } from "@src/commons/utils/redis";

export const deleteProductService = async (id: string) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Get the product first to know its category for cache invalidation
    const productToDelete = await getProductById(SERVER_TENANT_ID, id);
    if (!productToDelete) {
      return {
        status: 404,
        data: { message: "Product not found" },
      };
    }

    const product = await deleteProductById(SERVER_TENANT_ID, id);

    // Invalidate product detail cache
    await productCache.invalidateProductDetail(SERVER_TENANT_ID, id);

    // Invalidate product listings
    await productCache.invalidateProductLists(SERVER_TENANT_ID);

    // If product had a category, invalidate that category's product listing
    if (productToDelete.category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        productToDelete.category_id
      );
    }

    return {
      data: {
        ...product,
      },
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
