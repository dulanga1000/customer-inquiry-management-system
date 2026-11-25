# Software Requirements Specification (SRS)

## Customer Inquiry Management System (CIMS)

*Version 2.0 | Prepared for the Coffee Ninja (Pvt) Ltd Fullstack Technical Assessment | Stack: Next.js, Node.js/Express, PostgreSQL*

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements, architecture, design patterns, security controls, error handling pipeline, and engineering standards for the Customer Inquiry Management System (CIMS). It is the single reference used to design, build, test, and explain the system.

### 1.2 Problem Statement

A service business tracks customer inquiries in chat messages and spreadsheets. Staff lose track of who handles a request, whether it was addressed, and what happened last. CIMS replaces this with one reliable workflow: **sign in, record an inquiry, find it later, move it through its lifecycle.**

### 1.3 Scope

**In scope:** staff sign-in (seeded accounts), short-lived JWT + rotating refresh token auth with reuse detection, inquiry capture, inquiry list with search and filter, inquiry detail, status lifecycle (`new`, `in_progress`, `resolved`), status history, ownership-based access control, shared validation, stale-data handling, global error handling, tests, and documentation.

**Out of scope:** public registration, email/SMS, payments, production hosting, complex permissions, elaborate visual design, and real-time push updates.

### 1.4 Definitions

| Term | Meaning |
| --- | --- |
| Inquiry | A customer request recorded by staff |
| Staff | Signed-in employee with the `staff` role |
| Admin | Signed-in employee with the `admin` role; can view and manage all inquiries |
| Stale data | A UI view older than the database state |
| Optimistic locking | Rejecting an update if the record changed since the client loaded it |
| Token family | A group of rotated refresh tokens originating from a single login session |
| Reuse detection | Revoking an entire token family if an already-revoked refresh token is presented |
| OWASP ASVS | Application Security Verification Standard |

### 1.5 References

OWASP Top 10 (2021), OWASP ASVS 4.x, OWASP Cheat Sheet Series, REST API conventions (RFC 9110), 12-Factor App, WCAG 2.1 AA (basic).

---

## 2. Overall Description

### 2.1 Users

| Role | Capabilities |
| --- | --- |
| Staff | Create inquiries; view and update inquiries they created or are assigned to |
| Admin | All staff capabilities on every inquiry; may assign inquiries |

### 2.2 Operating Environment

Modern evergreen browsers; Node.js 20 LTS; PostgreSQL 15+ (local via Docker Compose or hosted PostgreSQL such as Supabase); `pnpm` workspaces.

### 2.3 Assumptions and Constraints

- Accounts are seeded; no public registration or password reset.
- Single-tenant, single-region, low volume (hundreds to thousands of inquiries).
- Effort budget is approximately 10 to 12 hours, prioritizing depth and reliability over feature count.
- Frontend must be React or Next.js; backend must be Node.js with Express; database must be PostgreSQL.

---

## 3. Technology Stack, Architecture, and Design Patterns

### 3.1 Technology Choices

| Layer | Technology | Reason |
| --- | --- | --- |
| Workspace | `pnpm` workspaces | Monorepo sharing Zod schemas/types without Nx/Turborepo overhead |
| Frontend | Next.js (App Router) + React + TypeScript | Routing, typed components, assessment requirement |
| Frontend data | TanStack Query | Caching, loading/error states, refetch on focus (reduces stale data) |
| Frontend forms | React Hook Form + Zod (`zodResolver`) | Shared validation schemas, per-field errors |
| Styling & UI | Tailwind CSS + `shadcn/ui` + Sonner | Accessible Radix primitives styled with Tailwind; fast, consistent UI |
| Backend | Node.js 20 + Express + TypeScript | Assessment requirement, typed contracts |
| Validation | Zod (in `packages/shared`) | Single source of truth for schemas and inferred TypeScript types |
| DB access | Prisma ORM (v7.10.1) with `@prisma/adapter-pg` | Type-safe, parameterized queries strictly encapsulated inside `*.repository.ts` |
| Migrations | Prisma Migrate (`apps/api/prisma/migrations`) | Forward-only, versioned SQL migrations managed by Prisma CLI |
| Auth | `bcrypt` (cost 12) + 15-min Access JWT + rotating Refresh Token (SHA-256 hashed in Postgres) in `HttpOnly` cookies | Backend-enforced auth with reuse detection and server-side revocation |
| Security middleware | `helmet`, `cors` (allow-list), `express-rate-limit`, `cookie-parser` | OWASP hardening |
| Logging | `pino` + `pino-http` | Structured JSON logs with per-request `requestId` |
| Testing | Vitest, Supertest, React Testing Library, MSW | Backend unit/integration, UI state, and API-mock coverage |
| Quality | ESLint, Prettier, Husky + lint-staged, TypeScript strict | Consistent, clean code |
| DevOps | Docker Compose (Postgres), `.env.example`, GitHub Actions CI | Simple local setup and repeatable checks |

