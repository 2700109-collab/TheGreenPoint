# NCTS Codebase Analysis Report

> **Generated:** 2026-02-21 | **Analyst:** Codebase Analyst Agent  
> **Scope:** Full inventory of `ncts/` monorepo — backend, frontend, packages, infrastructure, database

---

## Executive Summary

| Component | Completion | Lines of Code | Notes |
|-----------|-----------|---------------|-------|
| **Backend API** | **85%** | ~2,500 | 10 modules fully implemented; missing DTOs with validation, tests, login/register endpoints |
| **Operator Portal (web)** | **60%** | ~700 | 8 pages with live API data; missing forms, wizards, CSV upload, map |
| **Government Dashboard (admin)** | **60%** | ~600 | 6 pages with live API data; missing map, inspections, permit detail workflow |
| **Public Verification (verify)** | **50%** | ~260 | Working search + verify flow; missing Shadcn/Tailwind, SSR, HMAC validation |
| **Unified Portal (portal)** | **70%** | ~1,200 | All-in-one app with auth, lazy loading, role routing; pages are thinner stubs |
| **Shared Packages** | **80%** | ~1,100 | shared-types, audit-lib, crypto-lib, qr-lib, api-client all functional |
| **Database** | **75%** | ~960 (schema+seed+SQL) | Full schema (14 models), seeds, RLS policies; no migrations run |
| **Infrastructure** | **45%** | ~150 | Docker Compose done; Terraform/scripts empty; CI pipeline exists |
| **Overall** | **~65%** | ~7,500+ | Solid foundation; biggest gaps are form UIs, tests, migration execution, Terraform |

---

## 1. Backend API Analysis

### 1.1 Global Configuration

**`apps/api/src/main.ts`** (72 lines) — **Fully implemented**
- ✅ Fastify adapter
- ✅ Global prefix `api` with URI versioning (default v1)
- ✅ `ValidationPipe` (whitelist, forbidNonWhitelisted, transform, implicit conversion)
- ✅ `AllExceptionsFilter` (global)
- ✅ `LoggingInterceptor` (global)
- ✅ CORS (configurable via `CORS_ORIGINS` env, defaults to localhost:5173-5175)
- ✅ Swagger/OpenAPI at `/api/docs` with all 10 tags defined
- ✅ Bearer auth scheme

**`apps/api/src/app.module.ts`** (49 lines) — **Fully implemented**
- ✅ `ConfigModule.forRoot()` (global, `.env.local` + `.env`)
- ✅ `ScheduleModule.forRoot()` (for cron jobs)
- ✅ Global `AuditInterceptor` via `APP_INTERCEPTOR`
- ✅ `AuditVerifierService` (background hash-chain verifier)
- ✅ All 10 domain modules imported: Database, Auth, Health, Facilities, Plants, Batches, Harvests, LabResults, Transfers, Sales, Regulatory, Verification

---

### 1.2 Module: auth/

| File | Lines | Status |
|------|-------|--------|
| `auth.module.ts` | 26 | ✅ Complete |
| `auth.service.ts` | 60 | ✅ Complete |
| `index.ts` (barrel) | 9 | ✅ Complete |
| `strategies/jwt.strategy.ts` | 35 | ✅ Complete |
| `guards/jwt-auth.guard.ts` | 8 | ✅ Complete |
| `guards/roles.guard.ts` | 35 | ✅ Complete |
| `guards/tenant.guard.ts` | 37 | ✅ Complete |
| `decorators/current-user.decorator.ts` | 23 | ✅ Complete |
| `decorators/roles.decorator.ts` | 13 | ✅ Complete |
| `decorators/tenant.decorator.ts` | 17 | ✅ Complete |

**Details:**
- Passport + JWT with configurable secret (dev: hardcoded, prod: Cognito JWKS placeholder)
- `generateAccessToken()` + `generateRefreshToken()` (dev-mode token issuance)
- RolesGuard checks `@Roles()` metadata against `user.role`
- TenantGuard exempts `regulator`, `inspector`, `admin` roles; enforces `tenantId` for operators
- **Missing:** No login/register controller (no `POST /auth/login` or `/auth/register` endpoint)
- **Missing:** No refresh token rotation endpoint
- **Missing:** No token blacklist (Redis)
- **Missing:** No `AuthController` at all — auth service exists but is not exposed via HTTP
- **No tests**

---

### 1.3 Module: facilities/

| File | Lines | Status |
|------|-------|--------|
| `facilities.controller.ts` | 94 | ✅ Fully implemented |
| `facilities.service.ts` | 129 | ✅ Fully implemented |
| `facilities.module.ts` | 9 | ✅ Complete |

**Routes (6):**
| Method | Path | Guard | Roles | Impl |
|--------|------|-------|-------|------|
| `POST` | `/facilities` | JWT + Roles + Tenant | operator_admin | ✅ Full Prisma create with PostGIS boundary |
| `GET` | `/facilities` | JWT + Roles | operator_admin/staff, regulator, inspector | ✅ Paginated; regulator sees all, operator sees own |
| `GET` | `/facilities/:id` | JWT + Roles | operator_admin/staff, regulator, inspector | ✅ With tenant/zone/permit includes |
| `PATCH` | `/facilities/:id` | JWT + Roles + Tenant | operator_admin | ✅ Partial update |
| `POST` | `/facilities/:id/zones` | JWT + Roles + Tenant | operator_admin | ✅ Create zone with capacity |
| `GET` | `/facilities/:id/zones` | JWT + Roles | operator_admin/staff, regulator, inspector | ✅ With plant count |

