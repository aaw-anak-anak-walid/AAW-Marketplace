import { NewProduct } from "@db/schema/products";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createNewProduct } from "../dao/createNewProduct.dao";
import { productCache } from "@src/commons/utils/redis";

export const createProductService = async (
  name: string,
  description: string,
  price: number,
  quantity_available: number,
  category_id?: string
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const productData: NewProduct = {
      tenant_id: SERVER_TENANT_ID,
      name,
      description,
      price,
      quantity_available,
    };
    if (category_id) {
      productData.category_id = category_id;
    }

    const newProduct = await createNewProduct(productData);

    // Invalidate affected caches
    await productCache.invalidateProductLists(SERVER_TENANT_ID);
    if (category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        category_id
      );
    }

    return {
      data: newProduct,
      status: 201,
    };
  } catch (err: any) {
    return new InternalServerErrorResponse(err).generate();
  }
};
