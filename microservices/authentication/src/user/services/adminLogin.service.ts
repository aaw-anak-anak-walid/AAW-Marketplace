import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getUserByUsername } from "../dao/getUserByUsername.dao";
import { withRetry } from "@src/utils/retry";
import {
  InternalServerErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from "@src/commons/patterns";
import { User } from "@db/schema/users";
import logger from '@src/config/logger';

const COMPONENT_NAME = "AdminLoginService";

export const adminLoginService = async (username: string, password: string) => {
  logger.info(`Admin login attempt initiated`, { username, component: COMPONENT_NAME });
  try {
    const SERVER_TENANT_ID = process.env.ADMIN_TENANT_ID;
    if (!SERVER_TENANT_ID) {
      logger.error("Admin tenant ID (ADMIN_TENANT_ID) is missing for admin login.", { component: COMPONENT_NAME, username });
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }
    logger.info(`Admin tenant ID successfully retrieved for admin login`, { tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME, username });

    logger.info(`Attempting to fetch admin user by username with retry`, { username, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
    const user: User | undefined = await withRetry(() =>
      getUserByUsername(username, SERVER_TENANT_ID)
    );

    if (!user) {
      logger.warn(`Admin user not found in database for login attempt`, { username, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return new NotFoundResponse("Invalid username or password.").generate();
    }
    logger.info(`Admin user found in database`, { userId: user.id, username, component: COMPONENT_NAME });

    logger.info(`Comparing password for admin user`, { userId: user.id, username, component: COMPONENT_NAME });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password attempt for admin user`, { userId: user.id, username, component: COMPONENT_NAME });
      return new UnauthorizedResponse("Invalid username or password.").generate();
    }
    logger.info(`Password validation successful for admin user`, { userId: user.id, username, component: COMPONENT_NAME });

    const isAdmin = user.is_admin;
    if (!isAdmin) {
      logger.warn(`User is not an admin`, { userId: user.id, username, component: COMPONENT_NAME });
      return new UnauthorizedResponse("User is not authorized for admin access.").generate();
    }
    logger.info(`User confirmed as admin`, { userId: user.id, username, component: COMPONENT_NAME });

    const payload = {
      id: user.id,
      tenant_id: user.tenant_id,
      username: user.username,
      is_admin: user.is_admin,
    };

    const secret: string = process.env.ADMIN_JWT_SECRET as string;
    if (!secret) {
      logger.error("Admin JWT secret (ADMIN_JWT_SECRET) is not configured.", { component: COMPONENT_NAME, userId: user.id, username });
      return new InternalServerErrorResponse("Admin JWT configuration error.").generate();
    }
    logger.info(`Admin JWT secret successfully retrieved`, { component: COMPONENT_NAME, userId: user.id, username });


    logger.info(`Signing admin JWT for user`, { userId: user.id, username, component: COMPONENT_NAME });
    const token = jwt.sign(payload, secret, {
      expiresIn: "1d",
    });
    logger.info(`Admin login successful, token generated`, { userId: user.id, username, component: COMPONENT_NAME });

    return {
      data: {
        token,
        userId: user.id,
        username: user.username,
      },
      status: 200,
    };
  } catch (err: any) {
    logger.error(`Unexpected error during admin login process`, {
      username,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};