### 3.2 System Flow

```text
Browser (Next.js UI + TanStack Query + apiClient)
   | HTTPS, JSON, HttpOnly cookies (access_token, refresh_token), X-Requested-With
   v
Express API
   1. requestId / pino-http / helmet / cors / rateLimit / cookieParser
   2. requireAuth        (verify 15-min access JWT, attach req.user)
   3. validate(schema)   (body, params, query via Zod)
   4. Controller         (HTTP only: parse input, call service, send response)
   5. Service            (business rules: access, transitions, duplicates, token rotation)
   6. Repository         (Prisma ORM + prisma.$transaction only)
   v
PostgreSQL (users, refresh_tokens, inquiries, status_history)
   ^
   | errors thrown as AppError -> central errorHandler -> { error: { code, message, fields?, meta?, requestId } }
```

### 3.3 Layering Rule

| Layer | Job | Must Not |
| --- | --- | --- |
| Route | Maps URL and method to a controller, attaches middleware | Contain logic |
| Controller | Reads the request, calls the service, sends the response | Contain SQL, business rules, or ad-hoc error responses |
| Service | Enforces business rules (access, transitions, duplicates, auth) | Know about `req` or `res` |
| Repository | Executes Prisma ORM queries and `prisma.$transaction` inside `*.repository.ts` | Decide permissions or business rules |

### 3.4 Architecture Style and Design Patterns

**Overall style:** Layered monolith (client-server REST API) organised by feature (`auth/`, `inquiries/`). Full Clean/Hexagonal architecture, DDD, microservices, and event buses are intentionally avoided as overkill. Only constructor-based dependency injection is borrowed so services depend on repositories passed in and remain easy to unit test.

**OOP vs. Functional (Hybrid):**
- **Classes:** Used where there is a concrete reason—`AppError extends Error`, `ApiError extends Error`, and service/repository classes (`InquiryService`, `InquiryRepository`, `AuthService`, `RefreshTokenRepository`) with dependencies injected via the constructor.
- **Plain functions:** Used for Express middleware (`requireAuth`, `validate(schema)`, `asyncHandler`), status transition rules, and utilities.
- **Frontend:** Function components and custom hooks only (no classes). Server data lives in TanStack Query; local UI state lives in components.

| Pattern | Where Used in CIMS |
| --- | --- |
| Layered architecture | Route → Middleware → Controller → Service → Repository → PostgreSQL |
| Repository | All database access isolated per entity via Prisma (`users`, `refresh_tokens`, `inquiries`) |
| Service layer | Business rules separated from HTTP transport |
| Dependency injection | `new InquiryService(inquiryRepo)` and `createApp({ prisma })` so tests can swap dependencies |
| Middleware (Chain of Responsibility) | `requestId`, `requireAuth`, `validate`, `rateLimit`, `errorHandler` |
| Factory function | `validate(schema)` returns middleware; `createApp({ prisma })` builds the Express app |
| State machine | Single status transition map (`new -> in_progress -> resolved`, with reopen) |
| Singleton (module-level) | One shared `PrismaClient` (via `@prisma/adapter-pg` + `pg.Pool`) and one `pino` logger |
| DTO / Schema validation | Shared Zod schemas in `packages/shared` define API contracts |
| Adapter / Wrapper | Frontend `apiClient` hides `fetch`, single-flight 401 refresh retry, and error normalization |
| Custom hooks | `useAuth`, `useInquiries`, `useInquiry`, `useCreateInquiry`, `useUpdateStatus` |
| Central error handling | Single `AppError` + `errorHandler` (backend) and `ApiError` + `QueryCache` (frontend) |

**Patterns explicitly avoided:** Abstract factories, CQRS, event sourcing, generic base repositories, and plugin systems.  
**Rule of thumb:** Add a pattern only when you can finish the sentence: *"I used X because without it, Y would be messy."*

---

## 4. Functional Requirements

### 4.1 Authentication (FR-AUTH)

