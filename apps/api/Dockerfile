# ═══════════════════════════════════════════════════════════════
# NCTS API — Multi-stage Docker Build
# Produces a minimal production image for ECS Fargate deployment
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/crypto-lib/package.json ./packages/crypto-lib/
COPY packages/qr-lib/package.json ./packages/qr-lib/
COPY packages/audit-lib/package.json ./packages/audit-lib/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build arguments
ARG NODE_ENV=production
ARG APP_VERSION=0.0.0

# Generate Prisma client
RUN cd packages/database && pnpm exec prisma generate

# Build shared packages first, then the API
RUN cd packages/shared-types && pnpm build || true
RUN cd packages/audit-lib && pnpm build || true
RUN cd packages/crypto-lib && pnpm build || true
RUN cd packages/qr-lib && pnpm build || true
RUN cd apps/api && pnpm build

# ── Stage 3: Production image ─────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate

# Security: run as non-root user
RUN addgroup --system --gid 1001 ncts && \
    adduser --system --uid 1001 --ingroup ncts ncts

WORKDIR /app

# Copy only production dependencies
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=deps /app/apps/api/package.json ./apps/api/
COPY --from=deps /app/packages/database/package.json ./packages/database/
COPY --from=deps /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=deps /app/packages/crypto-lib/package.json ./packages/crypto-lib/
COPY --from=deps /app/packages/qr-lib/package.json ./packages/qr-lib/
COPY --from=deps /app/packages/audit-lib/package.json ./packages/audit-lib/
COPY --from=deps /app/packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/src ./packages/database/src
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built shared packages
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/audit-lib/dist ./packages/audit-lib/dist
COPY --from=builder /app/packages/crypto-lib/dist ./packages/crypto-lib/dist
COPY --from=builder /app/packages/qr-lib/dist ./packages/qr-lib/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

ARG APP_VERSION=0.0.0
ENV APP_VERSION=${APP_VERSION}

# Switch to non-root user
USER ncts

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the API
CMD ["node", "apps/api/dist/main.js"]
