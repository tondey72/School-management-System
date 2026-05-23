import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const notificationQueue = redis ? new Queue("notifications", { connection: redis }) : null;
export const reportingQueue = redis ? new Queue("reporting", { connection: redis }) : null;