- **FR-AUTH-1:** User signs in with email and password.
- **FR-AUTH-2:** On success, the server issues two `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookies:
  - **Access token (`access_token`):** Short-lived JWT (15 minutes) containing `{ sub, role }`.
  - **Refresh token (`refresh_token`):** Cryptographically random opaque token (7 days), stored as a SHA-256 hash in PostgreSQL under a `family_id`.
- **FR-AUTH-3:** Every `/api/inquiries/**` route requires a valid access token, enforced by backend middleware (`requireAuth`).
- **FR-AUTH-4 (Rotation & Reuse Detection):** `POST /api/auth/refresh` validates the refresh cookie inside a database transaction, marks the presented token as revoked (`revoked_at = now()`), and issues a new access + refresh token pair under the same `family_id`. If an already-revoked refresh token is presented (reuse detected), the server immediately revokes **all** tokens sharing that `family_id`, clears both cookies, and returns `401 UNAUTHENTICATED`.
- **FR-AUTH-5:** `GET /api/auth/me` returns the current user; `POST /api/auth/logout` revokes the current refresh token in PostgreSQL and clears both cookies.
- **FR-AUTH-6:** Login failures return one generic message (`"Invalid email or password"`) regardless of whether the email exists or the password is wrong.
- **FR-AUTH-7:** Login and refresh endpoints are rate limited (e.g., 5 login attempts per 15 minutes per IP and email).

### 4.2 Inquiry Capture (FR-CAP)

- **FR-CAP-1:** Signed-in user creates an inquiry with customer name, contact, subject, and description.
- **FR-CAP-2:** New inquiries start as `new`; `created_by` is set from the authenticated user (never taken from the request body).
- **FR-CAP-3:** Required fields and limits: customer name 2–100 chars; contact must be a valid email or phone number; subject 3–150 chars; description 10–2000 chars. All inputs are trimmed.
- **FR-CAP-4 (Duplicate policy):** If any staff or admin user submits the same normalized contact + subject within 24 hours (globally across all users), the API returns `409 DUPLICATE_INQUIRY` with `meta: { canViewExisting, existingInquiryId? }` (`existingInquiryId` is included only when `canViewExisting` is `true` per Section 5.1). The UI disables the submit button while saving and displays a link to the existing record only when `canViewExisting` is `true`.

### 4.3 Inquiry Overview (FR-LIST)

- **FR-LIST-1:** List shows only inquiries the user is permitted to access (see Section 5.1).
- **FR-LIST-2:** Each row shows subject, customer name, status badge (text + color), last updated timestamp, and owner.
- **FR-LIST-3:** Filter by status and free-text search over customer name, subject, and contact (case-insensitive, parameterized `ILIKE`).
- **FR-LIST-4:** Server-side pagination (default 20, max 100) sorted by `updated_at` descending.

### 4.4 Inquiry Detail and Lifecycle (FR-LIFE)

- **FR-LIFE-1:** User opens an inquiry by ID and sees all fields plus chronological status history (who, from, to, when).
- **FR-LIFE-2:** User changes status among `new`, `in_progress`, and `resolved` following the state machine in Section 5.2.
- **FR-LIFE-3:** Every successful status change writes a `status_history` row in the same database transaction (`prisma.$transaction`).
- **FR-LIFE-4:** Status updates must include the `updatedAt` value the client last saw (optimistic locking, see Section 5.4).

---

## 5. Business Rules (Engineering Judgement)

### 5.1 Ownership and Access

A **staff** user can access an inquiry only if `created_by = user.id` or `assigned_to = user.id`. An **admin** can access all inquiries. This rule lives in a single function, `findAccessibleInquiry(id, user)`, used by every read and write operation. Both inaccessible and non-existent records return **`404 NOT_FOUND`** so the API never leaks whether an ID exists.

### 5.2 Status Transitions

| From | Allowed to |
| --- | --- |
| `new` | `in_progress` |
| `in_progress` | `resolved` (`new` is **not** allowed) |
| `resolved` | `in_progress` (reopen) |

Any other transition (e.g., `new` → `resolved`, or same-status change) returns `422 INVALID_TRANSITION` listing the allowed options. The transition map is a single constant in the service layer, and the API returns `allowedTransitions` on the inquiry payload so the UI renders only valid action buttons without duplicating rules.

### 5.3 Customer Input Policy

Missing or invalid fields return `400 VALIDATION_ERROR` with field-level errors. Both frontend and backend import the same Zod schemas from `packages/shared`; the UI validates first for immediate feedback, and the API validates independently so the client is never trusted. Duplicates follow FR-CAP-4 (no fuzzy deduplication engine).

### 5.4 Stale Data Handling

The client sends `updatedAt` with every status update. The SQL update executes `WHERE id = $1 AND updated_at = $2`. If zero rows are updated while the record still exists and is accessible, the API returns `409 STALE_DATA`. The UI displays an alert (`"This inquiry was changed elsewhere. Reload to see the latest."`) with a Reload button. TanStack Query also refetches on window focus (`refetchOnWindowFocus: true`), minimizing stale views. **Accepted trade-off:** no real-time WebSocket/SSE push; conflicts are detected cleanly on write.

---

## 6. Data Model

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         CITEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  family_id   UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inquiries (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
  contact       TEXT NOT NULL,
  subject       TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 150),
  description   TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_by    INT NOT NULL REFERENCES users(id),
  assigned_to   INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE status_history (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  changed_by  INT NOT NULL REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_inquiries_status      ON inquiries (status);
CREATE INDEX idx_inquiries_created_by  ON inquiries (created_by);
CREATE INDEX idx_inquiries_assigned    ON inquiries (assigned_to);
CREATE INDEX idx_inquiries_updated     ON inquiries (updated_at DESC);
CREATE INDEX idx_history_inquiry       ON status_history (inquiry_id);
```

Notes: `CHECK` constraints act as a second line of defense behind API validation; migrations are managed forward-only via Prisma Migrate in `apps/api/prisma/migrations/`; the seed script (`apps/api/prisma/seed.ts`) creates two staff accounts and one admin account using `bcrypt` hashes (no plaintext passwords stored in the database).

---

## 7. API Specification

All responses are JSON.  
- **Success:** `{ data }` or `{ data, meta }`.  
- **Failure:** `{ "error": { "code", "message", "fields"?, "meta"?, "requestId" } }`.

| Method | Path | Auth | Purpose | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | No | Sign in, issue access + refresh cookies | 200 | 400, 401, 429 |
| POST | `/api/auth/refresh` | Refresh Cookie | Rotate tokens & detect reuse | 200 | 401, 429 |
| POST | `/api/auth/logout` | Yes | Revoke refresh token & clear cookies | 204 | 401 |
| GET | `/api/auth/me` | Yes | Return current user | 200 | 401 |
| GET | `/api/inquiries?status=&q=&page=&limit=` | Yes | List accessible inquiries | 200 | 400, 401 |
| POST | `/api/inquiries` | Yes | Create inquiry | 201 | 400, 401, 409 |
| GET | `/api/inquiries/:id` | Yes | Detail + `allowedTransitions` + history | 200 | 400, 401, 404 |
| PATCH | `/api/inquiries/:id/status` | Yes | Change status (with `updatedAt`) | 200 | 400, 401, 404, 409, 422 |
| PATCH | `/api/inquiries/:id/assign` | Admin | Assign or unassign inquiry (with `updatedAt`) | 200 | 400, 401, 403, 404, 409 |
| GET | `/api/users` | Admin | List all provisioned users | 200 | 401, 403 |
| POST | `/api/users` | Admin | Provision a staff or admin account | 201 | 400, 401, 403, 409 |

Standard error codes: `400 VALIDATION_ERROR` (including non-integer `:id`), `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EMAIL_TAKEN`, `409 STALE_DATA`, `409 DUPLICATE_INQUIRY`, `413 VALIDATION_ERROR` (payload too large), `422 INVALID_TRANSITION`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

---

## 8. Security Requirements (OWASP Mapping)

| OWASP Top 10 (2021) | Requirement in CIMS |
| --- | --- |
| **A01 Broken Access Control** | Deny by default; `requireAuth` on all private routes; single `findAccessibleInquiry` rule; 404 for forbidden records; `created_by` from session only; integration tests for cross-user IDOR |
| **A02 Cryptographic Failures** | `bcrypt` cost 12; refresh tokens SHA-256 hashed before DB storage; secrets in env vars only; `HttpOnly`, `Secure`, `SameSite=Lax` cookies; no tokens/passwords in logs or URLs |
| **A03 Injection** | Prisma Client parameterized queries (no `$queryRawUnsafe` / `$executeRawUnsafe`); Zod validation on body, params, and query; whitelisted filter values; React auto-escaping, no `dangerouslySetInnerHTML` |
| **A04 Insecure Design** | Threat-modeled required scenarios; explicit state machine; JSON body size limit (10 KB); refresh token family reuse detection |
| **A05 Security Misconfiguration** | `helmet` headers and CSP; strict CORS allow-list (`credentials: true`); `x-powered-by` disabled; no stack traces in responses; Zod-validated startup env |
| **A06 Vulnerable Components** | `pnpm audit` in CI; committed lockfile; minimal dependencies |
| **A07 Identification and Auth Failures** | Rate limiting on login/refresh; generic login error; 15-min access token; server-side refresh revocation on logout and reuse; constant-time password compare via `bcrypt` |
| **A08 Software and Data Integrity** | Pinned dependencies; CI runs lint, type-check, and tests before merge |
| **A09 Logging and Monitoring** | Structured `pino` logs with `requestId`; log login failures, token reuse events, 401/404 on private routes, 409/422 conflicts; redact sensitive fields |
| **A10 SSRF** | Not applicable (no server-side fetch of user-supplied URLs) |

**CSRF mitigation:** `SameSite=Lax` cookies combined with a required custom header (`X-Requested-With: cims`) and JSON content-type enforcement on state-changing requests.  
**ASVS focus areas:** V2 Authentication, V3 Session Management, V4 Access Control, V5 Validation and Encoding, V7 Error Handling and Logging, V13 API.

---

## 9. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Performance | List and detail respond under 300 ms at expected volume; indexed filters; pagination required |
| Reliability | Status change + history insert and refresh token rotation run inside Prisma transactions (`prisma.$transaction`); graceful shutdown closes HTTP server, Prisma client, and DB pool |
| Maintainability | TypeScript strict mode; ESLint and Prettier clean; small, named modules |
| Usability | Every async view has loading, empty, and error states; clear field-level messages; keyboard-accessible forms |
| Accessibility | Labels bound to inputs, visible focus rings, status conveyed by badge text as well as color |
| Portability | One command starts Postgres; `.env.example` documents all config; root `pnpm` scripts run everything |
| Testability | Services and repositories injectable; `createApp({ prisma })` allows Supertest without binding a port |

---

## 10. Clean Code, Reusability, and Engineering Practices

### 10.1 Principles Applied

- **Separation of concerns:** strict Route → Controller → Service → Repository boundaries.
- **DRY:** single `AppError` + `errorHandler`, single `validate()` middleware factory, single transition map, single access rule.
- **Practical SOLID:** constructor-injected repositories enable isolated unit testing.
- **Fail fast:** validate `process.env` with Zod at startup; refuse to boot if required secrets or `DATABASE_URL` are missing.
- **Single source of truth:** shared Zod schemas and constants in `packages/shared`; API returns `allowedTransitions`.

### 10.2 Workflow Practices

- Small commits following Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`).
- Pre-commit hooks (`lint-staged`) running ESLint and Prettier.
- GitHub Actions CI running install, lint, type-check, unit/integration tests, and `pnpm audit`.
- Comments explain *why*, not *what*. Zero dead code or `console.log` leftovers.

---

## 11. Frontend Requirements and `shadcn/ui` Integration

### 11.1 Pages

- `/login` — Sign-in form using seeded accounts.
- `/inquiries` — Accessible inquiry list, search bar, status filter, pagination, and create inquiry trigger/page (`/inquiries/new` or modal).
- `/inquiries/[id]` — Full inquiry detail, `StatusActions` (rendering only `allowedTransitions`), and `StatusHistory`.

### 11.2 Error and State-to-UI Matrix

| Situation / Error | UI Behavior | `shadcn/ui` Component |
| --- | --- | --- |
| Loading list or detail | Skeleton rows or detail skeleton | `Skeleton` (via `LoadingState`) |
| No inquiries at all | `"No inquiries yet"` with Create button | `Card` + `Button` (via `EmptyState`) |
| No results for filter | `"No matches"` with Clear filters button | `Card` + `Button` (via `EmptyState`) |
| Saving | Submit button disabled with spinner | `Button` |
| `400` Validation error | Per-field text, focus first invalid field (no API call if caught client-side) | `Form` + `FormMessage` |
| `401` Unauthenticated | Silent refresh attempted once; if refresh fails, clear cache and redirect to `/login` (unless already on `/login`) | None |
| `404` Not found / Forbidden | `"Inquiry not found or you don't have access"` state | `Card` or `Alert` (`not-found.tsx`) |
| `409` Duplicate inquiry | Alert message with link to `/inquiries/${meta.existingInquiryId}` | `Alert` |
| `409` Stale data | `"Changed elsewhere"` alert with Reload button | `Alert` + `Button` |
| `422` Invalid transition | Inline message; refresh buttons from latest server data | `Alert` |
| `5xx` / Network error | Toast with `requestId` reference + retry option on failed view; form values preserved | `Sonner` + `Alert` |

### 11.3 `shadcn/ui` Setup and Rules

Install only the components actually used in `apps/web`:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label textarea form card badge table skeleton alert sonner select dialog alert-dialog
```

- Keep copied `shadcn/ui` primitives inside `src/components/ui/` mostly untouched.
- Build thin feature-agnostic wrappers (`LoadingState`, `EmptyState`, `ErrorBanner`, `StatusBadge`) around `Skeleton`, `Card`, `Alert`, and `Badge`.
- Mount `<Toaster />` (from `sonner`) in `src/providers/AppProviders.tsx`.
- Keep `StatusBadge` text-labelled (never color-only) for accessibility.
- Never store tokens in `localStorage` (cookies only) and never put secrets in `NEXT_PUBLIC_*`.

---

## 12. Global Error Handling Pipeline

One predictable error pipeline runs on each side so routes and components never write ad-hoc `try/catch` response formatting.

### 12.1 Shared Error Contract (`packages/shared`)

Every API error returns this exact JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please fix the highlighted fields",
    "fields": { "contact": ["Enter a valid email or phone"] },
    "meta": { "existingInquiryId": 42 },
    "requestId": "a1b2c3"
  }
}
```

### 12.2 Backend Global Pipeline

1. **Throw typed errors:** Services throw `AppError(code, status, message, fields?, meta?)`. Controllers never construct error JSON.
2. **Async wrapping:** Wrap async route handlers with `asyncHandler` (Express 4) or rely on native async rejection handling (Express 5).
3. **Central normalization (`middleware/errorHandler.ts`):**
   - `AppError` → pass through.
   - `ZodError` → `400 VALIDATION_ERROR` with flattened `fieldErrors`.
   - `body-parser` errors → `entity.parse.failed` (`400`), `entity.too.large` (`413`).
   - PostgreSQL `SQLSTATE` codes → `22P02` (`400 Invalid identifier`), `23505` (`409 Already exists`), `23514` (`400 Value violates a rule`).
   - Anything else → `500 INTERNAL_ERROR` with generic message (never expose stack traces or raw SQL errors).
4. **Structured logging:** Log `4xx` as `warn` and `5xx` as `error` with `requestId`. Never log passwords or tokens.
5. **Middleware order in `app.ts`:** routes → `notFound` (JSON 404) → `errorHandler` (last).
6. **Process safety net (`server.ts`):** Catch `unhandledRejection` and `uncaughtException`, log fatal, close HTTP server and DB pool gracefully, then exit with code `1`.

### 12.3 Frontend 4-Layer Error Pipeline

| Layer | Responsibility | Implementation |
| --- | --- | --- |
| 1. `lib/apiClient.ts` | Network failure, non-JSON, error contract parsing, **single-flight 401 refresh retry** | Throws typed `ApiError(status, code, message, fields?, meta?, requestId?)`. On `401` (for non-`/api/auth/` paths, once per request), shares one in-flight `POST /api/auth/refresh` promise so concurrent requests do not trigger refresh token reuse detection, then retries the original request. |
| 2. `lib/queryClient.ts` | Global side effects (`401`, `5xx`, network) | `QueryCache` and `MutationCache` `onError`: on `401`, clears cache and redirects to `/login` **only if `window.location.pathname !== '/login'`**; on `5xx` or status `0`, triggers a Sonner toast with `Ref: ${requestId}`. Retries up to 2 times for non-4xx errors only. |
| 3. Local component/form handling | Contextual user actions (`400`, `404`, `409`, `422`) | Maps `err.fields` onto `react-hook-form` via `form.setError`; renders inline `Alert` for `409` duplicate (with link via `err.meta.existingInquiryId`), `409` stale (with Reload button), and `422` invalid transition. |
| 4. Next.js boundaries | Uncaught render crashes and missing routes | `app/error.tsx` (with `reset()`), `app/global-error.tsx`, `app/not-found.tsx`, and `inquiries/[id]/not-found.tsx`. |

---

## 13. Testing Strategy

| Level | Tool | Required Tests |
| --- | --- | --- |
| Backend unit | Vitest | Status transition state machine; shared Zod validation schemas |
| Backend integration | Supertest + isolated test DB | (1) User B requesting User A's inquiry gets `404`; (2) invalid status transition returns `422`; (3) unauthenticated request returns `401`; (4) invalid body or non-integer `:id` returns `400` with fields (not a Postgres crash); (5) stale `updatedAt` returns `409`; (6) refresh token rotation issues a new pair, and reusing an old refresh token revokes the entire `family_id` and returns `401`; (7) unknown route returns JSON `404` and unexpected error returns generic `500` without stack |
| Frontend component | React Testing Library + MSW | (1) Empty form submit shows validation errors and makes no API call; (2) API `400` with `fields` highlights the corresponding inputs; (3) list renders loading, empty, and error states; (4) `409` stale response renders the reload alert |

**Stated testing gaps (documented transparently in `DECISIONS.md`):** no E2E browser tests (Playwright), no load/concurrency stress tests, and no automated accessibility audit pipeline.

---

## 14. Project Structure (Monorepo)

Managed with `pnpm` workspaces (skipping Nx/Turborepo to keep setup simple).

```text
cims/
├── apps/
│   ├── api/                           # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Prisma 7 schema (PostgreSQL)
│   │   │   ├── migrations/            # Prisma Migrate SQL files
│   │   │   └── seed.ts                # Idempotent seed script
│   │   ├── src/
│   │   │   ├── config/env.ts          # Zod-validated environment variables
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts          # Singleton PrismaClient (@prisma/adapter-pg)
│   │   │   ├── middleware/
│   │   │   │   ├── requireAuth.ts
│   │   │   │   ├── validate.ts        # validate({ body, params, query })
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── requestId.ts
│   │   │   │   ├── notFound.ts
│   │   │   │   └── errorHandler.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schemas.ts
│   │   │   │   │   ├── user.repository.ts
│   │   │   │   │   └── refreshToken.repository.ts
│   │   │   │   └── inquiries/
│   │   │   │       ├── inquiries.routes.ts
│   │   │   │       ├── inquiries.controller.ts
│   │   │   │       ├── inquiries.service.ts
│   │   │   │       ├── inquiries.repository.ts
│   │   │   │       ├── inquiries.schemas.ts
│   │   │   │       ├── inquiries.mapper.ts
│   │   │   │       └── statusTransitions.ts
│   │   │   ├── utils/
│   │   │   │   ├── AppError.ts
│   │   │   │   ├── asyncHandler.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── password.ts
│   │   │   │   └── tokens.ts
│   │   │   ├── types/express.d.ts
│   │   │   ├── app.ts                 # createApp({ prisma })
│   │   │   └── server.ts              # Listener + graceful shutdown
│   │   ├── tests/
│   │   │   ├── helpers/
│   │   │   ├── unit/statusTransitions.test.ts
│   │   │   └── integration/
│   │   │       ├── auth.test.ts
│   │   │       ├── errorHandler.test.ts
│   │   │       └── inquiries.access.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── web/                           # Next.js App Router frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx           # Redirects to /inquiries
│       │   │   ├── error.tsx
│       │   │   ├── global-error.tsx
│       │   │   ├── not-found.tsx
│       │   │   ├── login/page.tsx
│       │   │   └── (workspace)/
│       │   │       ├── layout.tsx     # Auth guard, header, logout
│       │   │       └── inquiries/
│       │   │           ├── page.tsx
│       │   │           ├── new/page.tsx
│       │   │           └── [id]/
│       │   │               ├── page.tsx
│       │   │               └── not-found.tsx
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   ├── components/LoginForm.tsx
│       │   │   │   ├── hooks/useAuth.ts
│       │   │   │   └── api.ts
│       │   │   └── inquiries/
│       │   │       ├── components/
│       │   │       │   ├── InquiryForm.tsx
│       │   │       │   ├── InquiryList.tsx
│       │   │       │   ├── InquiryFilters.tsx
│       │   │       │   ├── InquiryDetail.tsx
│       │   │       │   ├── StatusActions.tsx
│       │   │       │   └── StatusHistory.tsx
│       │   │       ├── hooks/
│       │   │       │   ├── useInquiries.ts
│       │   │       │   ├── useInquiry.ts
│       │   │       │   ├── useCreateInquiry.ts
│       │   │       │   └── useUpdateStatus.ts
│       │   │       └── api.ts
│       │   ├── components/ui/         # shadcn/ui primitives + thin wrappers
│       │   ├── lib/
│       │   │   ├── apiClient.ts
│       │   │   ├── queryClient.ts
│       │   │   └── formatters.ts
│       │   ├── providers/AppProviders.tsx
│       │   └── styles/globals.css
│       ├── tests/
│       │   ├── InquiryForm.test.tsx
│       │   ├── InquiryList.states.test.tsx
│       │   └── mocks/handlers.ts
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/                        # Shared Zod schemas, types, constants
│       ├── src/
│       │   ├── constants/inquiry.ts
│       │   ├── schemas/
│       │   │   ├── auth.schema.ts
│       │   │   └── inquiry.schema.ts
│       │   ├── types/index.ts         # z.infer types + ApiErrorResponse contract
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/SRS.md
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
├── eslint.config.js
├── .prettierrc
├── tsconfig.base.json
├── pnpm-workspace.yaml
├── package.json                       # Root scripts: dev, lint, test, db:migrate, db:seed, db:generate
├── DECISIONS.md
└── README.md
```

### 14.1 Structural Rules

1. Dependencies point inward: Route → Controller → Service → Repository (never skip a layer).
2. Feature folders over type folders on both sides.
3. `components/ui` holds only generic, inquiry-agnostic pieces.
4. `app.ts` exports `createApp({ prisma })` and `server.ts` binds the port.
5. One-way workspace imports: `apps/*` may import `packages/shared`; `shared` imports nothing from `apps/*`; `api` and `web` never import each other.
6. Root scripts orchestrate everything: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:generate`.

---

## 15. Configuration and Setup

### `.env.example` Keys

- `DATABASE_URL` (local Docker Postgres or Supabase PostgreSQL connection string)
- `TEST_DATABASE_URL` (isolated DB for integration tests)
- `JWT_ACCESS_SECRET` (long random string)
- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL_DAYS=7`
- `COOKIE_SECURE=false` (`true` in production)
- `CORS_ORIGIN=http://localhost:3000`
- `PORT=4000`
- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `LOG_LEVEL=info`

### Local Setup Flow

```bash
docker compose up -d db
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm test
```

`README.md` lists seeded credentials (two staff, one admin) and notes they are strictly for local evaluation.

---

## 16. Implementation Flow (Roadmap)

| Phase | Hours | Deliverable |
| --- | --- | --- |
| 1. Foundation | 0–2 | `pnpm` monorepo, `packages/shared`, TypeScript config, Docker Postgres, SQL migrations, seed script, env validation, `AppError` + `errorHandler` |
| 2. Auth | 2–3.5 | Login, 15-min JWT + rotating refresh token with reuse detection, `requireAuth`, rate limit, auth integration tests |
| 3. Inquiry API | 3.5–6 | Create, list with search/filter/pagination, detail, status transitions + history transaction, ownership rule, optimistic locking |
| 4. Frontend | 6–9 | `shadcn/ui` setup, `apiClient` (with single-flight refresh), `queryClient`, login, list, form, detail, all UI states & boundaries |
| 5. Tests & hardening | 9–11 | Backend/frontend required tests, security header check, `pnpm audit`, lint & type-check clean |
| 6. Docs & video | 11–12 | `README.md`, `DECISIONS.md`, 3–5 minute screen recording |

---

## 17. Acceptance Criteria for the Three Required Situations

| Situation | Pass Condition |
| --- | --- |
| Missing or invalid input | UI blocks submit and highlights each invalid field; sending the same bad payload via `curl` returns `400 VALIDATION_ERROR` with `fields` |
| Stale browser tab | Tab B submits an outdated `updatedAt`, receives `409 STALE_DATA`, displays the reload alert, and clicking Reload shows the latest status |
| Direct link to forbidden inquiry | UI renders the not-found state; `curl` with another staff member's cookie returns `404 NOT_FOUND`; request without cookies returns `401 UNAUTHENTICATED` |

---

## 18. Deliverables

1. **GitHub repository:** monorepo containing `apps/api`, `apps/web`, `packages/shared`, `database/migrations`, and `database/seeds`.
2. **`README.md`:** prerequisites, setup steps, seeded test accounts, and run/test commands.
3. **`DECISIONS.md` (~1 page):** assumptions; key choices (ownership rule, status state machine, optimistic locking, rotating refresh tokens, shared Zod package trade-off); accepted trade-off (no real-time push); next improvements; transparent AI usage note with at least one suggestion accepted, changed, or rejected.
4. **Tests:** backend business/security/validation tests and frontend interaction/UI state tests, with stated testing gaps.
5. **Screen recording (3–5 minutes):** end-to-end workflow, one failure case, and the code section you are most confident explaining.

---

## 19. Risks and Future Improvements

| Risk | Mitigation |
| --- | --- |
| Over-scoping | Stick strictly to minimum scope + status history + clean auth/error pipeline |
| Multi-tab refresh race condition | Use a single-flight refresh promise in `apiClient.ts` so concurrent `401`s share one refresh call |
| Unexplainable generated code | Write/review every layer yourself, understand each `shadcn/ui` primitive used, and log AI changes in `DECISIONS.md` |

**Next improvements:** full audit log of all field edits, staff assignment UI, Server-Sent Events (SSE) for live status updates, scheduled cleanup job for expired/revoked refresh tokens, Playwright E2E tests, automated accessibility audit, and observability dashboards.