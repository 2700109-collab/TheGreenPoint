# NCTS Production-Ready Plan

> **Date:** 2026-02-23  
> **Status:** Draft  
> **Apps:** Portal (`ncts-portal-ivory.vercel.app`) • Verify (`ncts-alpha.vercel.app`)

---

## Current State Summary

### Critical Blockers
| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 1 | **Portal white screen** — Vercel `routes` config catches static assets (JS/CSS) and serves `index.html` instead | Portal 100% broken | ✅ FIXED |
| 2 | **Verify white screen** — Same `routes` issue; JS served as `text/html` | Verify 100% broken | ✅ FIXED |
| 3 | **Verify app not deployed to `ncts` project** — Portal was deployed to both projects | Verify unreachable | ✅ FIXED |
| 4 | **schema.prisma corrupted** — Error logs pasted at top of file | Prisma generate fails | ✅ FIXED |
| 5 | **DATABASE_URL mismatch** — Vercel pointed to `neondb`, local used `ncts_dev` | All DB endpoints returned 500 | ✅ FIXED |
| 6 | **Regulatory trends route shadowed** — Generic `/dashboard` matched before `/dashboard/trends` | Trends endpoint unreachable | ✅ FIXED |
| 7 | **Debug stack traces in production errors** — 500 responses leaked full stack traces | Security risk | ✅ FIXED |

### High-Severity Issues
| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 8 | Chinese text in Ant Design / ProComponents (no locale set) | Tables, pagination, forms show Chinese defaults | Phase 2 |
| 9 | 12+ "Coming Soon" placeholder pages (batches, outgoing/incoming transfers, etc.) | Dead-end navigation | Phase 4 |
| 10 | All 40 page components use hardcoded mock data | No real data anywhere | Phase 3 |
| 11 | 33+ API endpoints missing from serverless function | Frontend hooks return 404s | Phase 3 |
| 12 | KPI cards (Active Plants, Pending Transfers, Monthly Sales) link to 404 | Dashboard clicks go nowhere | Phase 2 |
| 13 | "Register Plant", "Record Harvest", "Create Transfer", "Record Sale" buttons → 404 | All action buttons broken | Phase 2 |
| 14 | Debug `console.log` statements across all files | Noise in production | Phase 2 |
| 15 | **API client "body stream already read"** — `handleResponse` calls `response.json()` then `response.text()` on failure, consuming stream twice | Verify app crashes on API errors | Phase 2 |
| 16 | **Header overlaps content** — header not connected to nav panel, covers page content | UI broken on all pages | Phase 2 |
| 17 | **No sign-out button** on nav panel | Users can't log out | Phase 2 |
| 18 | **Dashboard poorly positioned** — layout not centered/aligned, not responsive | Bad UX on all screen sizes | Phase 2 |
| 19 | **Modal/drawer forms (Record Sale, Edit) render as side panel** — ugly, header overlaps | Forms unusable | Phase 2 |
| 20 | **Nav panel selection highlight stuck** — e.g. "Plants" stays highlighted after clicking another page | Confusing navigation | Phase 2 |
| 21 | **Nav panel font selection color too dark** — hard to see active item | Poor readability | Phase 2 |

### Medium-Severity Issues
| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 22 | QR scanner regex doesn't match `NCTS-ZA-*` format | QR scan fails silently | Phase 2 |
| 23 | Verify report form not wired to API | User reports go nowhere | Phase 2 |
| 24 | PhaseBanner inconsistency (`beta` vs `pilot`) | Confusing branding | Phase 2 |
| 25 | No admin profile page/route | Admin "My Profile" link → 404 | Phase 2 |
| 26 | Auth only supports demo accounts (2 hardcoded) | No real user registration/auth | Phase 5 |

---

## Phase 1 — DEPLOYMENT & WHITE SCREEN FIX ⚡ ✅ APPROVED

**Goal:** Both apps load and are reachable. Login works. Verify lookup works.

### 1.1 Fix Vercel Routing (Portal)
- [x] In `vercel.json`, add `{ "handle": "filesystem" }` before the SPA catch-all
- [x] Final `routes` config applied
- [x] Redeploy portal to `ncts-portal` Vercel project

### 1.2 Fix Vercel Routing (Verify)
- [x] In `apps/verify/vercel.json`, add `{ "handle": "filesystem" }` before SPA catch-all
- [x] `vercel.verify.json` (root) also has correct proxy + filesystem + SPA config

