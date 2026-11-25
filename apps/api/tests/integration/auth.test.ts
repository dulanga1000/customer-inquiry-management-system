import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaContext } from "../../src/lib/prisma.js";
import { hashRefreshToken } from "../../src/utils/tokens.js";
import {
  CSRF_HEADER,
  createTestApp,
  createTestPrismaContext,
  normalizeSetCookieHeader,
  requireCookieValue,
  resetAndSeedTestUsers,
} from "../helpers/testContext.js";

describe("Auth & Health Integration", () => {
  let ctx: PrismaContext;
  let staffUser: { id: number; email: string; password: string };
  let adminUser: { id: number; email: string; password: string };

  beforeAll(() => {
    ctx = createTestPrismaContext();
  });

  beforeEach(async () => {
    const seeded = await resetAndSeedTestUsers(ctx);
    staffUser = seeded.staffUser;
    adminUser = seeded.adminUser;
  });

  afterAll(async () => {
    await ctx.disconnect();
  });

  it("GET /health returns ok when PostgreSQL is reachable", async () => {
    const app = createTestApp(ctx);
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
    expect(res.headers["x-request-id"]).toBeTypeOf("string");
  });

  it("POST /api/auth/login issues HttpOnly cookies and stores SHA-256 refresh token hash", async () => {
    const app = createTestApp(ctx);
    const res = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: staffUser.email, password: staffUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: staffUser.id,
      email: staffUser.email,
      role: "staff",
    });

    const cookies = normalizeSetCookieHeader(res.headers["set-cookie"]);
    const accessCookie = requireCookieValue(cookies, "access_token");
    const refreshCookie = requireCookieValue(cookies, "refresh_token");

    expect(accessCookie).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
    expect(cookies.some((c) => c.includes("HttpOnly") && c.includes("SameSite=Lax"))).toBe(true);

    const stored = await ctx.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshCookie) },
    });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(staffUser.id);
    expect(stored?.revokedAt).toBeNull();
  });

  it("POST /api/auth/login returns generic 401 for wrong password and unknown email", async () => {
    const app = createTestApp(ctx);

    const wrongPass = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: staffUser.email, password: "WrongPassword!" });

    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "nobody@cims.local", password: "Password123!" });

    expect(wrongPass.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPass.body.error.code).toBe("UNAUTHENTICATED");
    expect(wrongPass.body.error.message).toBe("Invalid email or password");
    expect(unknownEmail.body.error.message).toBe("Invalid email or password");
    expect(wrongPass.body.error.requestId).toBeTypeOf("string");
  });

  it("POST /api/auth/login returns 400 VALIDATION_ERROR with field errors for invalid input", async () => {
    const app = createTestApp(ctx);
    const res = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "not-an-email", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toHaveProperty("email");
    expect(res.body.error.fields).toHaveProperty("password");
    expect(res.body.error.requestId).toBeTypeOf("string");
  });

  it("POST /api/auth/login enforces X-Requested-With CSRF header and rate limits repeated attempts", async () => {
    const app = createTestApp(ctx, { enableRateLimit: true });

    const missingCsrf = await request(app)
      .post("/api/auth/login")
      .send({ email: staffUser.email, password: staffUser.password });
    expect(missingCsrf.status).toBe(403);

    for (let i = 0; i < 5; i++) {
      const attempt = await request(app)
        .post("/api/auth/login")
        .set(CSRF_HEADER)
        .send({ email: staffUser.email, password: "bad" });
      expect(attempt.status).toBe(401);
    }

    const blocked = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: staffUser.email, password: "bad" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(blocked.body.error.requestId).toBeTypeOf("string");
  });

  it("GET /api/auth/me requires valid access_token cookie and returns authenticated user", async () => {
    const app = createTestApp(ctx);

    const unauthRes = await request(app).get("/api/auth/me");
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe("UNAUTHENTICATED");

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user).toMatchObject({
      id: adminUser.id,
      email: adminUser.email,
      role: "admin",
    });
  });

  it("POST /api/auth/refresh atomically rotates tokens and revokes entire family on token reuse", async () => {
    const app = createTestApp(ctx);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: staffUser.email, password: staffUser.password })
      .expect(200);

    const initialRefresh = requireCookieValue(loginRes.headers["set-cookie"], "refresh_token");

    // 1. Valid refresh rotates token
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set(CSRF_HEADER)
      .set("Cookie", [`refresh_token=${initialRefresh}`])
      .expect(200);

    const rotatedRefresh = requireCookieValue(refreshRes.headers["set-cookie"], "refresh_token");
    expect(rotatedRefresh).toBeTruthy();
    expect(rotatedRefresh).not.toBe(initialRefresh);

    const oldRecord = await ctx.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(initialRefresh) },
    });
    const newRecord = await ctx.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rotatedRefresh) },
    });
    expect(oldRecord?.revokedAt).not.toBeNull();
    expect(newRecord?.revokedAt).toBeNull();
    expect(newRecord?.familyId).toBe(oldRecord?.familyId);

    // 2. Reusing the old revoked token revokes the entire family and clears cookies
    const reuseRes = await request(app)
      .post("/api/auth/refresh")
      .set(CSRF_HEADER)
      .set("Cookie", [`refresh_token=${initialRefresh}`]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe("UNAUTHENTICATED");

    const rotatedAfterReuse = await ctx.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rotatedRefresh) },
    });
    expect(rotatedAfterReuse?.revokedAt).not.toBeNull();

    // 3. Even the rotated token is now rejected
    const followUpRes = await request(app)
      .post("/api/auth/refresh")
      .set(CSRF_HEADER)
      .set("Cookie", [`refresh_token=${rotatedRefresh}`]);

    expect(followUpRes.status).toBe(401);
  });

  it("POST /api/auth/logout revokes refresh token and clears cookies", async () => {
    const app = createTestApp(ctx);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: staffUser.email, password: staffUser.password })
      .expect(200);

    const accessToken = requireCookieValue(loginRes.headers["set-cookie"], "access_token");
    const refreshToken = requireCookieValue(loginRes.headers["set-cookie"], "refresh_token");

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set(CSRF_HEADER)
      .set("Cookie", [`access_token=${accessToken}`, `refresh_token=${refreshToken}`]);

    expect(logoutRes.status).toBe(204);

    const stored = await ctx.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
    });
    expect(stored?.revokedAt).not.toBeNull();

    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh")
      .set(CSRF_HEADER)
      .set("Cookie", [`refresh_token=${refreshToken}`]);

    expect(refreshAfterLogout.status).toBe(401);
  });
});