**Assessment:** Fully implemented with real business logic. Uses `@ncts/shared-types` DTOs as TypeScript interfaces (not class-validator classes). Controller params typed as `any` — **missing class-validator DTO classes for request validation.**
- **No tests**

---

### 1.4 Module: plants/

| File | Lines | Status |
|------|-------|--------|
| `plants.controller.ts` | 69 | ✅ Fully implemented |
| `plants.service.ts` | 242 | ✅ Fully implemented (richest module) |
| `plants.module.ts` | 9 | ✅ Complete |

**Routes (4):**
| Method | Path | Guard | Roles | Impl |
|--------|------|-------|-------|------|
| `POST` | `/plants` | JWT + Roles + Tenant | operator_admin/staff | ✅ Auto-generates NCTS-ZA-YYYY-NNNNNN tracking ID |
| `POST` | `/plants/batch-register` | JWT + Roles + Tenant | operator_admin/staff | ✅ Bulk create with zone count updates |
| `GET` | `/plants` | JWT + Roles | operator_admin/staff, regulator, inspector | ✅ Rich filtering (state, strain, facility, zone, date range, sort) |
| `PATCH` | `/plants/:id/state` | JWT + Roles + Tenant | operator_admin/staff | ✅ Full lifecycle state machine with validation |

**Business Logic Highlights:**
- State machine: `VALID_TRANSITIONS` map enforcing `seed → seedling → vegetative → flowering → harvested/destroyed`
- Tracking ID: `NCTS-ZA-{YEAR}-{6-digit sequential}` auto-generated
- Zone count decrement on harvest/destroy
- Separate regulator view (cross-tenant with tenant info included)
- **No tests**

---

### 1.5 Module: batches/

| File | Lines | Status |
|------|-------|--------|
| `batches.controller.ts` | 49 | ⚠️ Partial |
| `batches.service.ts` | 85 | ⚠️ Partial |
| `batches.module.ts` | 9 | ✅ Complete |

**Routes (2):**
| Method | Path | Impl |
|--------|------|------|
| `GET` | `/batches` | ✅ Paginated list with strain/facility/lab includes |
| `GET` | `/batches/:id` | ✅ Detailed view with full relationship graph |

**Assessment:** Read-only. Batches are **created by the Harvest service** (not directly by a POST endpoint). This is architecturally correct — batches are derived entities. **Missing:** No `POST /batches` for manual batch creation (e.g., processing batches). No `PATCH` for updating batch weights.
- **No tests**

---

### 1.6 Module: harvests/

| File | Lines | Status |
|------|-------|--------|
| `harvests.controller.ts` | 51 | ✅ Fully implemented |
| `harvests.service.ts` | 124 | ✅ Fully implemented |
| `harvests.module.ts` | 9 | ✅ Complete |

**Routes (3):**
| Method | Path | Impl |
|--------|------|------|
| `POST` | `/harvests` | ✅ Transactional: validates plants in FLOWERING state → creates Batch + Harvest → transitions plants to HARVESTED |
| `GET` | `/harvests/:id` | ✅ With batch + lab result + facility |
| `PATCH` | `/harvests/:id` | ✅ Update dry weight, notes |

**Business Logic:** Harvest creation is a transactional operation that enforces plant lifecycle (only FLOWERING plants can be harvested), auto-creates a batch, and links everything together. This is solid implementation.
- **Missing:** No `GET /harvests` list endpoint
- **No tests**

---

### 1.7 Module: lab-results/

| File | Lines | Status |
|------|-------|--------|
| `lab-results.controller.ts` | 64 | ✅ Fully implemented |
| `lab-results.service.ts` | 100 | ✅ Fully implemented |
| `lab-results.module.ts` | 9 | ✅ Complete |

**Routes (4):**
| Method | Path | Impl |
|--------|------|------|
| `POST` | `/lab-results` | ✅ Submit CoA; auto-determines pass/fail; links to batch in transaction |
| `GET` | `/lab-results` | ✅ Paginated list |
| `GET` | `/lab-results/:id` | ✅ With linked batches |
| `GET` | `/lab-results/batch/:batchId` | ✅ Get results for specific batch |

**Business Logic:** Pass/fail is determined from all four contaminant flags (pesticides, heavy metals, microbials, mycotoxins — all must pass). Lab result linked to batch in a transaction.
- **Missing:** No configurable threshold rules engine (Plan.md Phase 2.4)
- **No tests**

---

### 1.8 Module: transfers/

| File | Lines | Status |
|------|-------|--------|
| `transfers.controller.ts` | 79 | ✅ Fully implemented |
| `transfers.service.ts` | 181 | ✅ Fully implemented |
| `transfers.module.ts` | 9 | ✅ Complete |

**Routes (5):**
| Method | Path | Impl |
|--------|------|------|
| `POST` | `/transfers` | ✅ Transactional: validates facilities + batches → creates transfer with items |
| `GET` | `/transfers` | ✅ Shows transfers where tenant is sender OR receiver |
| `GET` | `/transfers/:id` | ✅ Detailed with items and batch info |
| `PATCH` | `/transfers/:id/accept` | ✅ Record received quantities, mark accepted |
| `PATCH` | `/transfers/:id/reject` | ✅ Record rejection reason |

**Business Logic:** Transfer number auto-generated (`TRF-YYYY-NNNNNN`). Validates sender/receiver facilities exist. Shows both sent and received transfers for operators. Acceptance records received quantities (allows discrepancy detection).
- **Missing:** Inventory auto-adjustment on acceptance (Plan.md mentions it)
- **Missing:** Discrepancy flag when received ≠ sent quantities
- **No tests**

