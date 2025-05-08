import { NewCategory } from "@db/schema/categories";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createNewCategory } from "../dao/createNewCategory.dao";
import { productCache } from "@src/commons/utils/redis";
import logger from "@src/config/logger";

const COMPONENT_NAME = "CreateCategoryService";

export const createCategoryService = async (name: string) => {
  logger.info("Create category attempt initiated", { categoryName: name, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Server Tenant ID (TENANT_ID) not found for creating category.", { categoryName: name, component: COMPONENT_NAME });
      return new InternalServerErrorResponse(
        "Server Tenant ID not found"
      ).generate();
    }

    const categoryData: NewCategory = {
      tenant_id: SERVER_TENANT_ID,
      name,
    };

    const newCategory = await createNewCategory(categoryData);
    logger.info("New category successfully created in database", { categoryId: newCategory.id, categoryName: newCategory.name, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    await productCache.invalidateCategories(SERVER_TENANT_ID);
    logger.info("Product categories cache invalidated", { tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });

    logger.info("Create category service completed successfully", { categoryId: newCategory.id, categoryName: newCategory.name, component: COMPONENT_NAME });
    return {
      data: {
        ...newCategory,
      },
      status: 201,
    };
  } catch (err: any) {
    logger.error("Unexpected error in createCategoryService", {
      categoryName: name,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};