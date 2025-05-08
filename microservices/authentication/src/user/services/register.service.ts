import bcrypt from "bcrypt";
import { NewUser, User } from "@db/schema/users";
import { insertNewUser } from "../dao/insertNewUser.dao";
import { InternalServerErrorResponse } from "@src/commons/patterns";
import logger from '@src/config/logger';

const COMPONENT_NAME = "RegisterService";

export const registerService = async (
  username: string,
  email: string,
  password: string,
  full_name: string,
  address: string,
  phone_number: string
) => {
  logger.info(`Registration attempt initiated`, { username, email, component: COMPONENT_NAME });
  try {
    logger.info(`Generating salt and hashing password`, { username, component: COMPONENT_NAME });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.info(`Password successfully hashed`, { username, component: COMPONENT_NAME });

    if (!process.env.TENANT_ID) {
      logger.error("Server tenant ID (TENANT_ID) is missing for registration.", { component: COMPONENT_NAME, username });
      return new InternalServerErrorResponse(
        "Server tenant ID is missing"
      ).generate();
    }
    logger.info(`Tenant ID successfully retrieved for registration`, { tenantId: process.env.TENANT_ID, component: COMPONENT_NAME, username });

    const userData: NewUser = {
      tenant_id: process.env.TENANT_ID,
      username,
      email,
      password: hashedPassword,
      full_name,
      address,
      phone_number,
    };

    logger.info(`Attempting to insert new user into database`, { username, email, tenantId: userData.tenant_id, component: COMPONENT_NAME });
    const newUser = await insertNewUser(userData);

    if (!newUser) {
      logger.error(`DAO insertNewUser returned undefined, user creation failed unexpectedly.`, { username, email, component: COMPONENT_NAME });
      return new InternalServerErrorResponse("Failed to create user account due to an unexpected issue.").generate();
    }
    const { password: _, ...userResponse } = newUser[0] as User;


    logger.info(`User registered successfully`, { userId: (newUser[0] as User).id, username, email, component: COMPONENT_NAME });
    return {
      data: userResponse,
      status: 201,
    };
  } catch (err: any) {
    logger.error(`Unexpected error during user registration process`, {
      username,
      email,
      errorMessage: err.message,
      errorName: err.name,
      stack: err.stack,
      component: COMPONENT_NAME
    });
    return new InternalServerErrorResponse(err).generate();
  }
};