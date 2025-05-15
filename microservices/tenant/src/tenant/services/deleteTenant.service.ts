import logger from "@src/config/logger"; // Sesuai permintaan
import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { deleteTenantById } from "../dao/deleteTenantById.dao";
import { User } from "@type/user";
import { getTenantById } from "../dao/getTenantById.dao";
import { withRetry } from "../../utils/withRetry";

const COMPONENT_NAME = "DeleteTenantService";

export const deleteTenantService = async (user: User, tenant_id: string) => {
  try {
    logger.info("Starting tenant deletion process", {
      component: COMPONENT_NAME,
      userId: user.id,
      tenantId: tenant_id,
    });

    const tenant_information = await withRetry(() => getTenantById(tenant_id));
    if (!tenant_information) {
      logger.warn("Tenant not found during retrieval", {
        component: COMPONENT_NAME,
        tenantId: tenant_id,
      });
      return new NotFoundResponse("Tenant not found").generate();
    }

    if (tenant_information.tenants.owner_id !== user.id) {
      logger.warn("Unauthorized deletion attempt", {
        component: COMPONENT_NAME,
        userId: user.id,
        tenantId: tenant_id,
        ownerId: tenant_information.tenants.owner_id,
      });
      return new UnauthorizedResponse(
        "You are not allowed to delete this tenant"
      ).generate();
    }

    const tenant = await deleteTenantById(tenant_id);
    if (!tenant) {
      logger.warn("Tenant not found during deletion", {
        component: COMPONENT_NAME,
        tenantId: tenant_id,
      });
      return new NotFoundResponse("Tenant not found").generate();
    }

    logger.info("Tenant deleted successfully", {
      component: COMPONENT_NAME,
      tenantId: tenant_id,
    });

    return {
      data: {
        ...tenant,
      },
      status: 200,
    };
  } catch (err: any) {
    logger.error("An error occurred during tenant deletion", {
      component: COMPONENT_NAME,
      tenantId: tenant_id,
      userId: user.id,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};