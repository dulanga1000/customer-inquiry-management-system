FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm --version

# 1. Fetch dependency tarballs into a dedicated store directory
FROM base AS fetch
RUN pnpm fetch --store-dir /pnpm/store

# 2. Install workspace dependencies for @cims/api and @cims/shared, then compile TypeScript
FROM base AS builder
COPY --from=fetch /pnpm/store /pnpm/store
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prefer-offline --store-dir /pnpm/store --filter @cims/api...

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @cims/shared build && pnpm --filter @cims/api build

# 3. Install pruned production-only dependencies for @cims/api and @cims/shared
FROM base AS prod-deps
COPY --from=fetch /pnpm/store /pnpm/store
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prefer-offline --prod --store-dir /pnpm/store --filter @cims/api...

# 4. Minimal non-root runtime image
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=prod-deps --chown=node:node /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=prod-deps --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node database/migrations ./database/migrations

USER node
WORKDIR /app/apps/api
EXPOSE 4000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/server.js"]
