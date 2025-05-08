import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editCategoryById } from "../dao/editCategoryById.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "EditCategoryService";

export const editCategoryService = async (
  category_id: string,
  name?: string
) => {
  logger.info("Edit category attempt initiated", { categoryId: category_id, newName: name, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for editing category.", { categoryId: category_id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const category = await editCategoryById(SERVER_TENANT_ID, category_id, {
      name,
    });
    logger.info("Category successfully edited in database", { categoryId: category_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateCategories(SERVER_TENANT_ID);
    await productCache.invalidateProductsByCategory(
      SERVER_TENANT_ID,
      category_id
    );
    logger.info("Category and associated product caches invalidated", { tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });

    return {
      data: category,
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in editCategoryService", {
      categoryId: category_id,
      newName: name,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};