---

### 1.9 Module: sales/

| File | Lines | Status |
|------|-------|--------|
| `sales.controller.ts` | 62 | ✅ Fully implemented |
| `sales.service.ts` | 115 | ✅ Fully implemented |
| `sales.module.ts` | 9 | ✅ Complete |

**Routes (3):**
| Method | Path | Impl |
|--------|------|------|
| `POST` | `/sales` | ✅ Validates batch + facility ownership, auto-generates sale number |
| `GET` | `/sales` | ✅ Paginated with date/facility filters |
| `GET` | `/sales/:id` | ✅ With batch → strain → lab result chain |

**Business Logic:** Sale number auto-generated (`SALE-YYYY-NNNNNN`). Validates batch and facility belong to tenant.
- **Missing:** Inventory auto-deduction (Plan.md requires stock tracking)
- **Missing:** Sales aggregation/reporting endpoints
- **No tests**

---

### 1.10 Module: regulatory/

| File | Lines | Status |
|------|-------|--------|
| `regulatory.controller.ts` | 80 | ✅ Fully implemented |
| `regulatory.service.ts` | 347 | ✅ Fully implemented (largest service) |
| `regulatory.module.ts` | 9 | ✅ Complete |

**Routes (6):**
| Method | Path | Impl |
|--------|------|------|
| `GET` | `/regulatory/dashboard` | ✅ Aggregated KPIs (operators, plants, facilities, permits, compliance rate, flagged) |
| `GET` | `/regulatory/dashboard/trends` | ✅ Monthly time-series: plants, harvests, sales revenue/volume |
| `GET` | `/regulatory/facilities/geo` | ✅ GeoJSON FeatureCollection with operator/compliance properties |
| `GET` | `/regulatory/operators` | ✅ Paginated with facility/plant/permit/batch/sale counts |
| `GET` | `/regulatory/permits` | ✅ Filtered by status/type with tenant/facility includes |
| `PATCH` | `/regulatory/permits/:id/status` | ✅ Update status with audit event |
| `GET` | `/regulatory/compliance/alerts` | ✅ Real alerts from: expired permits, expiring permits, non-compliant operators, failed lab results |

**Business Logic:** This is the most complex module. Compliance alerts are **dynamically computed** from real data (not static). Dashboard trends group by month across 12-month window. GeoJSON output matches Mapbox expectations.
- **Missing:** Inspection management (no Inspection model in schema)
- **Missing:** Configurable compliance rules engine (rules currently hardcoded)
- **Missing:** Operator compliance profile endpoint
- **No tests**

---

### 1.11 Module: verification/

| File | Lines | Status |
|------|-------|--------|
| `verification.controller.ts` | 18 | ✅ Fully implemented |
| `verification.service.ts` | 123 | ✅ Fully implemented |
| `verification.module.ts` | 9 | ✅ Complete |

**Routes (2):**
| Method | Path | Auth | Impl |
|--------|------|------|------|
| `GET` | `/verify/:trackingId` | **None (public)** | ✅ Full chain: plant → strain → batch → lab result → transfers → tenant |
| `POST` | `/verify/report` | **None (public)** | ✅ Logs suspicious report + creates audit event |

