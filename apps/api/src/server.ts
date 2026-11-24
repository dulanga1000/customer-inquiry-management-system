import type { Server } from "node:http";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createPrismaContext } from "./lib/prisma.js";

const env = loadEnv();
const { prisma, disconnect } = createPrismaContext(env.DATABASE_URL);
const app = createApp({
  prisma,
  corsOrigin: env.CORS_ORIGIN,
  logLevel: env.LOG_LEVEL,
});

const server: Server = app.listen(env.PORT, () => {
  process.stdout.write(`CIMS API listening on port ${env.PORT}\n`);
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
  process.stderr.write(`Unhandled rejection: ${String(reason)}\n`);
  void shutdown(1);
});

process.on("uncaughtException", (error) => {
  process.stderr.write(`Uncaught exception: ${error.stack ?? error.message}\n`);
  void shutdown(1);
});