### 1.3 Deploy Verify to Correct Project
- [x] Verify app deployed to `ncts` project (alias: `ncts-alpha.vercel.app`) using config swap
- [x] JS assets return `application/javascript` MIME type

### 1.4 Fix schema.prisma Corruption
- [x] Removed error log text accidentally pasted at lines 1-11
- [x] `prisma generate` confirmed valid (v6.19.2)
- [x] Committed and pushed

### 1.5 Fix Database Connection
- [x] Identified DATABASE_URL mismatch: Vercel had `neondb`, local had `ncts_dev`
- [x] Updated Vercel env vars (`DATABASE_URL`, `DIRECT_URL`) to point to `ncts_dev`
- [x] Ran `prisma db push --force-reset` — 31 tables created in Neon
- [x] Seeded database: 2 tenants, 50 plants, 1 batch, 1 transfer

### 1.6 Fix API Route Bugs
- [x] Fixed regulatory trends route shadowing (specific `/dashboard/trends` now checked before generic `/dashboard`)
- [x] Removed debug stack traces from production 500 error responses

### 1.7 Validation ✅ ALL PASS
- [x] Portal loads at `ncts-portal-ivory.vercel.app` — login page visible
- [x] Demo login works: `operator@greenpoint.co.za` / `GreenPoint2026!` → 200 + JWT
- [x] Verify app loads at `ncts-alpha.vercel.app` — search form visible
- [x] Tracking ID lookup works: `GET /verify/NCTS-ZA-2026-000001` → 200 with product data
- [x] Health endpoint works on both domains
- [x] Seed endpoint works: `POST /seed` → 200
- [x] Facilities endpoint works: `GET /facilities` → 200

---

## Phase 2 — UI/UX OVERHAUL & CRITICAL BUG FIXES 🎨

**Goal:** Fix all UI/UX issues, Chinese text, broken navigation, API client bug, layout/header/nav problems.

### 2.1 Fix API Client "Body Stream Already Read" Bug (CRITICAL)
- [ ] In `packages/api-client/src/client.ts` `handleResponse()`: the error path calls `response.json()` which fails, then `response.text()` — but the body stream is already consumed
- [ ] **Fix:** Read `response.text()` first, then try `JSON.parse()` on the text:
  ```ts
  const text = await response.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  ```
- [ ] This fixes the verify app crashing with "Failed to execute 'text' on 'Response': body stream already read"

### 2.2 Fix Chinese Text (Ant Design Locale)
- [ ] Add `locale={enUS}` to `<ConfigProvider>` in `apps/portal/src/main.tsx`:
  ```tsx
  import enUS from 'antd/locale/en_US';
  <ConfigProvider theme={themeConfig} locale={enUS}>
  ```
- [ ] For `@ant-design/pro-components`, wrap app in `<ProConfigProvider>` with `intl` set to `enUSIntl`
- [ ] Verify ALL table column headers, pagination, datepicker, empty states, form labels show English
- [ ] Check every ProTable, ProForm, ProLayout instance for Chinese fallbacks

### 2.3 Fix Header & Navigation Panel (Layout Overhaul)
- [ ] **Header overlaps content** — Fix the ProLayout/header CSS so the header sits flush above the content area, not floating over it
- [ ] **Header not connected to nav panel** — Ensure the header bar spans the full width and visually connects to the sidebar
- [ ] **Add Sign Out button to nav panel** — Add a clearly visible logout/sign-out action in the sidebar footer or user dropdown
- [ ] **Dashboard positioning** — Center the dashboard content properly using Ant Design Grid (`Row`/`Col`) with proper `gutter` and responsive `span` values
- [ ] Research and apply modern dashboard layout principles (card grid, proper spacing, responsive breakpoints)
- [ ] Ensure layout works for **laptop** (1024px+), **tablet** (768px+), and **mobile** (320px+) screens

### 2.4 Fix Navigation Panel Issues
- [ ] **Selection highlight stuck** — Fix ProLayout `selectedKeys` / `location.pathname` so the active menu item updates when navigating to a new page
- [ ] **Font selection color too dark** — Change the active/selected menu item color to a light blue glow (e.g. `#4FC3F7` or similar) instead of dark text
- [ ] Ensure menu items have proper hover states and visual feedback
- [ ] Fix any menu item that doesn't have a matching route

