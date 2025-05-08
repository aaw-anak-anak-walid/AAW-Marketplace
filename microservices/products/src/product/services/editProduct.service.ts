import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editProductById } from "../dao/editProductById.dao";
import { getProductById } from "../dao/getProductById.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "EditProductService";

export const editProductService = async (
  id: string,
  name?: string,
  description?: string,
  price?: number,
  quantity_available?: number,
  category_id?: string
) => {
  logger.info("Edit product attempt initiated", { productId: id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for editing product.", { productId: id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const originalProduct = await getProductById(SERVER_TENANT_ID, id);
    if (!originalProduct) {
      logger.warn("Product not found for editing", { productId: id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
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
    logger.info("Product successfully edited in database", { productId: id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateProductDetail(SERVER_TENANT_ID, id);
    await productCache.invalidateProductLists(SERVER_TENANT_ID);

    let cacheInvalidationLog = "Product detail and lists caches invalidated.";

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
      cacheInvalidationLog += ` Products by category caches invalidated for old (${originalProduct.category_id}) and new (${category_id}) categories.`;
    } else if (originalProduct.category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        originalProduct.category_id
      );
      cacheInvalidationLog += ` Products by category cache invalidated for category ${originalProduct.category_id}.`;
    }
    logger.info(cacheInvalidationLog, { productId: id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    return {
      data: product,
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in editProductService", {
      productId: id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};