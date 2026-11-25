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

describe("Inquiries CRUD, Ownership, State Machine & Optimistic Locking", () => {
  let ctx: PrismaContext;
  let staffUser: SeededUser;
  let staffTwoUser: SeededUser;
  let adminUser: SeededUser;

  beforeAll(() => {
    ctx = createTestPrismaContext();
  });

  beforeEach(async () => {
    const seeded = await resetAndSeedTestUsers(ctx);
    staffUser = seeded.staffUser;
    staffTwoUser = seeded.staffTwoUser;
    adminUser = seeded.adminUser;
  });

  afterAll(async () => {
    await ctx.disconnect();
  });

  it("rejects unauthenticated requests to all inquiry endpoints with 401", async () => {
    const app = createTestApp(ctx);

    const listRes = await request(app).get("/api/inquiries");
    const createRes = await request(app).post("/api/inquiries").set(CSRF_HEADER).send({});
    const getRes = await request(app).get("/api/inquiries/1");
    const patchRes = await request(app)
      .patch("/api/inquiries/1/status")
      .set(CSRF_HEADER)
      .send({ status: "in_progress", updatedAt: new Date().toISOString() });

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(getRes.status).toBe(401);
    expect(patchRes.status).toBe(401);
  });

  it("creates an inquiry as 'new' deriving createdBy from session and rejects invalid input with 400", async () => {
    const app = createTestApp(ctx);
    const staffAgent = await loginAs(app, staffUser);

    const invalidRes = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "A",
        contact: "bad",
        subject: "Hi",
        description: "Too short",
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidRes.body.error.fields).toMatchObject({
      customerName: expect.any(Array),
      contact: expect.any(Array),
      subject: expect.any(Array),
      description: expect.any(Array),
    });

    const createRes = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Nimal Jayawardena",
        contact: "nimal@example.com",
        subject: "Damaged coffee grinder delivery",
        description: "Customer received a cracked hopper lid on order #4412.",
        createdBy: staffTwoUser.id, // Must be ignored in favor of req.user
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.inquiry).toMatchObject({
      customerName: "Nimal Jayawardena",
      contact: "nimal@example.com",
      subject: "Damaged coffee grinder delivery",
      status: "new",
      createdBy: { id: staffUser.id, email: staffUser.email },
      allowedTransitions: ["in_progress"],
      statusHistory: [],
    });
  });

  it("rejects duplicate contact + subject from the same user within 5 minutes with 409 DUPLICATE_INQUIRY", async () => {
    const app = createTestApp(ctx);
    const staffAgent = await loginAs(app, staffUser);
    const staffTwoAgent = await loginAs(app, staffTwoUser);

    const first = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Kamal Silva",
        contact: "kamal@example.com",
        subject: "Billing invoice mismatch",
        description: "Invoice #882 shows double shipping fee applied.",
      })
      .expect(201);

    const existingId = first.body.data.inquiry.id as number;

    const duplicate = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Kamal Silva",
        contact: "  KAMAL@example.com ",
        subject: "  Billing   invoice mismatch ",
        description: "Resubmitting the exact same billing issue after a moment.",
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_INQUIRY");
    expect(duplicate.body.error.meta).toEqual({ existingInquiryId: existingId });

    // A different staff user submitting the same contact + subject is allowed
    const otherUserRes = await staffTwoAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Kamal Silva",
        contact: "kamal@example.com",
        subject: "Billing invoice mismatch",
        description: "Recorded independently by another staff member.",
      });

    expect(otherUserRes.status).toBe(201);
  });

  it("enforces IDOR ownership returning 404 for unauthorized staff and 400 for non-integer IDs", async () => {
    const app = createTestApp(ctx);
    const staffAgent = await loginAs(app, staffUser);
    const staffTwoAgent = await loginAs(app, staffTwoUser);
    const adminAgent = await loginAs(app, adminUser);

    const created = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Saman Kumara",
        contact: "+94771234567",
        subject: "Warranty claim request",
        description: "Espresso pump pressure dropped after 3 months of use.",
      })
      .expect(201);

    const inquiryId = created.body.data.inquiry.id as number;
    const updatedAt = created.body.data.inquiry.updatedAt as string;

    // Non-integer IDs return 400 VALIDATION_ERROR
    const badIdRes = await staffAgent.get("/api/inquiries/not-an-int");
    expect(badIdRes.status).toBe(400);
    expect(badIdRes.body.error.code).toBe("VALIDATION_ERROR");
    expect(badIdRes.body.error.fields).toHaveProperty("id");

    // Staff 2 cannot read or update Staff 1's inquiry (404 NOT_FOUND, no existence leak)
    const forbiddenRead = await staffTwoAgent.get(`/api/inquiries/${inquiryId}`);
    expect(forbiddenRead.status).toBe(404);
    expect(forbiddenRead.body.error.code).toBe("NOT_FOUND");

    const forbiddenPatch = await staffTwoAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "in_progress", updatedAt });
    expect(forbiddenPatch.status).toBe(404);
    expect(forbiddenPatch.body.error.code).toBe("NOT_FOUND");

    // Non-existent ID also returns 404 NOT_FOUND
    const missingRead = await adminAgent.get("/api/inquiries/999999");
    expect(missingRead.status).toBe(404);

    // Assigned staff CAN access the inquiry
    await ctx.prisma.inquiry.update({
      where: { id: inquiryId },
      data: { assignedTo: staffTwoUser.id },
    });
    const assignedRead = await staffTwoAgent.get(`/api/inquiries/${inquiryId}`);
    expect(assignedRead.status).toBe(200);
    expect(assignedRead.body.data.inquiry.id).toBe(inquiryId);

    // Admin can access any inquiry
    const adminRead = await adminAgent.get(`/api/inquiries/${inquiryId}`);
    expect(adminRead.status).toBe(200);
  });

  it("supports scoped listing, status filter, ?q= case-insensitive search, and pagination", async () => {
    const app = createTestApp(ctx);
    const staffAgent = await loginAs(app, staffUser);
    const staffTwoAgent = await loginAs(app, staffTwoUser);
    const adminAgent = await loginAs(app, adminUser);

    const first = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Dilani Fernando",
        contact: "dilani@coffee.lk",
        subject: "Roast subscription pause",
        description: "Wants to pause monthly bean delivery for two weeks.",
      })
      .expect(201);

    await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Kasun Bandara",
        contact: "0719876543",
        subject: "Wholesale pricing request",
        description: "Inquiring about cafe bulk pricing for Arabica medium roast.",
      })
      .expect(201);

    await staffTwoAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Ruwan Perera",
        contact: "ruwan@example.com",
        subject: "Machine calibration",
        description: "Needs technician visit for grinder burr alignment.",
      })
      .expect(201);

    // Transition first inquiry to in_progress
    await staffAgent
      .patch(`/api/inquiries/${first.body.data.inquiry.id}/status`)
      .set(CSRF_HEADER)
      .send({
        status: "in_progress",
        updatedAt: first.body.data.inquiry.updatedAt,
      })
      .expect(200);

    // Staff 1 sees only their 2 inquiries, paginated
    const staffList = await staffAgent.get("/api/inquiries?page=1&limit=1");
    expect(staffList.status).toBe(200);
    expect(staffList.body.data).toHaveLength(1);
    expect(staffList.body.meta).toEqual({
      total: 2,
      page: 1,
      limit: 1,
      totalPages: 2,
    });

    // Search via ?q= across customerName / subject / contact (case-insensitive)
    const searchRes = await staffAgent.get("/api/inquiries?q=ARABICA");
    expect(searchRes.status).toBe(200);
    // Notice 'Arabica' is only in description; search is over customerName, subject, contact per SRS 4.3
    expect(searchRes.body.data).toHaveLength(0);

    const searchByCustomer = await staffAgent.get("/api/inquiries?q=dilani");
    expect(searchByCustomer.status).toBe(200);
    expect(searchByCustomer.body.data).toHaveLength(1);
    expect(searchByCustomer.body.data[0].customerName).toBe("Dilani Fernando");

    // Filter by status + empty query param handling
    const filteredRes = await staffAgent.get("/api/inquiries?status=in_progress&q=");
    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.data).toHaveLength(1);
    expect(filteredRes.body.data[0].status).toBe("in_progress");

    // Admin sees all 3 inquiries
    const adminList = await adminAgent.get("/api/inquiries");
    expect(adminList.status).toBe(200);
    expect(adminList.body.meta.total).toBe(3);
  });

  it("enforces state transitions, records StatusHistory atomically, and rejects stale updatedAt with 409", async () => {
    const app = createTestApp(ctx);
    const staffAgent = await loginAs(app, staffUser);
    const adminAgent = await loginAs(app, adminUser);

    const created = await staffAgent
      .post("/api/inquiries")
      .set(CSRF_HEADER)
      .send({
        customerName: "Tharindu Dias",
        contact: "tharindu@example.com",
        subject: "Missing filter basket",
        description: "Portafilter box was missing the 18g precision basket.",
      })
      .expect(201);

    const inquiryId = created.body.data.inquiry.id as number;
    const v1UpdatedAt = created.body.data.inquiry.updatedAt as string;

    // 1. Invalid transition new -> resolved returns 422 INVALID_TRANSITION with allowedTransitions
    const invalidRes = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "resolved", updatedAt: v1UpdatedAt });

    expect(invalidRes.status).toBe(422);
    expect(invalidRes.body.error.code).toBe("INVALID_TRANSITION");
    expect(invalidRes.body.error.meta).toEqual({ allowedTransitions: ["in_progress"] });

    // 2. Valid transition: new -> in_progress
    const step1 = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "in_progress", updatedAt: v1UpdatedAt })
      .expect(200);

    const v2UpdatedAt = step1.body.data.inquiry.updatedAt as string;
    expect(step1.body.data.inquiry.status).toBe("in_progress");
    expect(step1.body.data.inquiry.allowedTransitions).toEqual(["resolved"]);
    expect(step1.body.data.inquiry.statusHistory).toHaveLength(1);

    // 3. Stale updatedAt (v1UpdatedAt) fails with 409 STALE_DATA and writes no history
    const staleRes = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "resolved", updatedAt: v1UpdatedAt });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe("STALE_DATA");

    // 4. Valid transition: in_progress -> resolved (by admin)
    const step2 = await adminAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "resolved", updatedAt: v2UpdatedAt })
      .expect(200);

    const v3UpdatedAt = step2.body.data.inquiry.updatedAt as string;
    expect(step2.body.data.inquiry.status).toBe("resolved");
    expect(step2.body.data.inquiry.allowedTransitions).toEqual(["in_progress"]);

    // 5. Reopen: resolved -> in_progress
    const step3 = await staffAgent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "in_progress", updatedAt: v3UpdatedAt })
      .expect(200);

    expect(step3.body.data.inquiry.status).toBe("in_progress");
    expect(step3.body.data.inquiry.statusHistory).toHaveLength(3);
    expect(
      step3.body.data.inquiry.statusHistory.map(
        (h: { fromStatus: string; toStatus: string; changedBy: { id: number } }) => ({
          from: h.fromStatus,
          to: h.toStatus,
          by: h.changedBy.id,
        }),
      ),
    ).toEqual([
      { from: "new", to: "in_progress", by: staffUser.id },
      { from: "in_progress", to: "resolved", by: adminUser.id },
      { from: "resolved", to: "in_progress", by: staffUser.id },
    ]);
  });
});
