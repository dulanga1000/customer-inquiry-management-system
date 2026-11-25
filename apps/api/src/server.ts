import type { Server } from "node:http";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createPrismaContext } from "./lib/prisma.js";
import { createLogger } from "./utils/logger.js";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const { prisma, disconnect } = createPrismaContext(env.DATABASE_URL);

const app = createApp({
  prisma,
  corsOrigin: env.CORS_ORIGIN,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  accessTokenTtl: env.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  cookieSecure: env.COOKIE_SECURE,
  logLevel: env.LOG_LEVEL,
  logger,
});

const server: Server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "CIMS API listening");
});

let shuttingDown = false;

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await disconnect();
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  void shutdown(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  void shutdown(1);
});
