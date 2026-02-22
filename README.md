# 🌿 NCTS — National Cannabis Tracking System

> Seed-to-Sale Digital Infrastructure for South Africa

## Overview

The **National Cannabis Tracking System (NCTS)** is a cloud-based, multi-tenant platform that digitally tracks every licensed cannabis plant and product through the South African supply chain — from seed to sale.

### Modules

| Module | Port | Description |
|--------|------|-------------|
| **Operator Portal** (`apps/web`) | 5173 | Plant/batch registration, harvest reporting, lab results, transfers, sales |
| **Regulatory Dashboard** (`apps/admin`) | 5174 | SAHPRA/DALRRD compliance monitoring, permit management, national overview |
| **Public Verification** (`apps/verify`) | 5175 | Product verification via QR code — confirming a product is licensed and tested |
| **API** (`apps/api`) | 3000 | NestJS backend with REST + OpenAPI |

## Tech Stack

- **Monorepo:** Turborepo + pnpm
- **Backend:** NestJS (Fastify) + PostgreSQL 17 (Neon serverless)
- **Frontend:** React 19 + Ant Design 5 + TypeScript
- **ORM:** Prisma 6
- **Database:** Neon (serverless PostgreSQL) — aws-eu-central-1
- **Deployment:** Vercel (frontend + serverless API)
- **Testing:** Vitest + Playwright + k6

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- Neon CLI (`npm i -g neonctl`) — for database management

### Setup

```bash
# Clone and install
cd ncts
pnpm install

# Database is already provisioned on Neon.
# To re-run migrations + seed:
.\infrastructure\scripts\setup-database.ps1

# Run all apps in dev mode
pnpm dev
```

### URLs

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Operator Portal: http://localhost:5173
- Verification: http://localhost:5175
- Prisma Studio: `cd packages/database && npx prisma studio`

## Project Structure

```
ncts/
├── apps/
│   ├── api/           # NestJS backend
│   ├── web/           # Operator portal (React + Ant Design)
│   ├── admin/         # Government dashboard (React + Ant Design)
│   └── verify/        # Public verification PWA
├── packages/
│   ├── shared-types/  # TypeScript interfaces, enums, DTOs
│   ├── database/      # Prisma schema + migrations + seeds
│   ├── audit-lib/     # Hash-chaining audit library
│   ├── crypto-lib/    # Encryption utilities (POPIA)
│   ├── qr-lib/        # QR code generation + HMAC verification
│   ├── ui/            # Shared React components
│   ├── eslint-config/ # Shared ESLint config
│   └── tsconfig/      # Shared TypeScript configs
├── infrastructure/
│   ├── sql/           # Post-migration SQL (RLS, sequences, partitioning, views)
│   ├── scripts/       # Setup & utility scripts
│   └── terraform/
└── .github/workflows/
```

## License

UNLICENSED — Proprietary. Copyright © 2026 TheGreenPoint.
