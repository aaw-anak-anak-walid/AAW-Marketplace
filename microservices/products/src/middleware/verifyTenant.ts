import { Request, Response, NextFunction } from "express";
import axios from "axios";
import logger from "@src/config/logger";

const COMPONENT_NAME = "VerifyTenantMiddleware";

export const verifyTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      logger.warn("Tenant verification failed: Token not provided.", { ip: req.ip, originalUrl: req.originalUrl, component: COMPONENT_NAME });
      return res.status(401).send({ message: "Invalid token" });
    }

    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Tenant verification failed: Server Tenant ID (TENANT_ID) is not configured.", { component: COMPONENT_NAME });
      return res.status(500).send({ message: "Server Tenant ID not found" });
    }

    let tenantPayload;
    try {
      tenantPayload = await axios.get(
        `${process.env.TENANT_MS_URL}/tenant/${SERVER_TENANT_ID}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (axiosError: any) {
      logger.warn("Tenant verification failed: Error calling Tenant Microservice.", {
        serverTenantId: SERVER_TENANT_ID,
        tenantMsUrl: process.env.TENANT_MS_URL,
        errorMessage: axiosError.message,
        errorStatus: axiosError.response?.status,
        ip: req.ip,
        originalUrl: req.originalUrl,
        component: COMPONENT_NAME
      });
      return res.status(axiosError.response?.status || 500).send({ message: "Failed to verify tenant information" });
    }

    if (tenantPayload.status !== 200) {
      logger.warn("Tenant verification failed: Tenant Microservice returned non-200 status.", {
        serverTenantId: SERVER_TENANT_ID,
        tenantMsUrl: process.env.TENANT_MS_URL,
        receivedStatus: tenantPayload.status,
        ip: req.ip,
        originalUrl: req.originalUrl,
        component: COMPONENT_NAME
      });
      return res.status(500).send({ message: "Server Tenant not found" });
    }

    const user = req.body.user;
    if (!user || !user.id) {
      logger.warn("Tenant verification failed: User information not found in request body after JWT verification.", { ip: req.ip, originalUrl: req.originalUrl, component: COMPONENT_NAME });
      return res.status(401).send({ message: "Invalid user data" });
    }

    if (user.id !== tenantPayload.data.tenants.owner_id) {
      logger.warn("Tenant verification failed: User is not the owner of the tenant.", {
        userIdFromToken: user.id,
        tenantOwnerId: tenantPayload.data.tenants.owner_id,
        serverTenantId: SERVER_TENANT_ID,
        ip: req.ip,
        originalUrl: req.originalUrl,
        component: COMPONENT_NAME
      });
      return res.status(403).send({ message: "Not Authorized User" });
    }

    next();
  } catch (error: any) {
    logger.warn("Tenant verification failed: Unexpected error.", {
      errorMessage: error.message,
      errorName: error.name,
      ip: req.ip,
      originalUrl: req.originalUrl,
      component: COMPONENT_NAME
    });
    return res.status(401).send({ message: "Invalid token" });
  }
};