### 2.5 Fix Broken Action Button Links
- [ ] **KPI cards** (Active Plants, Pending Transfers, Monthly Sales) — Fix `onClick` handlers to navigate to correct routes (`/operator/plants`, `/operator/transfers`, `/operator/sales`)
- [ ] **"Register Plant" button** — Fix link/route to `/operator/plants/register`
- [ ] **"Record Harvest" button** — Fix link/route to `/operator/harvests` (with create modal/drawer)
- [ ] **"Create Transfer" button** — Fix link/route to `/operator/transfers` (with create modal)
- [ ] **"Record Sale" button** — Fix link/route to `/operator/sales` (with create modal)
- [ ] Verify ALL dashboard quick-action buttons navigate to valid pages

### 2.6 Fix Modal/Drawer Forms (Record Sale, Edit, etc.)
- [ ] **Change side drawers to centered modal popups** — Use Ant Design `<Modal>` instead of `<Drawer>` for create/edit forms
- [ ] Ensure modals have proper z-index above the header (no overlap)
- [ ] Modals should be a reasonable width (600-800px on desktop, full-width on mobile)
- [ ] Apply consistent modal pattern across all create/edit forms: Record Sale, Edit Plant, Create Transfer, Record Harvest

### 2.7 Fix Broken Nav Links / Missing Routes
- [ ] **`/operator/settings/notifications`** — Add route or redirect to `SettingsPage` with Notifications tab active
- [ ] **`/admin/profile`** — Create `AdminProfilePage` or redirect to `/admin/settings`
- [ ] **`/feedback`** — Create simple feedback form page

### 2.8 PhaseBanner Consistency
- [ ] Audit all layouts for `phase=` prop — pick one (`beta` or `pilot`) and apply everywhere

### 2.9 Remove Debug Logging
- [ ] Remove all `[AUTH-DEBUG]` logging from `AuthContext.tsx`
- [ ] Remove all `[LOGIN-PAGE-DEBUG]` logging from `LoginPage.tsx`
- [ ] Remove all `[API-CLIENT-DEBUG]` logging from `packages/api-client/src/client.ts`
- [ ] Remove all `[VERIFY-*-DEBUG]` logging from verify app pages (`VerifyPage.tsx`, `HomePage.tsx`)
- [ ] Remove all `[SERVER-*-DEBUG]` logging from `api/v1/[...path].ts` (26 statements)
- [ ] Remove all `[VERIFY-HOOK-DEBUG]` logging from `use-verification.ts`

### 2.10 Verify App Fixes
- [ ] Fix QR scanner regex in `ScanPage.tsx` to match `NCTS-ZA-\d{4}-\d{4,8}` format
- [ ] Wire suspicious product report form to `POST /api/v1/verify/report`
- [ ] Fix footer links to use React Router `<Link>` instead of `<a href>`

### 2.11 Validation
- [ ] No Chinese text visible on any page (all English)
- [ ] Header properly positioned — no content overlap
- [ ] Sign-out button visible and working
- [ ] Dashboard centered and responsive (laptop/tablet/mobile)
- [ ] All sidebar nav items navigate correctly (highlight updates)
- [ ] Active nav item shown with light blue glow
- [ ] KPI cards clickable → correct pages
- [ ] All action buttons (Register Plant, Record Harvest, etc.) → correct pages
- [ ] Create/edit forms appear as centered modals (not side drawers)
- [ ] PhaseBanner consistent
- [ ] No debug console.log noise
- [ ] Verify app: API errors handled without "body stream" crash
- [ ] Verify app: QR scanner works with NCTS-ZA format

---

## Phase 3 — WIRE PAGES TO REAL API DATA 🔌

**Goal:** Replace all hardcoded mock data with live API calls using existing hooks.

### 3.1 Implement Missing API Endpoints (Serverless Function)

#### Auth Endpoints
- [ ] `POST /auth/forgot-password` — Generate reset token, store in Redis/DB, return success (anti-enumeration)
- [ ] `POST /auth/reset-password` — Validate token, update password hash
- [ ] `POST /auth/change-password` — Validate current password, update, invalidate sessions
- [ ] `POST /auth/refresh` — Validate refresh token, return new pair
- [ ] `POST /auth/logout` — Blacklist tokens
- [ ] `GET /auth/me` — Return current user from JWT payload
- [ ] `POST /auth/mfa/setup` — Generate TOTP secret, return QR URI
- [ ] `POST /auth/mfa/verify` — Validate TOTP code

