import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import logger from "@src/config/logger";

const COMPONENT_NAME = "VerifyJWTMiddleware";

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      logger.info("JWT verification failed: No token provided.", { ip: req.ip, originalUrl: req.originalUrl, component: COMPONENT_NAME });
      return res.status(401).send({ message: "Invalid token" });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logger.error("JWT verification failed: JWT_SECRET is not configured on the server.", { component: COMPONENT_NAME });
      return res.status(500).send({ message: "Server configuration error" });
    }

    const payload = jwt.verify(
      token,
      JWT_SECRET
    ) as JwtPayload;

    const { tenant_id } = payload;
    const SERVER_TENANT_ID = process.env.TENANT_ID;

    if (!SERVER_TENANT_ID) {
      logger.error("JWT verification failed: Server Tenant ID (TENANT_ID) is not configured.", { component: COMPONENT_NAME });
      return res.status(500).send({ message: "Server tenant ID is missing" });
    }

    if (tenant_id !== SERVER_TENANT_ID) {
      logger.info("JWT verification failed: Token tenant ID does not match server tenant ID.", {
        tokenTenantId: tenant_id,
        serverTenantId: SERVER_TENANT_ID,
        ip: req.ip,
        originalUrl: req.originalUrl,
        component: COMPONENT_NAME
      });
      return res.status(401).send({ message: "Invalid token" });
    }

    req.body.user = payload;
    next();
  } catch (error: any) {
    logger.info("JWT verification failed: Token could not be verified.", {
      errorMessage: error.message,
      errorName: error.name,
      ip: req.ip,
      originalUrl: req.originalUrl,
      component: COMPONENT_NAME
    });
    return res.status(401).send({ message: "Invalid token" });
  }
};