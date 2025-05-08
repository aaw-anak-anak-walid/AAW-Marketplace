import { createClient, RedisClientType } from "redis";
import logger from '../config/logger'; // Adjust path if your logger config is elsewhere

const COMPONENT_NAME = "RedisClient";
let redisClient: RedisClientType;

export const initRedis = async () => {
  logger.info("Attempting to initialize Redis client.", { component: COMPONENT_NAME });
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    logger.info(`Creating Redis client with URL: ${redisUrl}`, { component: COMPONENT_NAME, redisUrl });
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Client Error:", { errorMessage: (err as Error).message, stack: (err as Error).stack, component: COMPONENT_NAME });
    });

    redisClient.on("connect", () => {
      logger.info("✅ Redis client connected.", { component: COMPONENT_NAME });
    });

    redisClient.on("ready", () => {
      logger.info("Redis client is ready to use.", { component: COMPONENT_NAME });
    });

    redisClient.on("reconnecting", () => {
      logger.info("Redis client is reconnecting...", { component: COMPONENT_NAME });
    });

    redisClient.on("end", () => {
      logger.info("Redis client connection has ended.", { component: COMPONENT_NAME });
    });

    logger.info("Attempting to connect to Redis...", { component: COMPONENT_NAME });
    await redisClient.connect();
    logger.info("Successfully connected to Redis and client is ready.", { component: COMPONENT_NAME });

  } catch (error: any) {
    logger.error("❌ Redis connection failed during initial connect.", { errorMessage: error.message, stack: error.stack, component: COMPONENT_NAME });
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    logger.warn("Redis client requested before initialization or after a failed connection. Attempting to re-initialize.", { component: COMPONENT_NAME });
    throw new Error("Redis client has not been initialized. Call initRedis() first.");
  }
  return redisClient;
};