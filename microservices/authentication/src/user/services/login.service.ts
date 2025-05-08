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

const COMPONENT_NAME = "LoginService";

export const loginService = async (username: string, passwordInput: string) => {

  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID; // Assume user and admin login share the same tenant ID
    if (!SERVER_TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) is missing. Cannot proceed with login.", { component: COMPONENT_NAME, username });
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }

    const user: User | undefined = await withRetry(() =>
      getUserByUsername(username, SERVER_TENANT_ID)
    );

    if (!user) {
      logger.warn(`User not found in database for login attempt`, { username, tenantId: SERVER_TENANT_ID, component: COMPONENT_NAME });
      return new NotFoundResponse("Invalid username or password.").generate();
    }


    const isPasswordValid = await bcrypt.compare(passwordInput, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password attempt for user`, { userId: user.id, username, component: COMPONENT_NAME });
      return new UnauthorizedResponse("Invalid username or password.").generate();
    }


    const payload = {
      id: user.id,
      tenant_id: user.tenant_id,
      username: user.username,
    };

    let secret: string;
    if (user.is_admin) {
      secret = process.env.ADMIN_JWT_SECRET as string;
      if (!secret) {
        logger.error("ADMIN_JWT_SECRET is not configured. Cannot sign token.", { component: COMPONENT_NAME, userId: user.id, username });

        return new InternalServerErrorResponse("JWT configuration error.").generate();
      }
    } else {
      secret = process.env.JWT_SECRET as string;
      if (!secret) {
        logger.error("JWT_SECRET is not configured. Cannot sign token.", { component: COMPONENT_NAME, userId: user.id, username });

        return new InternalServerErrorResponse("JWT configuration error.").generate();
      }
    }


    const token = jwt.sign(payload, secret, {
      expiresIn: "1d",
    });
    logger.info(`Login successful, token generated`, { userId: user.id, username, isAdmin: user.is_admin, component: COMPONENT_NAME });

    return {
      data: {
        token,
      },
      status: 200,
    };
  } catch (err: any) {

    logger.error(`Unexpected error during login process`, {
      username,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });

    return new InternalServerErrorResponse(err).generate();
  }
};