#### CRUD Write Endpoints
- [ ] `PATCH /facilities/:id` — Update facility
- [ ] `POST /facilities/:id/zones` — Create zone
- [ ] `GET /harvests/:id` — Get single harvest
- [ ] `POST /harvests` — Create harvest
- [ ] `PATCH /harvests/:id` — Update harvest
- [ ] `GET /lab-results/:id` — Get single lab result
- [ ] `GET /lab-results/batch/:batchId` — Get lab results by batch
- [ ] `POST /lab-results` — Submit lab result
- [ ] `GET /transfers/:id` — Get single transfer
- [ ] `POST /transfers` — Initiate transfer
- [ ] `PATCH /transfers/:id/accept` — Accept transfer
- [ ] `PATCH /transfers/:id/reject` — Reject transfer  
- [ ] `GET /sales/:id` — Get single sale
- [ ] `POST /sales` — Record sale

#### Admin/Regulatory Endpoints
- [ ] `GET /inspections` — List inspections (paginated)
- [ ] `GET /inspections/:id` — Get single inspection
- [ ] `POST /inspections` — Create inspection
- [ ] `PATCH /inspections/:id` — Update inspection
- [ ] `GET /inspections/analytics` — Inspection statistics
- [ ] `GET /audit` — Audit log (paginated)
- [ ] `GET /settings` — System settings
- [ ] `PATCH /settings` — Update system settings
- [ ] `GET /admin/users` — List admin users
- [ ] `GET /regulatory/sales-aggregate` — Sales aggregate data
- [ ] `GET /regulatory/compliance-average` — Compliance average

#### Dashboard/Utility Endpoints
- [ ] `GET /operators/:id/dashboard` — Operator dashboard data
- [ ] `GET /operators/:id/activity` — Activity feed
- [ ] `GET /search` — Global search
- [ ] `GET /notifications` — User notifications
- [ ] `PATCH /notifications/:id/read` — Mark notification read

### 3.2 Wire Operator Pages to API

For each page, replace the `MOCK_*` constants with the corresponding `use*()` hook from `@ncts/api-client`:

| Page | Current State | Target Hook(s) |
|------|---------------|-----------------|
| `OperatorDashboard` | 8 hardcoded stats + mock charts | `useOperatorDashboard`, `useActivityFeed`, `usePlants`, `useTransfers` |
| `FacilitiesPage` | Mock facility array | `useFacilities`, `useCreateFacility` |
| `PlantsPage` | Mock plant array | `usePlants`, `useUpdatePlantState` |
| `PlantRegisterPage` | Mock form submission | `useCreatePlant`, `useBatchRegisterPlants` |
| `PlantDetailPage` | Mock plant object | `usePlant` |
| `HarvestsPage` | Mock harvest array | `useHarvests`, `useCreateHarvest` |
| `TransfersPage` | Mock transfer array | `useTransfers`, `useInitiateTransfer` |
| `TransferDetailPage` | Mock transfer object | `useTransfer`, `useAcceptTransfer`, `useRejectTransfer` |
| `SalesPage` | Mock sales array | `useSales`, `useRecordSale` |
| `SaleDetailPage` | Mock sale object | `useSale` |
| `LabResultsPage` | Mock lab results | `useLabResults` |
| `ProfilePage` | Mock profile data | `useCurrentUser`, `useFacilities` |
| `SettingsPage` | Mock settings form | `useSystemSettings`, `useUpdateSystemSettings` |

### 3.3 Wire Admin Pages to API

| Page | Current State | Target Hook(s) |
|------|---------------|-----------------|
| `NationalDashboard` | Mock stats + charts | `useRegulatoryDashboard`, `useRegulatoryTrends` |
| `OperatorsPage` | Mock operator list | `useOperators` |
| `OperatorDetailPage` | Mock operator detail | `useOperators` (by ID), `usePlants`, `useTransfers` |
| `PermitsPage` | Mock permits list | `usePermits` |
| `PermitDetailPage` | Mock permit detail | `usePermits` (by ID), `useUpdatePermitStatus` |
| `CompliancePage` | Mock compliance data | `useComplianceAlerts`, `useComplianceAverage` |
| `FacilitiesMapPage` | Mock geo data | `useFacilitiesGeo` |
| `ReportsPage` | Mock report tables | `useSalesAggregate`, `useRegulatoryDashboard` |
| `AuditLogPage` | Mock audit entries | `useAuditLog` |
| `SystemSettingsPage` | Mock settings | `useSystemSettings`, `useUpdateSystemSettings`, `useAdminUsers` |
| `InspectionsPage` | Mock inspections | `useInspections`, `useInspectionAnalytics` |
| `CreateInspectionPage` | Mock form submission | `useCreateInspection` |
| `InspectionDetailPage` | Mock inspection detail | `useInspection`, `useUpdateInspection` |

