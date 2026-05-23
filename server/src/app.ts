import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { swaggerSpec } from "./config/swagger.js";
import { env } from "./config/env.js";

export const app = express();

// Required when running behind Docker/forwarded ports so client IP handling is correct.
app.set("trust proxy", 1);

const allowedOrigins = new Set([
  env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin) || origin.endsWith(".github.dev")) {
    return true;
  }

  try {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

app.get("/", (_req, res) => {
  res.status(200).json({
    service: "School Management System API",
    status: "ok",
    docs: "/api/docs",
    health: "/api/health",
    readiness: "/api/health/ready"
  });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", apiRoutes);

app.use(errorHandler);
