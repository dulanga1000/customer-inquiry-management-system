# Architectural Decision Records (DECISIONS.md)

This document captures the key architectural choices, trade-offs, testing gaps, and AI collaboration notes for the **Customer Inquiry Management System (CIMS)**.

---

## ADR-1: `pnpm` Workspaces Monorepo with `@cims/shared` Zod Contracts

- **Context:** Both `@cims/web` (React Hook Form + client validation) and `@cims/api` (Express request validation) validate the same domain payloads (`loginSchema`, `createInquirySchema`, `updateInquiryStatusSchema`, `listInquiriesQuerySchema`) and share DTO types (`AuthUser`, `InquirySummary`, `InquiryDetail`, `ApiErrorResponse`).
- **Decision:** Use a lightweight `pnpm` workspace (`apps/api`, `apps/web`, `packages/shared`) without Nx or Turborepo overhead. Keep `@cims/shared` dependency-light (Zod + pure TypeScript constants/types) with strict one-way imports (`apps/* -> @cims/shared`).
- **Trade-off:** Updating shared schemas requires building `@cims/shared` (`tsc`) before `node dist/server.js` or Docker builds consume the compiled `dist/` output, which is automated in workspace and Dockerfile build steps.
- **Rejected alternative:** Duplicating Zod schemas in `apps/web` and `apps/api` (risks validation drift) or introducing Nx/Turborepo (unnecessary complexity for 3 packages).

---

## ADR-2: Prisma ORM (v7.10.1 + `@prisma/adapter-pg`) Behind a Strict Repository Pattern

- **Context:** The backend requires type-safe PostgreSQL access, versioned migrations (`0001_init`), `CITEXT` case-insensitive emails, SQL `CHECK` constraints, and atomic transactions for status changes and token rotation.
- **Decision:** Use Prisma ORM v7.10.1 with `@prisma/adapter-pg` (`pg.Pool`) strictly encapsulated inside `*.repository.ts` classes (`AuthRepository`, `InquiryRepository`). Controllers and services never import `PrismaClient` directly; services receive repositories via constructor dependency injection and `createApp({ prisma, ... })` allows Supertest integration tests without binding a network port.
- **Trade-off:** Prisma 7 generates client code into `apps/api/src/generated/prisma` (requiring `prisma generate` during builds) and uses a driver adapter (`PrismaPg`) rather than an implicit binary query engine. Multi-step writes (`rotateRefreshToken`, `updateStatusWithOptimisticLock`) run inside `prisma.$transaction()` to guarantee atomicity.
- **Rejected alternative:** Calling Prisma directly inside Express controllers/routes (breaks layering and unit testability) or raw hand-written `pg` SQL strings everywhere (higher boilerplate for relation mapping and pagination).

---

## ADR-3: Dual-Token Cookie Authentication with Refresh Token Rotation & Reuse Detection

