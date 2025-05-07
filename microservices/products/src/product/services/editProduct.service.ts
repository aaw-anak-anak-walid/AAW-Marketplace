import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editProductById } from "../dao/editProductById.dao";
import { getProductById } from "../dao/getProductById.dao";
import { productCache } from "@src/commons/utils/redis";

export const editProductService = async (
  id: string,
  name?: string,
  description?: string,
  price?: number,
  quantity_available?: number,
  category_id?: string
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    // Get the original product to check if category has changed
    const originalProduct = await getProductById(SERVER_TENANT_ID, id);
    if (!originalProduct) {
      return {
        status: 404,
        data: { message: "Product not found" },
      };
    }

    const product = await editProductById(SERVER_TENANT_ID, id, {
      name,
      description,
      price,
      quantity_available,
      category_id,
    });

    // Invalidate product detail cache
    await productCache.invalidateProductDetail(SERVER_TENANT_ID, id);

    // Invalidate product listings
    await productCache.invalidateProductLists(SERVER_TENANT_ID);

    // If category changed, invalidate both old and new category product listings
    if (category_id && originalProduct.category_id !== category_id) {
      if (originalProduct.category_id) {
        await productCache.invalidateProductsByCategory(
          SERVER_TENANT_ID,
          originalProduct.category_id
        );
      }
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        category_id
      );
    }
    // If only updating within same category, just invalidate that category
    else if (originalProduct.category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        originalProduct.category_id
      );
    }

    return {
      data: product,
      status: 200,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
