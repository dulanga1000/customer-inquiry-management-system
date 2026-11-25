import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import type { HealthResponse } from "@cims/shared";
import type { PrismaClient } from "./generated/prisma/client.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { notFoundMiddleware } from "./middleware/notFound.js";
import { createLoginRateLimiter, createRefreshRateLimiter } from "./middleware/rateLimit.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { createRequireAuth } from "./middleware/requireAuth.js";
import { requireCsrfHeaders } from "./middleware/requireCsrfHeaders.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRepository } from "./modules/auth/auth.repository.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { createLogger } from "./utils/logger.js";

export interface AppDependencies {
  prisma: PrismaClient;
  corsOrigin: string;
  jwtAccessSecret: string;
  accessTokenTtl?: string;
  refreshTokenTtlDays?: number;
  cookieSecure?: boolean;
  logLevel?: string;
  logger?: Logger;
  enableRateLimit?: boolean;
}

function parseDurationMs(ttl: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    return fallbackMs;
  }
  const amount = Number.parseInt(match[1] ?? "0", 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit ?? "m"] ?? 60 * 1000);
}

export function createApp({
  prisma,
  corsOrigin,
  jwtAccessSecret,
  accessTokenTtl = "15m",
  refreshTokenTtlDays = 7,
  cookieSecure = false,
  logLevel = "info",
  logger = createLogger(logLevel),
  enableRateLimit = true,
}: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) {
          return "error";
        }
        if (res.statusCode >= 400) {
          return "warn";
        }
        return "info";
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const payload: HealthResponse = { status: "ok", db: "up" };
      res.status(200).json(payload);
    } catch {
      const payload: HealthResponse = { status: "degraded", db: "down" };
      res.status(503).json(payload);
    }
  });

  app.use("/api", requireCsrfHeaders);

  const authRepository = new AuthRepository(prisma);
  const authService = new AuthService(
    authRepository,
    {
      jwtAccessSecret,
      accessTokenTtl,
      refreshTokenTtlDays,
    },
    logger,
  );
  const authController = new AuthController(authService, {
    cookieSecure,
    accessTokenTtlMs: parseDurationMs(accessTokenTtl, 15 * 60 * 1000),
    refreshTokenTtlMs: refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });

  app.use(
    "/api/auth",
    createAuthRouter({
      controller: authController,
      requireAuth: createRequireAuth(jwtAccessSecret),
      loginRateLimiter: createLoginRateLimiter(enableRateLimit),
      refreshRateLimiter: createRefreshRateLimiter(enableRateLimit),
    }),
  );

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(logger));

  return app;
}