### 3.4 Wire Verify App Report Form
- [ ] Connect `handleReportSubmit()` in `VerifyPage.tsx` to `POST /api/v1/verify/report`
- [ ] Store suspicious reports in `SuspiciousReport` table (not just `console.log`)
- [ ] Persist `VerificationLog` entries for each scan

### 3.5 Validation
- [ ] Every page loads data from the API (no hardcoded arrays)
- [ ] Create/update mutations submit to API and invalidate relevant queries
- [ ] Loading states show skeleton/spinner
- [ ] Error states show meaningful error messages
- [ ] Empty states show `EntityEmptyState` component

---

## Phase 4 — BUILD MISSING PAGES 🏗️

**Goal:** Replace all 12 ComingSoon placeholder pages with real, functional pages.

### 4.1 Operator Pages

#### Batches Page (`/operator/plants/batches`)
- [ ] ProTable listing all batches for the operator's tenant
- [ ] Columns: Batch Number, Strain, Facility, Plant Count, Weight, Status, Date
- [ ] Create Batch drawer/modal with StepsForm
- [ ] Link to batch detail showing associated plants and lab results

#### Outgoing Transfers (`/operator/transfers/outgoing`)
- [ ] Filtered view of `TransfersPage` where `senderTenantId` matches current user
- [ ] Quick actions: View manifest, Track shipment, Cancel transfer

#### Incoming Transfers (`/operator/transfers/incoming`)
- [ ] Filtered view where `receiverTenantId` matches current user
- [ ] Quick actions: Accept, Reject, View manifest, Confirm receipt

### 4.2 Admin Pages

#### Operator Applications (`/admin/operators/applications`)
- [ ] ProTable of pending operator/license applications
- [ ] Status workflow: Submitted → Under Review → Approved/Rejected
- [ ] Detail drawer with application documents, inspector notes, approval actions

#### Pending Permits (`/admin/permits/pending`)
- [ ] Filtered view of `PermitsPage` where `status === 'pending'`
- [ ] Bulk approve/reject actions
- [ ] Review checklist per permit

#### Expired Permits (`/admin/permits/expired`)
- [ ] Filtered view where `status === 'expired'`
- [ ] Renewal notification actions
- [ ] Suspension workflow

#### Active Compliance Alerts (`/admin/compliance/alerts`)
- [ ] ProTable of active `ComplianceAlert` records
- [ ] Severity-based filtering and sorting
- [ ] Acknowledge/dismiss/escalate actions
- [ ] Link to source entity (permit, operator, facility)

#### All Facilities (`/admin/facilities`)
- [ ] ProTable of all facilities across all tenants
- [ ] Columns: Name, Operator, Type, Province, Status, Compliance
- [ ] Link to facility detail and map view
- [ ] Inspection schedule button

#### Plant Registry (`/admin/tracking/plants`)
- [ ] System-wide plant tracking view (cross-tenant)
- [ ] Filter by state, strain, facility, date range
- [ ] Export to CSV for INCB reporting
- [ ] Link to chain-of-custody audit trail

#### Supply Chain Transfers (`/admin/tracking/transfers`)
- [ ] System-wide transfer monitoring
- [ ] Active transfer tracking with timeline
- [ ] Flagged/suspicious transfers highlighted
- [ ] Chain-of-custody verification

#### Supply Chain Sales (`/admin/tracking/sales`)
- [ ] System-wide sales monitoring
- [ ] Daily/weekly/monthly aggregations
- [ ] Excise duty calculations
- [ ] Customer verification status

### 4.3 Missing Utility Pages

#### Admin Profile (`/admin/profile`)
- [ ] Admin user info card (name, role, department)
- [ ] Activity log of admin actions
- [ ] Security settings (change password, MFA status)

