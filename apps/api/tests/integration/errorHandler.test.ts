import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaContext } from "../../src/lib/prisma.js";
import { createErrorHandler } from "../../src/middleware/errorHandler.js";
import { notFoundMiddleware } from "../../src/middleware/notFound.js";
import { requestIdMiddleware } from "../../src/middleware/requestId.js";
import { createRequireAuth } from "../../src/middleware/requireAuth.js";
import { requireRole } from "../../src/middleware/requireRole.js";
import { createLogger } from "../../src/utils/logger.js";
import { signAccessToken } from "../../src/utils/tokens.js";
import {
  CSRF_HEADER,
  TEST_JWT_SECRET,
  createTestApp,
  createTestPrismaContext,
  resetAndSeedTestUsers,
} from "../helpers/testContext.js";

describe("Global Error Handler & Role Middleware", () => {
  let ctx: PrismaContext;

  beforeAll(() => {
    ctx = createTestPrismaContext();
  });

  beforeEach(async () => {
    await resetAndSeedTestUsers(ctx);
  });

  afterAll(async () => {
    await ctx.disconnect();
  });

  it("returns JSON 404 NOT_FOUND with requestId for unknown routes", async () => {
    const app = createTestApp(ctx);
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Route not found");
    expect(res.body.error.requestId).toBeTypeOf("string");
  });

  it("returns 400 VALIDATION_ERROR for malformed JSON payloads", async () => {
    const app = createTestApp(ctx);
    const res = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .set("Content-Type", "application/json")
      .send("{bad-json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.requestId).toBeTypeOf("string");
  });

  it("masks unexpected internal errors as 500 INTERNAL_ERROR without leaking details", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get("/boom", () => {
      throw new Error("Sensitive database connection string leaked");
    });
    app.use(notFoundMiddleware);
    app.use(createErrorHandler(createLogger("silent")));

    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
    expect(JSON.stringify(res.body)).not.toContain("Sensitive database");
    expect(res.body.error.requestId).toBeTypeOf("string");
  });

  it("enforces requireRole('admin') returning 403 for staff and 200 for admin", async () => {
    const app = express();
    const cookieParser = (await import("cookie-parser")).default;
    app.use(requestIdMiddleware);
    app.use(cookieParser());
    app.get(
      "/admin-only",
      createRequireAuth(TEST_JWT_SECRET),
      requireRole("admin"),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );
    app.use(createErrorHandler(createLogger("silent")));

    const staffToken = signAccessToken(1, "staff", TEST_JWT_SECRET, "15m");
    const adminToken = signAccessToken(2, "admin", TEST_JWT_SECRET, "15m");

    const staffRes = await request(app)
      .get("/admin-only")
      .set("Cookie", [`access_token=${staffToken}`]);
    expect(staffRes.status).toBe(403);
    expect(staffRes.body.error.code).toBe("FORBIDDEN");

    const adminRes = await request(app)
      .get("/admin-only")
      .set("Cookie", [`access_token=${adminToken}`]);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toEqual({ ok: true });
  });
});
