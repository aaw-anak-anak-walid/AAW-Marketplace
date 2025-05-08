import { InternalServerErrorResponse } from "@src/commons/patterns";
import { deleteCategoryById } from "../dao/deleteCategoryById.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "DeleteCategoryService";

export const deleteCategoryService = async (category_id: string) => {
  logger.info("Delete category attempt initiated", { categoryId: category_id, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for deleting category.", { categoryId: category_id, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const category = await deleteCategoryById(SERVER_TENANT_ID, category_id);
    logger.info("Category successfully deleted from database", { categoryId: category_id, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateCategories(SERVER_TENANT_ID);
    logger.info("Product categories cache invalidated", { tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateProductLists(SERVER_TENANT_ID);
    logger.info("Product lists cache invalidated due to category deletion", { tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
    await productCache.invalidateProductsByCategory(
      SERVER_TENANT_ID,
      category_id
    );
    logger.info("Products by category cache invalidated for deleted category", { tenantId: SERVER_TENANT_ID, categoryId: category_id, component: COMPONENT_NAME });

    logger.info("Delete category service completed successfully and caches invalidated", { categoryId: category_id, component: COMPONENT_NAME });
    return {
      data: {
        ...category,
      },
      status: 200,
    };
  } catch (err: any) {
    logger.error("Unexpected error in deleteCategoryService", {
      categoryId: category_id,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};