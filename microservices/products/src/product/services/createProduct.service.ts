import { NewProduct } from "@db/schema/products";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createNewProduct } from "../dao/createNewProduct.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "CreateProductService";

export const createProductService = async (
  name: string,
  description: string,
  price: number,
  quantity_available: number,
  category_id?: string
) => {
  logger.info("Create product attempt initiated", { productName: name, categoryId: category_id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for creating product.", { productName: name, component: COMPONENT_NAME });
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
    logger.info("New product successfully created in database", { productId: newProduct.id, productName: newProduct.name, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateProductLists(SERVER_TENANT_ID);
    logger.info("Product lists cache invalidated", { tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
    if (category_id) {
      await productCache.invalidateProductsByCategory(
        SERVER_TENANT_ID,
        category_id
      );
      logger.info("Products by category cache invalidated", { tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });
    }

    logger.info("Create product service completed successfully", { productId: newProduct.id, productName: newProduct.name, component: COMPONENT_NAME });
    return {
      data: newProduct,
      status: 201,
    };
  } catch (err: any) {
    logger.error("Unexpected error in createProductService", {
      productName: name,
      categoryId: category_id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};