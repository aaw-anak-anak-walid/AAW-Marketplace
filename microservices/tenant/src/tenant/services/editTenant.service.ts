import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { editTenantById } from "../dao/editTenantById.dao";
import { getTenantById } from "../dao/getTenantById.dao";
import { User } from "@type/user";
import { withRetry } from "../../utils/withRetry";
import logger from "@src/config/logger"; 

const COMPONENT_NAME = "EditTenantService";

export const editTenantService = async (
  old_tenant_id: string,
  user: User,
  tenant_id?: string,
  owner_id?: string,
  name?: string
) => {
  try {
    logger.info("Starting tenant edit process", {
      component: COMPONENT_NAME,
      oldTenantId: old_tenant_id,
      userId: user.id,
      tenantId: tenant_id,
      ownerId: owner_id,
      name,
    });

    const tenant_information = await withRetry(() =>
      getTenantById(old_tenant_id)
    );
    if (!tenant_information) {
      logger.warn("Tenant not found during retrieval", {
        component: COMPONENT_NAME,
        oldTenantId: old_tenant_id,
      });
      return new NotFoundResponse("Tenant not found").generate();
    }

    if (tenant_information.tenants.owner_id !== user.id) {
      logger.warn("Unauthorized edit attempt", {
        component: COMPONENT_NAME,
        userId: user.id,
        oldTenantId: old_tenant_id,
        ownerId: tenant_information.tenants.owner_id,
      });
      return new UnauthorizedResponse(
        "You are not allowed to edit this tenant"
      ).generate();
    }

    const tenant = await editTenantById(old_tenant_id, {
      tenant_id,
      owner_id,
      name,
    });
    if (!tenant) {
      logger.error("Error editing tenant. DAO returned null or undefined.", {
        component: COMPONENT_NAME,
        oldTenantId: old_tenant_id,
        tenantId: tenant_id,
        ownerId: owner_id,
        name,
      });
      return new InternalServerErrorResponse("Error editing tenant").generate();
    }

    logger.info("Tenant edited successfully", {
      component: COMPONENT_NAME,
      oldTenantId: old_tenant_id,
      tenantId: tenant_id,
      ownerId: owner_id,
      name,
    });

    return {
      data: tenant,
      status: 200,
    };
  } catch (err: any) {
    logger.error("An error occurred during tenant edit process", {
      component: COMPONENT_NAME,
      oldTenantId: old_tenant_id,
      userId: user.id,
      tenantId: tenant_id,
      ownerId: owner_id,
      name,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return new InternalServerErrorResponse(err).generate();
  }
};