**Business Logic:** Public endpoint (no auth). Validates tracking ID format. Resolves full chain of custody by querying transfer items linked to the plant's batch. Returns operator name, lab results summary, chain of custody timeline.
- **Missing:** HMAC signature validation on URLs (qr-lib has signing but endpoint doesn't verify)
- **Missing:** Response caching (CloudFront)
- **No tests**

---

### 1.12 Module: health/

| File | Lines | Status |
|------|-------|--------|
| `health.controller.ts` | 24 | ⚠️ Partial |
| `health.module.ts` | 6 | ✅ Complete |

**Routes (1):**
| Method | Path | Impl |
|--------|------|------|
| `GET` | `/health` | ⚠️ Returns static `{ status: 'ok', services: { database: 'up', redis: 'up', eventBridge: 'up' } }` — **does not actually check services** |

---

### 1.13 Module: common/

| File | Lines | Status |
|------|-------|--------|
| `filters/all-exceptions.filter.ts` | 65 | ✅ Fully implemented (structured JSON errors with correlation ID) |
| `interceptors/logging.interceptor.ts` | 55 | ✅ Fully implemented (structured JSON logging with timing) |
| `interceptors/audit.interceptor.ts` | 174 | ✅ Fully implemented (hash-chained audit events with GPS support) |
| `middleware/tenant-context.middleware.ts` | 26 | ⚠️ Partial (stores context on request but doesn't SET LOCAL on DB) |
| `services/audit-verifier.service.ts` | 141 | ✅ Fully implemented (cron every 6 hours, batch verification) |

---

### 1.14 Module: database/

| File | Lines | Status |
|------|-------|--------|
| `prisma.service.ts` | 46 | ✅ Fully implemented |
| `database.module.ts` | 8 | ✅ Complete (@Global) |

**Notable:** `PrismaService` extends `PrismaClient` with `withTenantContext()` method that sets `SET LOCAL app.current_tenant` for RLS enforcement. **However, this method is not actually called in any service** — services query Prisma directly with `where: { tenantId }` filters rather than using RLS.

---

### 1.15 Backend Summary

| Category | Assessment |
|----------|-----------|
| **Route coverage** | 36 routes across 10 modules — all core CRUD operations implemented |
| **Business logic** | Genuine domain logic (state machines, batch auto-creation, dynamic compliance alerts, chain-of-custody resolution) |
| **Auth & RBAC** | JWT + RolesGuard + TenantGuard working; role-based data filtering in every controller |
| **DTO validation** | ❌ **CRITICAL GAP** — DTOs are TypeScript interfaces (in shared-types), NOT class-validator classes. Despite `ValidationPipe` being enabled globally, request bodies are typed as `any` in controllers. No runtime validation occurs. |
| **Tests** | ❌ **ZERO tests** — no `.spec.ts` files found anywhere in `apps/api/` |
| **Login endpoint** | ❌ Missing — no `AuthController` with `/auth/login` or `/auth/register` |
| **Error handling** | ✅ Global exception filter with structured responses and correlation IDs |
| **Audit trail** | ✅ Hash-chained, automatic for all state-changing operations |
| **Tenant middleware** | ⚠️ `TenantContextMiddleware` exists but RLS `SET LOCAL` not called in real queries |

---

## 2. Database Analysis

### 2.1 Prisma Schema (357 lines)

**14 models defined:**

| Model | Fields | Key Relationships | Tenant-Scoped |
|-------|--------|-------------------|--------------|
| **Tenant** | 13 | → users, permits, facilities, zones, plants, batches, harvests, labResults, transfers, sales | N/A (root) |
| **User** | 11 | → Tenant | Yes |
| **Permit** | 12 | → Tenant, Facility | Yes |
| **Facility** | 12 | → Tenant, zones, plants, permits, harvests, batches, sales | Yes |
| **Zone** | 9 | → Tenant, Facility, plants | Yes |
| **Strain** | 8 | → plants, batches | No (reference data) |
| **Plant** | 15 | → Tenant, Strain, Facility, Zone, motherPlant↔clones (self-ref), Batch | Yes |
| **Batch** | 15 | → Tenant, Strain, Facility, plants, harvests, labResult, parentBatch↔childBatches (self-ref), transferItems, sales | Yes |
| **Harvest** | 10 | → Tenant, Batch, Facility | Yes |
| **LabResult** | 20 | → Tenant, batches | Yes |
| **Transfer** | 16 | → Tenant, items | Yes |
| **TransferItem** | 5 | → Transfer, Batch | Via Transfer |
| **Sale** | 10 | → Tenant, Batch, Facility | Yes |
| **AuditEvent** | 15 | None (standalone) | Optional |

**Total: 14 models, 171 fields, extensive indexing (17 indexes)**

**Key design decisions:**
- All IDs are UUIDs (`@db.Uuid`)
- snake_case `@@map` for table/column names (PostgreSQL convention)
- `autoincrement()` sequence number on AuditEvent for ordering
- Plant self-referential for mother→clone tracking
- Batch self-referential for `harvest → processed → packaged` derivation chain
- JSON type for `boundary` (GeoJSON) and `terpeneProfile`

### 2.2 Migrations

❌ **No migrations exist.** The `prisma/` folder contains only `schema.prisma`. No `prisma/migrations/` directory. Plan.md confirms: "Client generated; no migrations run yet (needs DB)."

### 2.3 Seed Data (555 lines)

✅ **Comprehensive seed file** (`packages/database/src/seed.ts`):
- 5 strains (Durban Poison, Swazi Gold, Malawi Gold, Rooibaard, SA Hemp Cultivar #1)
- 3 tenants (GreenFields – compliant, Cape Cannabis – compliant, Limpopo Growers – non-compliant)
- 6 users (2 operator_admin, 1 operator_staff, 1 regulator, 1 lab_technician)
- 4 facilities (2 cultivation, 1 processing, 1 retail) across WC and LP provinces
- 4 zones with varying capacities
- 3 permits (2 active SAHPRA, 1 expired DALRRD)
- 100 plants across all lifecycle states (seed, seedling, vegetative, flowering, harvested)
- 2 batches (harvest + processed derivative)
- 1 lab result (full CoA with terpene profile)
- 1 harvest event
- 1 transfer (accepted, with quantity discrepancy)
- 2 sales
- 2 audit events (genesis + batch create)

### 2.4 RLS Policies (`infrastructure/docker/post-migration-rls.sql` — 206 lines)

✅ **Comprehensive RLS setup:**
- RLS enabled on all 13 tenant-scoped tables + strains + audit_events
- Operator isolation: `tenant_id = current_setting('app.current_tenant')::uuid`
- Regulator bypass: `current_role IN ('regulator', 'inspector', 'admin')`
- Transfer items: policy joins through `transfers` table for tenant check
- Audit immutability: REVOKE UPDATE/DELETE + trigger preventing modification
- Strains: public read, admin-only modify
- PostGIS: `boundary_geom` geometry column with GIST indexes + sync trigger
- SA coordinate validation constraint (`latitude -35 to -22, longitude 16 to 33`)

### 2.5 Init SQL (`infrastructure/docker/init-db.sql` — 41 lines)

✅ Extensions: `uuid-ossp`, `postgis`, `pgcrypto`  
✅ Roles: `app_user`, `audit_writer`, `app_admin` with appropriate grants

---

## 3. Frontend Apps Analysis

### 3.1 Operator Portal (`apps/web/`) — 60% Complete

**8 pages, all connected to live API via `@ncts/api-client` hooks:**

| Page | Lines | API Hooks Used | Loading/Error | Forms | Status |
|------|-------|---------------|---------------|-------|--------|
| `DashboardPage.tsx` | 83 | `usePlants`, `useFacilities`, `useTransfers` | ✅/✅ | N/A | ✅ Live KPIs + activity table |
| `FacilitiesPage.tsx` | 61 | `useFacilities` | ✅/✅ | ❌ Add button placeholder | ⚠️ Read-only |
| `PlantsPage.tsx` | 82 | `usePlants` | ✅/✅ | State filter Select | ⚠️ Read-only, no register form |
| `PlantRegisterPage.tsx` | 184 | — | — | — | 🔲 Exists but needs verification |
| `HarvestsPage.tsx` | 68 | hooks | ✅/✅ | — | ⚠️ Read-only |
| `TransfersPage.tsx` | 77 | hooks | ✅/✅ | — | ⚠️ Read-only |
| `SalesPage.tsx` | 69 | hooks | ✅/✅ | — | ⚠️ Read-only |
| `LabResultsPage.tsx` | 108 | hooks | ✅/✅ | — | ⚠️ Read-only |

**Layout:** `AppSider.tsx` (83 lines) + `AppHeader.tsx` (47 lines)  
**Routing:** 8 routes in `App.tsx` via React Router  
**Theme:** `theme.ts` (2 lines — imports from `@ncts/ui` likely)

**Missing (from Plan.md):**
- ❌ Facility registration form with Mapbox boundary drawing
- ❌ Plant registration wizard (multi-step)
- ❌ CSV bulk upload
- ❌ Harvest creation form
- ❌ Lab result submission form
- ❌ Transfer initiation wizard
- ❌ Sales entry form
- ❌ Chain-of-custody graph (React Flow)
- ❌ Plant timeline view
- ❌ Inventory dashboard
- ❌ i18n setup

---

### 3.2 Government Dashboard (`apps/admin/`) — 60% Complete

**6 pages, all connected to live API:**

| Page | Lines | API Hooks Used | Loading/Error | Status |
|------|-------|---------------|---------------|--------|
| `NationalDashboard.tsx` | 73 | `useRegulatoryDashboard` | ✅/✅ | ✅ 6 KPI cards + recent activity |
| `OperatorsPage.tsx` | 63 | `useOperators` | ✅/✅ | ✅ Paginated + search |
| `PermitsPage.tsx` | 120 | `usePermits` | ✅/✅ | ✅ Type/status filters |
| `PermitDetailPage.tsx` | 191 | — | — | ⚠️ Exists but detail view |
| `CompliancePage.tsx` | 110 | `useComplianceAlerts` | ✅/✅ | ✅ Severity-tagged alerts |
| `FacilitiesMapPage.tsx` | 110 | `useFacilitiesGeo` | ✅/✅ | ⚠️ Table view (Mapbox deferred) |

**Layout:** `AdminSider.tsx` (45 lines) + `AdminHeader.tsx` (26 lines)

**Missing (from Plan.md):**
- ❌ Mapbox GL interactive map (table placeholder exists)
- ❌ Provincial drill-down
- ❌ Permit approval workflow with notes
- ❌ Inspection management (schema missing)
- ❌ Configurable compliance rules engine UI
- ❌ Reporting & PDF export
- ❌ Charts (ECharts/Recharts) for trends

---

### 3.3 Public Verification (`apps/verify/`) — 50% Complete

**2 pages:**

| Page | Lines | API Hooks Used | Status |
|------|-------|---------------|--------|
| `HomePage.tsx` | 30 | None | ✅ Search input → navigate to `/verify/:trackingId` |
| `VerifyPage.tsx` | 201 | `useVerifyProduct` | ✅ Full verification display with loading/error/not-found states |

**Features implemented:**
- ✅ Loading state with tracking ID display
- ✅ Not-found state with "Product Not Found" message
- ✅ Verification display: status badge, product info, strain, lab results, chain of custody
- ✅ "Report Suspicious Product" button with form and submission
- ✅ Consumer-friendly layout with header/footer

**Missing:**
- ❌ Shadcn/ui + Tailwind (currently uses plain inline CSS and basic CSS)
- ❌ HMAC signature validation
- ❌ SSR for performance
- ❌ PWA/offline support
- ❌ WCAG accessibility audit

---

### 3.4 Unified Portal (`apps/portal/`) — 70% Complete

**The portal app combines all three portals (operator, admin, verify) into a single authenticated SPA.**

| Category | Pages | Lines | Status |
|----------|-------|-------|--------|
| `LoginPage.tsx` | 1 | 97 | ✅ Full login form with demo credentials |
| `AuthContext.tsx` | 1 | 82 | ✅ JWT decode, localStorage, role detection |
| **Operator pages** | 8 | ~380 | ⚠️ Thinner stubs (30-113 lines each) — reference `@ncts/api-client` hooks |
| **Admin pages** | 4 | ~251 | ⚠️ Thinner than standalone admin app |
| **Verify pages** | 2 | ~183 | ✅ Working verification flow |

**Architecture features:**
- ✅ `React.lazy()` code splitting for all pages
- ✅ `ProtectedRoute` component with role-based access
- ✅ Role-based routing: operators → `/operator/*`, regulators → `/admin/*`, public → `/verify/*`
- ✅ Two layout components: `OperatorLayout` (145 lines), `AdminLayout` (134 lines) with Ant Design sidebars
- ✅ Demo login buttons with pre-filled credentials

**Missing:**
- ❌ `POST /auth/login` API endpoint doesn't exist — login form will fail against real API
- ❌ Operator pages are thinner rewrites (less UI polish than standalone `apps/web/`)

---

## 4. Shared Packages Analysis

### 4.1 `@ncts/shared-types` — ✅ Complete (576 lines)

| File | Lines | Contents |
|------|-------|----------|
| `enums.ts` | 122 | 10 enums: UserRole, PlantState, BatchType, TransferStatus, PermitType, PermitStatus, LabResultStatus, ComplianceStatus, AuditAction, Province(implied), FacilityType(implied) |
| `entities.ts` | 231 | 15 entity interfaces: Tenant, User, Permit, Facility, Zone, Strain, Plant, Batch, Harvest, LabResult, Transfer, TransferItem, Sale, AuditEvent, GeoJsonPolygon |
| `dto.ts` | 219 | 17 DTOs: CreateFacility, UpdateFacility, CreatePlant, BatchCreatePlants, UpdatePlantState, PlantFilter, CreateHarvest, CreateLabResult, CreateTransfer, AcceptTransfer, RejectTransfer, CreateSale, Login, TokenResponse, CurrentUser, RegulatoryDashboard, ProductVerification |
| `common.ts` | 68 | ApiError, HealthCheckResponse, constants (TRACKING_ID_REGEX, SA_BOUNDS, DEFAULT_THRESHOLDS), 11 supported locales |
| `index.ts` | 10 | Barrel export |

**Assessment:** Comprehensive type definitions shared between frontend and backend. DTOs are **interfaces** (design-time only), not class-validator **classes** (runtime). This is the expected pattern for a shared-types package, but the backend needs its own class-validator DTO layer.

---

### 4.2 `@ncts/audit-lib` — ✅ Complete (78 lines)

| Export | Description |
|--------|-------------|
| `GENESIS_HASH` | Known constant for first event's previous hash |
| `computeEventHash(event)` | SHA-256 of `id|entityType|entityId|action|actorId|JSON(payload)|previousHash|createdAt` |
| `verifyChain(events)` | Walks chain, recomputes hashes, detects tampering; returns `{valid, checkedCount, brokenAt}` |

**Assessment:** Fully implemented. Used by `AuditInterceptor` and `AuditVerifierService`.

---

### 4.3 `@ncts/crypto-lib` — ✅ Complete (45 lines)

| Export | Description |
|--------|-------------|
| `encrypt(plaintext, key)` | AES-256-GCM encryption → `iv:ciphertext:authTag` (base64) |
| `decrypt(encryptedString, key)` | AES-256-GCM decryption |
| `hashForLookup(value, salt)` | SHA-256 with salt (for SA ID numbers etc.) |

**Assessment:** Fully implemented but **not integrated** — no API service uses encryption yet. Designed for POPIA compliance (Phase 6).

---

### 4.4 `@ncts/qr-lib` — ✅ Complete (50 lines)

| Export | Description |
|--------|-------------|
| `generateVerificationUrl(trackingId, baseUrl, secret)` | HMAC-SHA256 signed URL (truncated to 16 chars) |
| `verifySignature(trackingId, signature, secret)` | Timing-safe HMAC validation |
| `generateTrackingId(year, sequence)` | `NCTS-ZA-{YEAR}-{6-digit}` |

**Assessment:** Signing and verification implemented. **Not integrated** — the verification endpoint doesn't validate HMAC signatures, and no QR SVG generation endpoint exists.

---

### 4.5 `@ncts/api-client` — ✅ Complete (~430 lines)

| File | Lines | Contents |
|------|-------|----------|
| `client.ts` | 90 | Typed fetch wrapper with GET/POST/PATCH/PUT/DELETE, auto-attached Bearer token from localStorage |
| `hooks/use-facilities.ts` | 56 | `useFacilities`, `useFacility`, `useFacilityZones`, `useCreateFacility`, `useUpdateFacility`, `useCreateZone` |
| `hooks/use-plants.ts` | 55 | `usePlants`, `usePlant`, `useCreatePlant`, `useBatchRegisterPlants`, `useUpdatePlantState` |
| `hooks/use-batches.ts` | 23 | `useBatches`, `useBatch` |
| `hooks/use-harvests.ts` | 40 | `useHarvests`, `useHarvest`, `useCreateHarvest`, `useUpdateHarvest` |
| `hooks/use-lab-results.ts` | 38 | `useLabResults`, `useLabResult`, `useLabResultsByBatch`, `useSubmitLabResult` |
| `hooks/use-transfers.ts` | 56 | `useTransfers`, `useTransfer`, `useInitiateTransfer`, `useAcceptTransfer`, `useRejectTransfer` |
| `hooks/use-sales.ts` | 36 | `useSales`, `useSale`, `useRecordSale` |
| `hooks/use-regulatory.ts` | 85 | `useRegulatoryDashboard`, `useRegulatoryTrends`, `useFacilitiesGeo`, `useOperators`, `usePermits`, `useUpdatePermitStatus`, `useComplianceAlerts` |
| `hooks/use-verification.ts` | 15 | `useVerifyProduct` |
| `hooks/index.ts` | 9 | Barrel re-export of all 38 hooks |

**Assessment:** All TanStack React Query hooks for all 36 API endpoints, with proper query key factories, cache invalidation on mutations, and typed generics. This is the glue between frontend and backend.

---

### 4.6 `@ncts/database` — ✅ Complete

| File | Lines | Contents |
|------|-------|----------|
| `src/index.ts` | 2 | Re-exports `PrismaClient` and types from `@prisma/client` |
| `src/seed.ts` | 555 | Comprehensive seed script (see Section 2.3) |
| `prisma/schema.prisma` | 357 | Full schema (see Section 2.1) |

---

### 4.7 `@ncts/ui` — ⚠️ Partial (~90 lines)

| File | Lines | Description |
|------|-------|-------------|
| `src/index.ts` | 4 | Exports 3 components |
| `src/theme/index.ts` | 44 | Ant Design theme config (colors, fonts, component overrides) |
| `src/components/StatusBadge.tsx` | 25 | Status badge component |
| `src/components/TrackingId.tsx` | 16 | Monospace tracking ID display |
| `src/components/NctsLogo.tsx` | 27 | SVG logo component |

**Assessment:** Minimal. Theme is defined correctly but apps duplicate some theme values locally. Only 3 utility components. Missing the rich component library envisioned in Plan.md.

---

### 4.8 `@ncts/eslint-config` — ✅ Complete

| File | Description |
|------|-------------|
| `base.js` | Base ESLint config |
| `react.js` | React-specific rules |
| `nestjs.js` | NestJS-specific rules |

### 4.9 `@ncts/tsconfig` — ✅ Complete

| File | Description |
|------|-------------|
| `base.json` | Strict TypeScript base |
| `react-app.json` | React app config |
| `react-library.json` | React library config |
| `nestjs.json` | NestJS config |

---

## 5. Infrastructure Analysis

### 5.1 Docker Compose — ✅ Complete

4 services configured:
| Service | Image | Port | Status |
|---------|-------|------|--------|
| PostgreSQL 16 + PostGIS 3.4 | `postgis/postgis:16-3.4` | 5432 | ✅ With init-db.sql mount |
| Redis 7 | `redis:7-alpine` | 6379 | ✅ With health check |
| Mailpit | `axllent/mailpit` | 1025/8025 | ✅ SMTP + Web UI |
| LocalStack 3 | `localstack/localstack:3` | 4566 | ✅ S3, SES, EventBridge |

### 5.2 Terraform — ❌ Empty

`infrastructure/terraform/` contains only `.gitkeep`. No IaC defined.

**Plan.md requires:** ECS Fargate, RDS, S3, CloudFront, EventBridge, WAF, Cognito, Secrets Manager — all in af-south-1.

### 5.3 Scripts — ❌ Empty

`infrastructure/scripts/` contains only `.gitkeep`.

### 5.4 CI/CD — ✅ Complete

`.github/workflows/ci.yml` (87 lines):
- **Trigger:** push to main, PRs to main
- **Concurrency:** cancel-in-progress for same ref
- **Jobs:**
  1. `lint-typecheck` — pnpm install → lint → type-check
  2. `test` (needs lint-typecheck) — pnpm test
  3. `build` (needs lint-typecheck) — pnpm build → upload artifacts

**Missing:** No deploy stage, no staging/production environments, no Docker image build, no Terraform apply.

### 5.5 Vercel Config

- `vercel.json` (root) — exists
- `apps/admin/vercel.json` — exists
- `apps/verify/vercel.json` — exists
- `apps/web/vercel.json` — exists

### 5.6 Docs

| File | Status |
|------|--------|
| `docs/FrontEnd.md` | Exists |
| `docs/api/` | Directory exists |
| `docs/architecture/` | Directory exists |
| `docs/compliance/` | Directory exists |

---

## 6. Plan.md Gap Analysis

### Phase 0 — Project Bootstrap (Target: Week 1-2)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Monorepo (Turborepo + pnpm) | ✅ Done | — |
| Shared tooling (ESLint, Prettier, Husky) | ✅ 90% | Commitlint config exists but "missing" per Plan.md |
| Docker Compose | ✅ Done | — |
| NestJS scaffold (Fastify, health, Swagger) | ✅ Done | — |
| React app scaffolds | ⚠️ 75% | verify missing Shadcn/Tailwind |
| CI pipeline | ✅ Done | — |
| Design system | ⚠️ 70% | Theme duplicated across apps; `@ncts/ui` not authoritative yet |

### Phase 1 — Foundation Layer (Target: Weeks 3-6)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Prisma schema (13 entities) | ✅ Done | 14 models (includes TransferItem) |
| RLS + triggers + audit constraints | ✅ Done | `post-migration-rls.sql` comprehensive |
| Prisma migrations | ❌ TODO | Schema exists, no migrations generated/run |
| Seed data | ✅ Done | 3 tenants, 100 plants, full chain |
| Cognito setup | ❌ TODO | Dev-mode JWT only |
| NestJS auth module | ✅ Done | JWT strategy, guards, decorators |
| JWT refresh/blacklist | ⚠️ Partial | Refresh token method exists, no endpoint, no Redis blacklist |
| audit-lib hash-chaining | ✅ Done | `computeEventHash` + `verifyChain` |
| AuditInterceptor | ✅ Done | Automatic for POST/PUT/PATCH/DELETE |
| Audit verifier cron | ✅ Done | Every 6 hours |
| Transactional Outbox | ❌ TODO | |
| EventBridge integration | ❌ TODO | |

### Phase 2 — Operator Module (Target: Weeks 7-14)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Facility CRUD API | ✅ Done | 6 routes |
| Plant API (register, batch, state, list) | ✅ Done | 4 routes with state machine |
| Harvest API | ✅ Done | Transactional with batch auto-creation |
| Lab Result API | ✅ Done | CoA with pass/fail |
| Transfer API (initiate, accept, reject) | ✅ Done | 5 routes |
| Sales API | ✅ Done | 3 routes |
| Web UI — Dashboard | ✅ Done | Live KPIs |
| Web UI — Facilities list | ✅ Done | Paginated table |
| Web UI — Plants list | ✅ Done | State filter |
| Web UI — Harvests list | ✅ Done | |
| Web UI — Transfers list | ✅ Done | |
| Web UI — Sales list | ✅ Done | |
| Web UI — Lab Results list | ✅ Done | Expandable rows |
| Web UI — Facility map (Mapbox) | ❌ TODO | |
| Web UI — Plant registration wizard | ❌ TODO | |
| Web UI — CSV bulk upload | ❌ TODO | |
| Web UI — Chain-of-custody graph | ❌ TODO | |
| Web UI — Harvest/transfer/sale forms | ❌ TODO | Read-only pages only |

### Phase 3 — Regulatory Module (Target: Weeks 15-20)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Dashboard API (KPIs + trends) | ✅ Done | |
| GeoJSON API | ✅ Done | |
| Operators API | ✅ Done | |
| Permits API + status update | ✅ Done | |
| Compliance alerts API | ✅ Done | Dynamic from real data |
| Admin UI — National Dashboard | ✅ Done | |
| Admin UI — Operators page | ✅ Done | |
| Admin UI — Permits page | ✅ Done | |
| Admin UI — Compliance page | ✅ Done | |
| Admin UI — Facilities map page | ✅ Done | Table placeholder |
| Mapbox GL interactive map | ❌ TODO | |
| Inspection management (API + UI) | ❌ TODO | No Inspection model in schema |
| Compliance rules engine (configurable) | ❌ TODO | Rules currently hardcoded |
| Permit detail workflow UI | ❌ TODO | API exists |
| Reporting & PDF export | ❌ TODO | |

### Phase 4 — Verification Module (Target: Weeks 21-23)

| Requirement | Status | Gap |
|-------------|--------|-----|
| qr-lib HMAC signing | ⚠️ Partial | Library exists; not integrated with endpoint |
| QR code API endpoints | ❌ TODO | No `/qr/:batchId` endpoint |
| Verification API | ✅ Done | Public, chain-of-custody resolution |
| Verify UI — Home + VerifyPage | ✅ Done | Working with API hooks |
| Shadcn/Tailwind migration | ❌ TODO | |
| Report suspicious product | ⚠️ Partial | UI exists; backend logs but no dedicated table |

### Phases 5-7 — Not Started

| Phase | Status |
|-------|--------|
| Phase 5 — Mobile App & Offline | ❌ Not started |
| Phase 6 — Security Hardening & POPIA | ❌ Not started (crypto-lib prepared) |
| Phase 7 — Integration, Testing & Pilot | ❌ Not started |

---

## 7. Critical Gaps (Ordered by Priority)

1. **No `AuthController` / login endpoint** — Portal has login form but no API endpoint to authenticate against. Cannot demo the app end-to-end. **Blocks:** all frontend apps.

2. **No class-validator DTO classes** — Despite `ValidationPipe` being enabled, all controller params are `any`. No runtime request validation. Malformed requests will reach Prisma and throw unstructured errors. **Blocks:** production readiness, security.

3. **No Prisma migrations** — Schema exists but no migrations generated or run. No database has ever been provisioned. **Blocks:** any live demo.

4. **Zero backend tests** — No unit tests, no integration tests, no E2E tests. `pnpm test` likely returns empty or fails. **Blocks:** CI reliability, refactoring confidence.

5. **No form UIs** — All frontend pages are read-only tables. No facility registration, plant registration, harvest creation, transfer initiation, or sale recording forms exist. **Blocks:** Phase 2 completion.

6. **RLS not wired at application level** — `PrismaService.withTenantContext()` exists but is never called. Services use `where: { tenantId }` instead. If a developer forgets the filter, data leaks. **Blocks:** multi-tenant security.

7. **No Terraform / cloud infrastructure** — Zero AWS resources defined. **Blocks:** Phases 5-7 (deployment).

8. **Inspection model missing from Prisma schema** — Plan.md Phase 3.4 requires inspections. No model defined. **Blocks:** regulatory module completion.

9. **No event system** — Transactional Outbox and EventBridge integration not started. **Blocks:** real-time notifications, event-driven architecture.

10. **Verify app not migrated to Shadcn/Tailwind** — Uses inline CSS. Doesn't match Plan.md design spec.

---

## 8. Technical Debt

1. **DTOs typed as `any` in controllers** — Every controller uses `@Body() dto: any`. Must refactor to type-safe class-validator classes.

2. **Theme duplication** — `apps/web/src/theme.ts` and `apps/admin/src/theme.ts` exist (2 lines each, likely imports) but `@ncts/ui/theme` should be the single authoritative source.

3. **Health check is static** — Returns hardcoded `{ database: 'up', redis: 'up' }` without actually checking.

4. **TenantContextMiddleware doesn't execute `SET LOCAL`** — Only stores context on request object; RLS session variables never set in PostgreSQL.

5. **`require('crypto')` in verification service** — Line 121 of `verification.service.ts` uses CommonJS `require()` inside a module that should use ESM imports.

6. **Regulatory `updatePermitStatus` skips hash-chaining** — Creates audit event with empty `previousHash` and `eventHash` instead of computing proper hash chain.

7. **Transfer number generation uses `count()`** — Not atomic. Under concurrent requests, could produce duplicate transfer numbers. Same for sale numbers.

8. **No rate limiting** — Plan.md specifies `@nestjs/throttler` with different limits per route category. Not implemented.

9. **No Redis integration** — Redis is in Docker Compose but no NestJS module uses it (no caching, no sessions, no token blacklist).

10. **Plant batch registration is sequential** — `batchCreate` loops over plants one at a time with `await this.create()`. Should use `createMany` or a single transaction for performance.

---

*End of Analysis Report*
