import { InternalServerErrorResponse } from "@src/commons/patterns";
import { createNewTenant } from "../dao/createNewTenant.dao";
import logger from "@src/config/logger";

const COMPONENT_NAME = "CreateTenantService";

export const createTenantService = async (
    owner_id: string,
    name: string,
) => {
    try {
        const tenant = await createNewTenant(owner_id, name);
        if (!tenant) {
            logger.error("Failed to create tenant. DAO returned null or undefined.", {
                component: COMPONENT_NAME,
                owner_id,
                name,
            });
            return new InternalServerErrorResponse("Error creating tenant").generate();
        }

        return {
            data: tenant,
            status: 201,
        };
    } catch (err: any) {
        logger.error("An error occurred while creating tenant.", {
            component: COMPONENT_NAME,
            owner_id,
            name,
            error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        return new InternalServerErrorResponse(err).generate();
    }
};