#### Feedback Page (`/feedback`)
- [ ] Simple form: Category (Bug/Feature/Other), Description, Email (optional)
- [ ] Submit to API endpoint or external service
- [ ] Thank-you confirmation

#### Support Page (`/support`)  
- [ ] Replace the reused `AboutPage` with a proper support page
- [ ] Contact information, FAQ, support hours
- [ ] Link to documentation

#### Report Issue Page (`/report-issue`)
- [ ] Replace with proper issue reporting form
- [ ] System info auto-capture (browser, screen size, current page)
- [ ] Screenshot upload (optional)

### 4.4 Validation
- [ ] All sidebar nav items lead to functional pages (no ComingSoon)
- [ ] All new pages are responsive (desktop + mobile)
- [ ] All new pages use real API data via hooks
- [ ] All action buttons (create/edit/delete) work end-to-end

---

## Phase 5 — DATA INTEGRITY & SECURITY 🔒

**Goal:** Production-grade auth, data validation, and error handling.

### 5.1 Real Authentication
- [ ] Replace plaintext demo password comparison with bcrypt hashing
- [ ] Implement proper JWT refresh token rotation
- [ ] Add token blacklisting (Redis or DB)
- [ ] Implement brute-force lockout (5 attempts → 15-min lock) in serverless function
- [ ] Add password complexity validation server-side
- [ ] Implement proper MFA (TOTP) with encrypted secrets
- [ ] Session expiry handling — auto-redirect to login on 401

### 5.2 Authorization & Tenant Isolation
- [ ] Add JWT validation middleware to all protected endpoints
- [ ] Enforce tenant ID filtering on all operator data queries
- [ ] Regulators/inspectors can see all tenants; operators only their own
- [ ] Add role-based access control to mutation endpoints

### 5.3 Input Validation
- [ ] Add request body validation to all POST/PATCH endpoints (match DTO rules)
- [ ] Sanitize string inputs (prevent XSS in stored data)
- [ ] Validate all query parameters (page, limit, filters)

### 5.4 Error Handling
- [ ] Standardize error response format: `{ error: string, code: string, details?: unknown }`
- [ ] Add proper HTTP status codes (400 for validation, 403 for forbidden, 409 for conflict)
- [ ] Add global error boundary in portal app
- [ ] Add global error boundary in verify app
- [ ] Show `ServerErrorPage` component for 500 errors
- [ ] Show `ForbiddenPage` component for 403 errors

### 5.5 Audit Trail
- [ ] Write `AuditEvent` records for all create/update/delete operations
- [ ] Include: who, what, when, entity type, entity ID, old/new values
- [ ] Hash-chain audit events for tamper detection

### 5.6 Validation
- [ ] Cannot access operator data without valid JWT
- [ ] Cannot access other tenant's data
- [ ] Invalid inputs return 400 with clear messages
- [ ] All mutations create audit trail entries
- [ ] Password attacks are rate-limited

---

## Phase 6 — PERFORMANCE & POLISH ✨

**Goal:** Production performance, offline capability, and final polish.

### 6.1 Performance
- [ ] Add database connection pooling (Prisma Accelerate or PgBouncer)
- [ ] Add Redis caching for frequently-read data (dashboard stats, facility lists)
- [ ] Implement React Query `staleTime` tuning per entity type
- [ ] Add pagination to all list pages (server-side, already supported by API)
- [ ] Lazy-load route components (already using `React.lazy()` ✓)
- [ ] Optimize Vite build — analyze bundle size, code-split large pages

### 6.2 Offline Support (Portal)
- [ ] Wire up the existing `OfflineBanner` and `SyncStatus` components from `@ncts/ui`
- [ ] Implement service worker for critical read paths
- [ ] Queue mutations when offline using existing `enqueueRequest`/`flushQueue` utilities
- [ ] Show sync status indicator in header

### 6.3 PWA Enhancement
- [ ] Verify `manifest.json` is served correctly (fix the current syntax error)  
- [ ] Add proper service worker registration
- [ ] Configure push notifications for compliance alerts

### 6.4 Accessibility
- [ ] Audit all pages with axe-core
- [ ] Fix any WCAG 2.1 AA violations
- [ ] Ensure keyboard navigation works for all interactive elements
- [ ] Ensure screen reader announcements for state changes

