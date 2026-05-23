import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true
    })
  : null;

if (!redis) {
  logger.warn("REDIS_URL not set. Redis-backed features are disabled.");
}
