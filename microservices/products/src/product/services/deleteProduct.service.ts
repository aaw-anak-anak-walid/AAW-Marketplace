import { InternalServerErrorResponse } from "@src/commons/patterns";
import { deleteProductById } from "../dao/deleteProductById.dao";
import { getProductById } from "../dao/getProductById.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "DeleteProductService";

export const deleteProductService = async (id: string) => {
  logger.info("Delete product attempt initiated", { productId: id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for deleting product.", { productId: id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const productToDelete = await getProductById(SERVER_TENANT_ID, id);
    if (!productToDelete) {
      logger.warn("Product not found for deletion", { productId: id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return {
        status: 404,
        data: { message: "Product not found" },
      };
    }

    const product = await deleteProductById(SERVER_TENANT_ID, id);

    await productCache.invalidateProductDetail(SERVER_TENANT_ID, id);
    await productCache.invalidateProductLists(SERVER_TENANT_ID);
    if (productToDelete.category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        productToDelete.category_id
      );
    }
    logger.info("Product deleted and relevant caches invalidated successfully", { productId: id, categoryId: productToDelete.category_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      data: {
        ...product,
      },
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in deleteProductService", {
      productId: id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};