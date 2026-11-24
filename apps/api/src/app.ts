import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { HealthResponse } from "@cims/shared";
import type { PrismaClient } from "./generated/prisma/client.js";

export interface AppDependencies {
  prisma: PrismaClient;
  corsOrigin: string;
  logLevel?: string;
}

export function createApp({ prisma, corsOrigin, logLevel = "info" }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      level: logLevel,
      redact: ["req.headers.cookie", "req.headers.authorization"],
    }),
  );

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

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        requestId: "unknown",
      },
    });
  });

  return app;
}