### 6.5 Testing
- [ ] Add Vitest unit tests for utility functions and hooks
- [ ] Add Playwright E2E tests for critical flows:
  - Login → Dashboard → Logout
  - Register Plant → View Plant
  - Create Transfer → Accept Transfer
  - Verify Product → View Result
- [ ] Add API integration tests for all endpoints

### 6.6 Monitoring & Observability
- [ ] Add Vercel Analytics or Sentry for frontend error tracking
- [ ] Add structured logging to serverless function (JSON format)
- [ ] Add health check endpoint with DB connectivity test
- [ ] Add uptime monitoring for both apps

### 6.7 Final Cleanup
- [ ] Remove `vercel.verify.json` (consolidate into project dashboard settings)
- [ ] Clean up `.vercel/` directories from git
- [ ] Update README.md with deployment instructions
- [ ] Update all documentation in `docs/`

---

## Phase Summary

| Phase | Scope | Est. Effort | Priority |
|-------|-------|-------------|----------|
| **Phase 1** | Deployment fix — apps load, login works, verify works | 1-2 hours | 🔴 CRITICAL |
| **Phase 2** | Chinese text, nav links, debug cleanup, verify QR fix | 2-4 hours | 🟠 HIGH |
| **Phase 3** | Wire all 40 pages to real API (33 new endpoints) | 3-5 days | 🟠 HIGH |
| **Phase 4** | Build 12 ComingSoon pages + 4 missing utility pages | 3-4 days | 🟡 MEDIUM |
| **Phase 5** | Real auth, authorization, validation, audit trail | 2-3 days | 🟠 HIGH |
| **Phase 6** | Performance, offline, PWA, a11y, testing, monitoring | 3-5 days | 🟡 MEDIUM |

**Total estimated effort: 2-3 weeks for a single developer.**

---

## Appendix A — File Inventory

### Portal Pages (40 files)
```
apps/portal/src/pages/
├── auth/
│   ├── LoginPage.tsx          ✅ Real
│   ├── MfaPage.tsx            ✅ Real
│   ├── ForgotPasswordPage.tsx ✅ Real
│   ├── ResetPasswordPage.tsx  ✅ Real
│   └── ChangePasswordPage.tsx ✅ Real (partial mock)
├── operator/
│   ├── DashboardPage.tsx      ✅ Real (mock data)
│   ├── FacilitiesPage.tsx     ✅ Real (mock data)
│   ├── PlantsPage.tsx         ✅ Real (mock data)
│   ├── PlantRegisterPage.tsx  ✅ Real (mock data)
│   ├── PlantDetailPage.tsx    ✅ Real (mock data)
│   ├── HarvestsPage.tsx       ✅ Real (mock data)
│   ├── TransfersPage.tsx      ✅ Real (mock data)
│   ├── TransferDetailPage.tsx ✅ Real (mock data)
│   ├── SalesPage.tsx          ✅ Real (mock data)
│   ├── SaleDetailPage.tsx     ✅ Real (mock data)
│   ├── LabResultsPage.tsx     ✅ Real (mock data)
│   ├── ProfilePage.tsx        ✅ Real (mock data)
│   └── SettingsPage.tsx       ✅ Real (mock data)
├── admin/
│   ├── NationalDashboard.tsx  ✅ Real (mock data)
│   ├── OperatorsPage.tsx      ✅ Real (mock data)
│   ├── OperatorDetailPage.tsx ✅ Real (mock data)
│   ├── PermitsPage.tsx        ✅ Real (mock data)
│   ├── PermitDetailPage.tsx   ✅ Real (mock data)
│   ├── CompliancePage.tsx     ✅ Real (mock data)
│   ├── FacilitiesMapPage.tsx  ✅ Real (mock data)
│   ├── ReportsPage.tsx        ✅ Real (mock data)
│   ├── AuditLogPage.tsx       ✅ Real (mock data)
│   ├── SystemSettingsPage.tsx ✅ Real (mock data)
│   ├── InspectionsPage.tsx    ✅ Real (mock data)
│   ├── CreateInspectionPage.tsx ✅ Real (mock data)
│   └── InspectionDetailPage.tsx ✅ Real (mock data)
└── static/
    ├── AboutPage.tsx          ✅ Real
    ├── HowItWorksPage.tsx     ✅ Real
    ├── ForOperatorsPage.tsx   ✅ Real
    ├── ForRegulatorsPage.tsx  ✅ Real
    ├── PrivacyPage.tsx        ✅ Real
    ├── PaiaPage.tsx           ✅ Real
    ├── TermsPage.tsx          ✅ Real
    ├── AccessibilityPage.tsx  ✅ Real
    └── CookiePolicyPage.tsx   ✅ Real
```