- **Context:** Storing JWTs in `localStorage` exposes sessions to XSS, while long-lived stateless JWTs cannot be revoked server-side.
- **Decision:** Issue two `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies:
  1. `access_token`: 15-minute signed JWT (`{ sub, role }`).
  2. `refresh_token`: 7-day cryptographically random opaque token stored as a SHA-256 hash in `refresh_tokens`, grouped by `family_id`.
- **Rotation & Reuse Detection:** `POST /api/auth/refresh` runs inside `prisma.$transaction()`, conditionally revokes the presented token (`updateMany` where `revokedAt: null`), and issues a new pair under the same `family_id`. If an already-revoked token is presented (or a concurrent race hits an already-revoked row), the repository commits a family-wide revocation (`family_id`), and the controller clears both cookies and returns `401 UNAUTHENTICATED`.
- **Frontend Single-Flight Refresh:** `apps/web/src/lib/apiClient.ts` shares a single in-flight `refreshInFlight` promise so concurrent `401` responses from parallel queries trigger only one `POST /api/auth/refresh` call rather than racing into false reuse detection.
- **CSRF Mitigation:** State-changing requests under `/api` enforce `SameSite=Lax` cookies, `X-Requested-With: cims`, and `application/json` content-type when a body is present.

---

## ADR-4: Server-Enforced State Machine, Optimistic Locking, IDOR Ownership, and Audit History

- **Context:** Multiple staff members or browser tabs may view and update the same inquiry, and staff must never access inquiries they neither created nor are assigned to.
- **Decision:**
  - **State Machine:** Allowed transitions (`new -> in_progress`, `in_progress -> resolved`, `resolved -> in_progress`) live in a single backend rule (`statusTransitions.ts`), returning `422 INVALID_TRANSITION` with `meta.allowedTransitions`. API payloads return `allowedTransitions` so the UI renders valid actions without duplicating transition logic.
  - **Optimistic Locking:** `PATCH /api/inquiries/:id/status` requires `updatedAt` and executes a conditional `updateMany({ where: { id, updatedAt } })` inside `prisma.$transaction()`. If 0 rows update on an accessible inquiry, the API throws `409 STALE_DATA`, and the UI offers a Reload action.
  - **Atomic Audit History:** Every successful status update writes an immutable `StatusHistory` row inside the same `prisma.$transaction()`.
  - **IDOR Prevention:** Every inquiry read/write passes through `InquiryRepository.findAccessibleInquiry(id, user)` (`admin` sees all; `staff` sees only `createdBy = user.id` or `assignedTo = user.id`). Unauthorized and non-existent IDs both return `404 NOT_FOUND`.
  - **Duplicate Guard:** Global submissions across all staff/admin users matching normalized `contact` + `subject` within 24 hours return `409 DUPLICATE_INQUIRY` with `meta: { canViewExisting, existingInquiryId? }`.
- **Accepted Trade-off:** No real-time WebSocket or SSE push updates; stale views are mitigated by TanStack Query `refetchOnWindowFocus: true` and optimistic locking on write.

---

## Known Testing Gaps & Next Improvements

- **Current Coverage:**
  - **Backend (`@cims/api`):** 26 tests passing across 5 files (`tests/unit/statusTransitions.test.ts` [3], `tests/integration/auth.test.ts` [8], `tests/integration/errorHandler.test.ts` [4], `tests/integration/inquiries.test.ts` [7], `tests/integration/users.test.ts` [4]) exercising Supertest HTTP routes, cookie auth & token reuse detection, admin user provisioning, IDOR access control, 24h global duplicate checks, state machine transitions, and `updatedAt` optimistic locking against PostgreSQL.
  - **Frontend (`@cims/web`):** 4 Vitest + React Testing Library (`jsdom`) interaction tests passing across 2 files (`src/app/(workspace)/inquiries/[id]/inquiry-detail.test.tsx` [2] covering allowed status transitions, live updates, and `409 STALE_DATA` reload recovery; `src/app/(workspace)/inquiries/new/new-inquiry.test.tsx` [2] covering `409 DUPLICATE_INQUIRY` with `canViewExisting` `true` vs `false`).
  - **Static Verification:** `pnpm -r typecheck` (`@cims/shared`, `@cims/api`, `@cims/web`) and `pnpm --filter @cims/web lint` pass with zero errors.
- **Remaining Testing Gaps:**
  - **End-to-End Browser Tests (Playwright):** No full-stack Playwright suite currently drives real browsers across the live Docker Compose stack (`web` + `api` + `db`).
  - **Real Cross-Browser Cookie & Refresh Behavior:** Frontend tests stub `fetch`, so real browser `HttpOnly` / `SameSite=Lax` / `Secure` cookie handling and multi-tab single-flight `POST /api/auth/refresh` recovery across Safari/Firefox/Chromium are verified only via manual smoke testing and backend Supertest cookie checks.
  - **Load & Rate-Limit Stress Testing:** Burst concurrency on `POST /api/auth/login` rate limiting, pagination under high row volume, and parallel optimistic-lock contention are not yet benchmarked under load.
  - **Additional Frontend Component Coverage & Accessibility Audits:** Component interaction tests for `LoginForm`, `InquiryList` filtering/pagination, `AssigneeSelect`, and `TeamManagement`, plus automated axe-core accessibility audits, remain to be added.
- **Next Improvements:** Add Playwright E2E coverage over the Docker stack, expand RTL coverage for `LoginForm`, `InquiryList`, and `TeamManagement`, add automated axe-core checks, and schedule periodic cleanup for expired/revoked `refresh_tokens` rows.

---

## Transparent AI Usage Note

AI assistance was used for scaffolding, test generation, and documentation. Key changes made during review against `docs/SRS.md` and `AGENTS.md`:
- **Rejected/Aligned:** Rejected initial `UUID` primary keys, `InquiryPriority` field, `/api/v1/*` prefix, public unauthenticated `POST /inquiries`, and `OPEN`/`CLOSED` statuses in favor of `docs/SRS.md` `SERIAL` integer IDs, `/api/*` routes, `requireAuth` + `findAccessibleInquiry` ownership enforcement, and `new`/`in_progress`/`resolved` transitions with `updatedAt` optimistic locking.
- **Modified:** Updated `AGENTS.md` and `docs/SRS.md` explicitly when adopting Prisma ORM v7.10.1 (`@prisma/adapter-pg`) inside repositories, and fixed Prisma `$transaction` reuse-detection behavior so `family_id` revocation commits instead of rolling back on error.
