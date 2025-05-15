import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import logger from "@src/config/logger";

const COMPONENT_NAME = "VerifyAdminJWT";

export const verifyAdminJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      logger.warn("Admin JWT verification failed: Token not provided", { ip: req.ip, originalUrl: req.originalUrl, component: COMPONENT_NAME });
      return res.status(401).send({ message: "Invalid token" });
    }

    const payload = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET as string
    ) as JwtPayload;

    const { tenant_id } = payload;
    const SERVER_TENANT_ID = process.env.ADMIN_TENANT_ID;

    if (!SERVER_TENANT_ID) {
      logger.error("Admin JWT verification failed: Server admin tenant ID (ADMIN_TENANT_ID) is not configured.", { component: COMPONENT_NAME });
      return res.status(500).send({ message: "Server tenant ID is missing" });
    }

    if (tenant_id !== process.env.ADMIN_TENANT_ID) {
      logger.warn("Admin JWT verification failed: Token tenant_id does not match server admin tenant_id.", { tokenTenantId: tenant_id, ip: req.ip, originalUrl: req.originalUrl, component: COMPONENT_NAME });
      return res.status(401).send({ message: "Invalid token" });
    }

    req.body.user = payload;
    next();
  } catch (error: any) {
    logger.warn("Admin JWT verification failed: Error during token verification.", {
      errorMessage: error.message,
      errorName: error.name,
      ip: req.ip,
      originalUrl: req.originalUrl,
      component: COMPONENT_NAME
    });
    return res.status(401).send({ message: "Invalid token" });
  }
};