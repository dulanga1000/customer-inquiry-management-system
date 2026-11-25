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

export interface SeededUser {
  id: number;
  email: string;
  password: string;
}

export async function resetAndSeedTestUsers(ctx: PrismaContext): Promise<{
  staffUser: SeededUser;
  staffTwoUser: SeededUser;
  adminUser: SeededUser;
}> {
  await ctx.prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "status_history", "inquiries", "refresh_tokens", "users" RESTART IDENTITY CASCADE',
  );

  const defaultPassword = "Password123!";
  const passwordHash = await hashPassword(defaultPassword);

  const staff = await ctx.prisma.user.create({
    data: {
      email: "staff1@cims.local",
      name: "Staff One",
      passwordHash,
      role: "staff",
    },
  });

  const staffTwo = await ctx.prisma.user.create({
    data: {
      email: "staff2@cims.local",
      name: "Staff Two",
      passwordHash,
      role: "staff",
    },
  });

  const admin = await ctx.prisma.user.create({
    data: {
      email: "admin@cims.local",
      name: "Admin User",
      passwordHash,
      role: "admin",
    },
  });

  return {
    staffUser: { id: staff.id, email: staff.email, password: defaultPassword },
    staffTwoUser: { id: staffTwo.id, email: staffTwo.email, password: defaultPassword },
    adminUser: { id: admin.id, email: admin.email, password: defaultPassword },
  };
}

export function normalizeSetCookieHeader(
  setCookies: string[] | string | undefined,
): string[] {
  if (!setCookies) {
    return [];
  }
  return Array.isArray(setCookies) ? setCookies : [setCookies];
}

export function extractCookieValue(
  setCookies: string[] | string | undefined,
  name: string,
): string | undefined {
  const list = normalizeSetCookieHeader(setCookies);
  const prefix = `${name}=`;
  for (const cookie of list) {
    if (cookie.startsWith(prefix)) {
      const valueEnd = cookie.indexOf(";");
      return valueEnd === -1 ? cookie.slice(prefix.length) : cookie.slice(prefix.length, valueEnd);
    }
  }
  return undefined;
}

export function requireCookieValue(
  setCookies: string[] | string | undefined,
  name: string,
): string {
  const value = extractCookieValue(setCookies, name);
  if (!value) {
    throw new Error(`Expected cookie '${name}' in Set-Cookie header`);
  }
  return value;
}
