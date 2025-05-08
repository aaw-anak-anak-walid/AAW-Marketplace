import { createClient, RedisClientType } from "redis";
import logger from "@src/config/logger"; // Assuming logger is configured and exported from this path

const COMPONENT_NAME = "RedisClient";

let redisClient: RedisClientType;

export const initRedis = async () => {
  logger.info("Initializing Redis client connection attempt", { component: COMPONENT_NAME });
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Client Error", { errorMessage: err.message, errorName: err.name, stack: err.stack, component: COMPONENT_NAME });
    });

    redisClient.on("connect", () => {
      logger.info("Redis client connected successfully", { redis_url: process.env.REDIS_URL || "redis://localhost:6379", component: COMPONENT_NAME });
    });

    await redisClient.connect();
  } catch (error: any) {
    logger.error("Redis connection failed during initialization", {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      redis_url: process.env.REDIS_URL || "redis://localhost:6379",
      component: COMPONENT_NAME
    });
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    logger.warn("Redis client requested before initialization or after a connection failure.", { component: COMPONENT_NAME });
  }
  return redisClient;
};