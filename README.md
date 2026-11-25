# Customer Inquiry Management System (CIMS)

A fullstack `pnpm` monorepo for recording, searching, triaging, and tracking customer inquiries through a server-enforced lifecycle with audit history, optimistic locking, and rotating cookie-based authentication.

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         @cims/web (Next.js 16)                       │
│   App Router · TanStack Query · React Hook Form · shadcn/ui · Sonner │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ HTTPS / Fetch (credentials: include,
                                    │ X-Requested-With: cims)
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        @cims/api (Express 5)                         │
│   Routes ─▶ Middleware (Auth, CSRF, Zod, RateLimit) ─▶ Controllers   │
│   ─▶ Services (Business Rules, State Machine) ─▶ Repositories        │
│   ─▶ Prisma ORM v7.10.1 (@prisma/adapter-pg + pg.Pool)               │
└───────────────────┬───────────────────────────────┬──────────────────┘
                    │                               │
                    ▼                               ▼
     ┌─────────────────────────────┐   ┌────────────────────────────┐
     │     PostgreSQL 16 (db)      │   │  @cims/shared              │
     │  users · refresh_tokens     │   │  Zod schemas · DTO types   │
     │  inquiries · status_history │   │  Status & role constants   │
     └─────────────────────────────┘   └────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
| --- | --- |
| **Monorepo** | `pnpm` workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| **Frontend** | Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS v4, `shadcn/ui` (Base UI), TanStack Query, React Hook Form, Sonner |
| **Backend** | Node.js 22, Express 5, TypeScript, `pino` / `pino-http`, `helmet`, `cors`, `express-rate-limit`, `bcrypt`, `jsonwebtoken` |
| **Database & ORM** | PostgreSQL 16, Prisma ORM `7.10.1` with `@prisma/adapter-pg` and `pg.Pool` |
| **Shared Contracts** | Zod validation schemas and inferred TypeScript DTOs in `@cims/shared` |
| **Testing** | Vitest + Supertest (API unit & integration tests against PostgreSQL) |

---

## Prerequisites

- **Docker & Docker Compose** (recommended for one-command stack startup or local PostgreSQL)
- **Node.js 22+** and **`pnpm` 12.23.0** (via `corepack enable`) for local development

---

## Option 1: Docker Compose (Recommended)

The repository includes multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) and `docker-compose.yml` with sensible defaults so the entire stack (`db`, `api`, `web`) runs out of the box without manual tweaking:

```bash
# Build and start PostgreSQL, API (with Prisma migrate deploy + seed), and Web UI
docker compose up --build
```

Once healthy:
- **Web UI:** http://localhost:3000
- **API Healthcheck:** http://localhost:4000/health

Convenience scripts in root `package.json`:

```bash
pnpm docker:up     # Build and start all services
pnpm docker:down   # Stop containers (preserves pgdata volume)
pnpm docker:reset  # Stop containers and remove volumes
```

---

## Option 2: Local Development

1. **Install dependencies:**
   ```bash
   corepack enable
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Review `.env` (see `.env.example` for local Docker Postgres, `TEST_DATABASE_URL`, and hosted Supabase connection string examples).

3. **Start PostgreSQL:**
   ```bash
   docker compose up -d db
   ```

4. **Build shared contracts, generate Prisma Client, run migrations, and seed demo users:**
   ```bash
   pnpm --filter @cims/shared build
   pnpm db:generate
   pnpm --filter @cims/api exec prisma migrate dev
   pnpm db:seed
   ```
   *(For production/CI environments, `pnpm db:migrate` runs `prisma migrate deploy`.)*

5. **Run the development servers** (in separate terminals):
   ```bash
   pnpm dev:api   # http://localhost:4000
   pnpm dev:web   # http://localhost:3000
   ```

---

## Seeded Demo Credentials

> **Note:** These accounts are seeded by `apps/api/prisma/seed.ts` (using `bcrypt` cost 12) **strictly for local evaluation and testing**.

| Role | Email | Password | Capabilities |
| --- | --- | --- | --- |
| `admin` | `admin@cims.local` | `Password123!` | View and transition all inquiries across all staff |
| `staff` | `staff1@cims.local` | `Password123!` | Create inquiries; view/update inquiries created by or assigned to `staff1` |
| `staff` | `staff2@cims.local` | `Password123!` | Create inquiries; view/update inquiries created by or assigned to `staff2` |

---

## Key `pnpm` Scripts

| Command | Description |
| --- | --- |
| `pnpm dev:api` | Start the Express API in watch mode (`tsx watch`) |
| `pnpm dev:web` | Start the Next.js development server |
| `pnpm build` | Build `@cims/shared`, `@cims/api`, and `@cims/web` |
| `pnpm -r typecheck` | Run TypeScript type-checking across all workspace packages |
| `pnpm lint` | Run linting across all workspace packages |
| `pnpm --filter @cims/api test` | Run API unit and Supertest integration tests (`TEST_DATABASE_URL`) |
| `pnpm db:generate` | Generate Prisma Client (`apps/api/src/generated/prisma`) |
| `pnpm db:migrate` | Apply pending Prisma migrations (`prisma migrate deploy`) |
| `pnpm db:seed` | Run the idempotent database seed (`apps/api/prisma/seed.ts`) |
| `pnpm docker:up` | Start full Docker Compose stack with build |
| `pnpm docker:down` | Stop Docker Compose containers |
| `pnpm docker:reset` | Stop Docker Compose containers and wipe database volume |

For architectural decisions, trade-offs, and testing notes, see [DECISIONS.md](DECISIONS.md).
