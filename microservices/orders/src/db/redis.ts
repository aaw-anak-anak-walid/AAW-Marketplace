import { createClient, RedisClientType } from "redis";

// Create Redis client
let redisClient: RedisClientType;

// Initialize Redis client
export const initRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    // Set up event handlers
    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis client connected");
    });

    // Connect to Redis
    await redisClient.connect();
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
};

// Get Redis client (to be used by other modules)
export const getRedisClient = (): RedisClientType => {
  return redisClient;
};
