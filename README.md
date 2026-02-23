# 🌿 NCTS — National Cannabis Tracking System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

> Seed-to-Sale digital infrastructure for South Africa's regulated cannabis industry.

## Overview

The **National Cannabis Tracking System (NCTS)** is a cloud-based, multi-tenant platform that digitally tracks every licensed cannabis plant and product through the South African supply chain — from seed to sale. Built for SAHPRA, DALRRD, and licensed operators.

## Architecture

**Monorepo** powered by pnpm workspaces + Turborepo.

### Apps

| App | Path | Description |
|-----|------|-------------|
| **Portal** | `apps/portal` | Operator + Regulator portal — React 19, Ant Design 5, Vite |
| **Verify** | `apps/verify` | Public product verification PWA — React 19, Tailwind CSS, Vite |
| **API** | `api/v1/[...path].ts` | Vercel serverless catch-all function |

### Packages

| Package | Description |
|---------|-------------|
| `packages/api-client` | Typed API client + TanStack React Query hooks |
| `packages/audit-lib` | Tamper-proof cryptographic audit hash chain |
| `packages/crypto-lib` | Cryptographic utilities (POPIA encryption) |
| `packages/database` | Prisma 6 schema, migrations & client |
| `packages/qr-lib` | QR code generation + HMAC verification for tracking IDs |
| `packages/shared-types` | Shared TypeScript types, enums & DTOs |
| `packages/ui` | Shared React components (OfflineBanner, SyncStatus, i18n, etc.) |
| `packages/eslint-config` | Shared ESLint configurations |
| `packages/tsconfig` | Shared TypeScript base configs |

## Tech Stack

React 19 · TypeScript 5.7 · Ant Design 5 · Tailwind CSS 3 · Vite 6 · TanStack Query 5 · Prisma 6 · Neon PostgreSQL · Vercel Serverless · Vitest

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9

### Install & Run

```bash
git clone <repo-url> && cd ncts
pnpm install

# Provision / reset the database
.\infrastructure\scripts\setup-database.ps1

# Start all apps in dev mode
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript type-checking across the monorepo |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm format` | Format code with Prettier |
| `pnpm db:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## Deployment

Both apps deploy to **Vercel** automatically on push to `master`.

### Live URLs

| Service | URL |
|---------|-----|
| Portal | https://ncts-portal-ivory.vercel.app |
| Verify | https://ncts-alpha.vercel.app |
| API Health | https://ncts-portal-ivory.vercel.app/api/v1/health |

## Environment Variables

Configured in the Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |

## License

ISC
