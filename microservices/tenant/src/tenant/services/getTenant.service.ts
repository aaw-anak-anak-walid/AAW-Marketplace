import {
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import { getTenantById } from "../dao/getTenantById.dao";
import { withRetry } from "../../utils/withRetry";
import logger from "@src/config/logger"; // Tambahkan logger

const COMPONENT_NAME = "GetTenantService";

export const getTenantService = async (tenant_id: string) => {
  try {
    logger.info("Fetching tenant by ID", {
      component: COMPONENT_NAME,
      tenantId: tenant_id,
    });

    const tenant = await withRetry(() => getTenantById(tenant_id));
    if (!tenant) {
      logger.warn("Tenant not found", {
        component: COMPONENT_NAME,
        tenantId: tenant_id,
      });
      return new NotFoundResponse("Tenant not found").generate();
    }

    return {
      data: {
        ...tenant,
      },
      status: 200,
    };
  } catch (err: any) {
    logger.error("An error occurred during tenant retrieval", {
      component: COMPONENT_NAME,
      tenantId: tenant_id,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};
