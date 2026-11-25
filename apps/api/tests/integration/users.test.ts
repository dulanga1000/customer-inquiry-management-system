import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaContext } from "../../src/lib/prisma.js";
import {
  CSRF_HEADER,
  type SeededUser,
  createTestApp,
  createTestPrismaContext,
  resetAndSeedTestUsers,
} from "../helpers/testContext.js";

async function loginAs(app: ReturnType<typeof createTestApp>, user: SeededUser) {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .set(CSRF_HEADER)
    .send({ email: user.email, password: user.password })
    .expect(200);
  return agent;
}

describe("Admin User Provisioning (/api/users)", () => {
  let ctx: PrismaContext;
  let staffUser: SeededUser;
  let adminUser: SeededUser;

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

  it("rejects unauthenticated requests with 401 and staff users with 403 FORBIDDEN", async () => {
    const app = createTestApp(ctx);

    const unauthGet = await request(app).get("/api/users");
    const unauthPost = await request(app).post("/api/users").set(CSRF_HEADER).send({});
    expect(unauthGet.status).toBe(401);
    expect(unauthPost.status).toBe(401);

    const staffAgent = await loginAs(app, staffUser);
    const staffGet = await staffAgent.get("/api/users");
    const staffPost = await staffAgent
      .post("/api/users")
      .set(CSRF_HEADER)
      .send({
        name: "Unauthorized Provision",
        email: "newstaff@cims.local",
        password: "Password123!",
        role: "staff",
      });

    expect(staffGet.status).toBe(403);
    expect(staffGet.body.error.code).toBe("FORBIDDEN");
    expect(staffPost.status).toBe(403);
    expect(staffPost.body.error.code).toBe("FORBIDDEN");
  });

  it("allows admin to list sanitized users without exposing passwordHash", async () => {
    const app = createTestApp(ctx);
    const adminAgent = await loginAs(app, adminUser);

    const res = await adminAgent.get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(3);
    for (const user of res.body.data.users as Array<Record<string, unknown>>) {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("createdAt");
      expect(user).not.toHaveProperty("passwordHash");
    }
  });

  it("allows admin to provision a new staff user (201) who can then sign in", async () => {
    const app = createTestApp(ctx);
    const adminAgent = await loginAs(app, adminUser);

    const createRes = await adminAgent
      .post("/api/users")
      .set(CSRF_HEADER)
      .send({
        name: "  Kavindi Perera  ",
        email: "  Kavindi@CIMS.local ",
        password: "StrongPassword123!",
        role: "staff",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.user).toMatchObject({
      name: "Kavindi Perera",
      email: "kavindi@cims.local",
      role: "staff",
    });
    expect(createRes.body.data.user).not.toHaveProperty("passwordHash");

    // Newly provisioned user can immediately log in
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "kavindi@cims.local", password: "StrongPassword123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe("kavindi@cims.local");
  });

  it("returns 400 VALIDATION_ERROR for invalid user input and 409 EMAIL_TAKEN for duplicate email", async () => {
    const app = createTestApp(ctx);
    const adminAgent = await loginAs(app, adminUser);

    const invalidRes = await adminAgent
      .post("/api/users")
      .set(CSRF_HEADER)
      .send({
        name: "A",
        email: "invalid-email",
        password: "short",
        role: "superadmin",
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidRes.body.error.fields).toMatchObject({
      name: expect.any(Array),
      email: expect.any(Array),
      password: expect.any(Array),
      role: expect.any(Array),
    });

    const duplicateRes = await adminAgent
      .post("/api/users")
      .set(CSRF_HEADER)
      .send({
        name: "Duplicate User",
        email: "STAFF1@cims.local",
        password: "Password123!",
        role: "staff",
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe("EMAIL_TAKEN");
    expect(duplicateRes.body.error.fields).toHaveProperty("email");
  });
});