### Verify Pages (5 files)
```
apps/verify/src/pages/
├── HomePage.tsx        ✅ Real
├── VerifyPage.tsx      ✅ Real
├── ScanPage.tsx        ✅ Real
├── PrivacyPage.tsx     ✅ Real
└── AccessibilityPage.tsx ✅ Real
```

### API Endpoints — Implementation Status
```
✅ = Implemented    ❌ = Missing    ⚠️ = Partial

AUTH:
  ✅ POST /auth/login
  ❌ POST /auth/forgot-password
  ❌ POST /auth/reset-password
  ❌ POST /auth/change-password
  ❌ POST /auth/refresh
  ❌ POST /auth/logout
  ❌ GET  /auth/me
  ❌ POST /auth/mfa/setup
  ❌ POST /auth/mfa/verify

FACILITIES:
  ✅ GET  /facilities
  ✅ GET  /facilities/:id
  ✅ GET  /facilities/:id/zones
  ✅ POST /facilities
  ❌ PATCH /facilities/:id
  ❌ POST /facilities/:id/zones

PLANTS:
  ✅ GET  /plants
  ✅ GET  /plants/:id
  ✅ POST /plants
  ✅ POST /plants/batch-register
  ✅ PATCH /plants/:id/state

BATCHES:
  ✅ GET  /batches
  ✅ GET  /batches/:id

HARVESTS:
  ✅ GET  /harvests
  ❌ GET  /harvests/:id
  ❌ POST /harvests
  ❌ PATCH /harvests/:id

LAB RESULTS:
  ✅ GET  /lab-results
  ❌ GET  /lab-results/:id
  ❌ GET  /lab-results/batch/:batchId
  ❌ POST /lab-results

TRANSFERS:
  ✅ GET  /transfers
  ❌ GET  /transfers/:id
  ❌ POST /transfers
  ⚠️ PATCH /transfers/:id/status (exists but hooks expect /accept and /reject)

SALES:
  ✅ GET  /sales
  ❌ GET  /sales/:id
  ❌ POST /sales

REGULATORY:
  ✅ GET  /regulatory/dashboard
  ⚠️ GET  /regulatory/dashboard/trends (returns random data)
  ✅ GET  /regulatory/facilities/geo
  ✅ GET  /regulatory/operators
  ✅ GET  /regulatory/permits
  ✅ PATCH /regulatory/permits/:id/status
  ✅ GET  /regulatory/compliance/alerts
  ❌ GET  /regulatory/sales-aggregate
  ❌ GET  /regulatory/compliance-average

INSPECTIONS:
  ❌ GET  /inspections
  ❌ GET  /inspections/:id
  ❌ POST /inspections
  ❌ PATCH /inspections/:id
  ❌ GET  /inspections/analytics

ADMIN:
  ❌ GET  /audit
  ❌ GET  /settings
  ❌ PATCH /settings
  ❌ GET  /admin/users

UTILITY:
  ❌ GET  /search
  ❌ GET  /notifications
  ❌ PATCH /notifications/:id/read
  ❌ GET  /operators/:id/dashboard
  ❌ GET  /operators/:id/activity

VERIFY:
  ✅ GET  /verify/:trackingId
  ⚠️ POST /verify/report (logs only, no DB write)

OTHER:
  ✅ POST /seed
  ✅ GET  /health
```

### Database Models (31 total — all defined in schema)
```
Core:      Tenant, User, Permit, Facility, Zone, Strain, Plant, Batch,
           Harvest, LabResult, Transfer, TransferItem, Sale
Audit:     AuditEvent
Compliance: Inspection, ComplianceRule, ComplianceAlert, InventorySnapshot
Events:    OutboxEvent, DestructionEvent, SuspiciousReport
Finance:   ExciseRate, ExciseLedger
Trade:     ImportExportRecord, PlantingIntention
Privacy:   Consent
Comms:     Notification
Health:    PatientAccess
Verify:    VerificationLog, QrCode
Reports:   RegulatoryReport
```
