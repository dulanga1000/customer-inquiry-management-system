import path from "node:path";
import dotenv from "dotenv";
import { createApp } from "../../src/app.js";
import { createPrismaContext, type PrismaContext } from "../../src/lib/prisma.js";
import { createLogger } from "../../src/utils/logger.js";
import { hashPassword } from "../../src/utils/password.js";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../../.env") });
dotenv.config();

export const TEST_JWT_SECRET = "test-jwt-access-secret-at-least-32-characters";
export const CSRF_HEADER = { "X-Requested-With": "cims" } as const;

export function getTestDatabaseUrl(): string {
  const url = process.env["TEST_DATABASE_URL"] ?? process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for integration tests");
  }
  return url;
}

export function createTestPrismaContext(): PrismaContext {
  return createPrismaContext(getTestDatabaseUrl());
}

export function createTestApp(
  ctx: PrismaContext,
  options?: { enableRateLimit?: boolean; jwtAccessSecret?: string },
) {
  return createApp({
    prisma: ctx.prisma,
    corsOrigin: "http://localhost:3000",
    jwtAccessSecret: options?.jwtAccessSecret ?? TEST_JWT_SECRET,
    accessTokenTtl: "15m",
    refreshTokenTtlDays: 7,
    cookieSecure: false,
    logLevel: "silent",
    logger: createLogger("silent"),
    enableRateLimit: options?.enableRateLimit ?? false,
  });
}

export async function resetAndSeedTestUsers(ctx: PrismaContext): Promise<{
  staffUser: { id: number; email: string; password: string };
  adminUser: { id: number; email: string; password: string };
}> {
  await ctx.prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "status_history", "inquiries", "refresh_tokens", "users" RESTART IDENTITY CASCADE',
  );

  const staffPassword = "Password123!";
  const adminPassword = "Password123!";

  const staff = await ctx.prisma.user.create({
    data: {
      email: "staff1@cims.local",
      name: "Staff One",
      passwordHash: await hashPassword(staffPassword),
      role: "staff",
    },
  });

  const admin = await ctx.prisma.user.create({
    data: {
      email: "admin@cims.local",
      name: "Admin User",
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
    },
  });

  return {
    staffUser: { id: staff.id, email: staff.email, password: staffPassword },
    adminUser: { id: admin.id, email: admin.email, password: adminPassword },
  };
}

export function extractCookieValue(setCookies: string[] | string | undefined, name: string): string | undefined {
  if (!setCookies) {
    return undefined;
  }
  const list = Array.isArray(setCookies) ? setCookies : [setCookies];
  const prefix = `${name}=`;
  for (const cookie of list) {
    if (cookie.startsWith(prefix)) {
      const valueEnd = cookie.indexOf(";");
      return valueEnd === -1 ? cookie.slice(prefix.length) : cookie.slice(prefix.length, valueEnd);
    }
  }
  return undefined;
}
