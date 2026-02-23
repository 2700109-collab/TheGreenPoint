# NCTS Video Proposal — Complete Technical Data Extraction

> Every technical detail, feature, and UX element extracted from the codebase documentation for video scene writing.

---

## A. EXACT FEATURE LISTS

### A1. Complete Module Inventory (28 NestJS Modules)

| # | Module | Status | Routes | Description |
|---|---|---|---|---|
| 1 | `AuthModule` | Built | 6 | Login, register, refresh, logout, password change, forgot password |
| 2 | `FacilitiesModule` | Built | 7 | CRUD + zone management + GeoJSON boundary |
| 3 | `PlantsModule` | Built | 6 | Register, state transitions, batch register, search |
| 4 | `BatchesModule` | Built | 3 | Create, list, detail |
| 5 | `HarvestsModule` | Built | 4 | Record harvest → auto-create batch, list, detail |
| 6 | `LabResultsModule` | Built | 4 | Submit results (THC/CBD/contaminants), list, by-batch |
| 7 | `TransfersModule` | Built | 5 | Initiate, accept, reject, list, detail |
| 8 | `SalesModule` | Built | 3 | Record sale, list, detail |
| 9 | `RegulatoryModule` | Built | 4 | Government dashboard, trends, permit management |
| 10 | `VerificationModule` | Built | 2 | Public QR/tracking ID verification, chain-of-custody |
| 11 | `ComplianceModule` | Planned | 11 | 14-rule engine, alerts, scoring, diversion detection, inventory reconciliation |
| 12 | `EventModule` | Planned | 0 | Outbox pattern, event bus (EventEmitter2), 18 event types |
| 13 | `NotificationModule` | Planned | 5 | In-app + email (SES) + SMS (SNS), mark read, unread count |
| 14 | `SchedulerModule` | Planned | 0 | 9 cron jobs (compliance batch, mass balance, permit expiry, KPI refresh) |
| 15 | `StorageModule` | Planned | 3 | S3 presigned upload/download, MinIO dev, file lifecycle |
| 16 | `ReportsModule` | Planned | 5 | PDF generation (manifests, inspections, certificates), CSV/XML export |
| 17 | `InspectionsModule` | Planned | 6 | Schedule, start, complete (checklist + photos + findings), PDF report |
| 18 | `DestructionModule` | Planned | 4 | Record destruction (min 2 witnesses), method validation, regulator approval |
| 19 | `ImportExportModule` | Planned | 4 | INCB quota tracking, customs documentation, excise calculation |
| 20 | `QrModule` | Planned | 3 | SVG generation, Avery 5160 label PDF, bulk labels (100 per request) |
| 21 | `SyncModule` | Planned | 3 | WatermelonDB push/pull, conflict resolution, reference data for offline |
| 22 | `ExciseModule` | Planned | 5 | Duty auto-calc on sales, configurable rates, SARS DA 260 XML |
| 23 | `PopiaModule` | Planned | 7 | Consent recording, data export (Subject Access Request), data deletion/anonymization |
| 24 | `PlantingIntentionsModule` | Planned | 5 | Seasonal planting plans, DALRRD-style area/yield forecasting |
| 25 | `AuditModule` | Built + Enhanced | 3 | SHA-256 hash-chain verification, query + CSV export, tamper detection |
| 26 | `HealthModule` | Built + Enhanced | 1 | Deep health check (DB + Redis + S3), version, uptime |
| 27 | `DatabaseModule` | Built | 0 | Prisma client, AsyncLocalStorage for RLS tenant context |
| 28 | `RedisModule` | Built | 0 | Cache manager, session storage, rate limiting |

### A2. Database Model Inventory (28 Prisma Models)

**14 Existing Models:**
`Tenant`, `User`, `Permit`, `Facility`, `Zone`, `Strain`, `Plant`, `Batch`, `Harvest`, `LabResult`, `Transfer`, `TransferItem`, `Sale`, `AuditEvent`

**14 New Models (Planned):**
`Inspection`, `ComplianceRule`, `ComplianceAlert`, `InventorySnapshot`, `OutboxEvent`, `DestructionEvent`, `SuspiciousReport`, `ExciseRate`, `ExciseLedger`, `ImportExportRecord`, `PlantingIntention`, `Consent`, `Notification`, `PatientAccess`

**Total Fields:** 171 existing + ~200 new = ~371 fields
**Total Indexes:** 17 existing + ~40 new = ~57 indexes

### A3. Compliance Engine — 14 Rules (Strategy Pattern)

| Rule | Name | Type | Severity | Description |
|---|---|---|---|---|
| R001 | Permit Expiry Check | Scheduled (daily) | Warning/Critical | Alerts at 90, 60, 30, 7 days before expiry |
| R002 | THC Limit Enforcement | Real-time | Critical | Hemp ≤0.2% THC, auto-quarantine batch on violation |
| R003 | Inventory Variance Detection | Batch (monthly) | Critical | Flags >5% discrepancy between expected and declared inventory |
| R004 | Transfer Velocity Anomaly | Real-time | Warning | Detects >3σ transfer rate, >5 transfers to same receiver in 7 days, unusual hours (22:00-06:00) |
| R005 | Verification Pattern Anomaly | Batch (weekly) | Warning | >20 scans/24h (counterfeiting), >500km apart in 12h (multi-city), >50% foreign IP |
| R006 | Wet-to-Dry Ratio Anomaly | Real-time | Critical | Normal 3:1-5:1, flags <2.0 (weight added) or >7.0 (skimming), per-strain 2σ baseline |
| R007 | Mass Balance Check | Batch (daily) | Critical | Expected = harvested - sold - transferred - destroyed - processing_loss; >2% variance flags |
| R008 | Production Limit Check | Real-time | Warning | Verifies plant count doesn't exceed permit's `maxAnnualQuantityKg` |
| R009 | Lab Result Frequency | Batch (monthly) | Warning | Flags batches not tested within 30 days of creation |
| R010 | Zone Capacity Check | Real-time | Warning | Prevents planting if zone at or above capacity |
| R011 | Reporting Deadline Compliance | Scheduled (daily) | Warning | Checks monthly production reports and quarterly compliance reports submitted on time |
| R012 | Destruction Compliance | Real-time | Critical | Verifies ≥2 witnesses, photos attached, approved method (incineration/composting/chemical/grinding) |
| R013 | Import/Export Balance | Batch (monthly) | Warning/Critical | Cross-references with INCB quotas, warns at 80% utilization, critical at 95% |
| R014 | Permit Activity Scope | Real-time | Critical | Blocks operations outside permit's authorized activities (e.g., cultivation-only permit can't sell) |

### A4. Diversion Detection — 4 Algorithms

1. **Mass Balance Algorithm** — `expected_inventory = Σ(harvested) - Σ(sold) - Σ(transferred_out) - Σ(destroyed) - Σ(processing_loss)`. Thresholds: <2% PASS, 2-5% WARNING, 5-10% CRITICAL, >10% EMERGENCY.
2. **Wet-to-Dry Ratio Analysis** — Normal cannabis ratio 3:1 to 5:1. Per-strain rolling average with 2σ deviation alerts.
3. **Transfer Velocity Detection** — Operator transfer rate vs system-wide mean+3σ. Also flags: same-receiver >5 transfers in 7 days, 22:00-06:00 transfers, common-ownership sender/receiver.
4. **Verification Pattern Analysis** — QR scan frequency (>20/24h=counterfeiting), geography (>500km in 12h), source IP (>50% foreign=export diversion). Suspicion score 0-100, auto-flag >70, auto-disable QR >90.

### A5. Plant Lifecycle State Machine

```
seed → seedling → vegetative → flowering → harvested
  ↓        ↓           ↓            ↓
destroyed  destroyed   destroyed    destroyed
```

- **No backward transitions** (can't go from flowering → vegetative)
- **No stage skipping** (can't go from seed → flowering)
- **Destroyed is terminal** (can't be un-destroyed)
- **Tracking ID format:** `NCTS-ZA-{YEAR}-{6-digit-sequence}` (e.g., `NCTS-ZA-2026-000001`)
- **Atomic sequences:** PostgreSQL sequences (`ncts_plant_tracking_seq`, `ncts_transfer_number_seq`, `ncts_sale_number_seq`, `ncts_inspection_number_seq`)

### A6. Front-End Application Suite (4 Apps)

| App | Framework | Purpose | Auth | Pages |
|---|---|---|---|---|
| **Portal** (`apps/portal/`) | React 19 + Ant Design 5 + ProComponents | Unified operator + admin with role-based routing | JWT + MFA | 53 pages |
| **Verify** (`apps/verify/`) | React + Tailwind + Shadcn/ui | Public product verification via QR/tracking ID | None | 3 pages |
| **Web** (`apps/web/`) | React + Ant Design | Operator development target | Mock | 16 pages |
| **Admin** (`apps/admin/`) | React + Ant Design | Government regulator development target | Mock | 21 pages |

**Portal Page Breakdown:**
- **Operator pages (16):** Dashboard, Facilities, Plants, PlantRegister, PlantDetail, Harvests, LabResults, Transfers, TransferDetail, OutgoingTransfers, IncomingTransfers, Sales, SaleDetail, Batches, Profile, Settings
- **Admin pages (21):** NationalDashboard, Operators, OperatorDetail, OperatorApplications, Permits, PermitDetail, PendingPermits, ExpiredPermits, Compliance, ComplianceAlerts, Inspections, CreateInspection, InspectionDetail, FacilitiesMap, AllFacilities, TrackingPlants, TrackingTransfers, TrackingSales, Reports, AuditLog, SystemSettings
- **Static pages (9):** About, HowItWorks, ForOperators, ForRegulators, Privacy, PAIA, Terms, Accessibility, CookiePolicy
- **Auth pages (7):** Login, MFA, ForgotPassword, ResetPassword, ChangePassword, Forbidden, ServerError

### A7. API Endpoint Target Map (86 Total)

**Existing: 36 routes across 10 modules** → Target: **86 routes across 28 modules** (50 new endpoints)

Key endpoint groups:
- Auth: 6 endpoints (login, register, refresh, logout, change-password, forgot-password)
- Plants: 6 endpoints (CRUD + state transitions + batch register)
- Compliance: 11 endpoints (rules, alerts, scoring, reconciliation, diversion reports)
- Inspections: 6 endpoints (full lifecycle with photo upload)
- Notifications: 5 endpoints (list, count, mark-read, mark-all-read)
- POPIA: 7 endpoints (consent, data export, deletion, inventory, privacy policy)
- Excise: 5 endpoints (rates, summary, ledger, DA 260)
- Storage: 3 endpoints (presigned upload/download, delete)
- QR: 3 endpoints (SVG, label PDF, bulk labels)
- Sync: 3 endpoints (push, pull, reference data)
- Reports: 5 endpoints (CSV export, DA 260 XML, INCB Form C, download, history)
- Audit: 3 endpoints (verify chain, query, export CSV)

---

## B. TECHNICAL ARCHITECTURE

### B1. Tech Stack (Exact Versions)

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | ≥20 |
| **Package Manager** | pnpm | ≥9 |
| **Build Orchestrator** | Turborepo | Latest |
| **Frontend Framework** | React | 19 |
| **TypeScript** | TypeScript | 5.7 |
| **UI Library** | Ant Design + ProComponents | 5 |
| **CSS** | Tailwind CSS (verify app) | 3 |
| **Data Fetching** | TanStack Query | 5 |
| **Bundler** | Vite | 6 |
| **Backend Framework** | NestJS | Latest |
| **HTTP Engine** | Fastify (adapter) | Latest |
| **ORM** | Prisma | 6 |
| **Database** | PostgreSQL + PostGIS | 16 + 3.4 |
| **Cloud Database** | Neon PostgreSQL | — |
| **Cache** | Redis | 7 |
| **File Storage** | AWS S3 (prod) / MinIO (dev) | — |
| **Email** | AWS SES (prod) / Mailpit (dev) | — |
| **SMS** | AWS SNS (prod) | — |
| **Deployment** | Vercel serverless | — |
| **Cloud Region** | AWS af-south-1 (Cape Town) | — |
| **CI/CD** | GitHub Actions | — |
| **Infra-as-Code** | Terraform | — |
| **Video** | Remotion | (for proposal video itself) |

### B2. Monorepo Architecture (8 Shared Packages)

```
ncts/ (root)
├── apps/
│   ├── api/          ← NestJS serverless API (28 modules, ~7,500+ LoC)
│   ├── portal/       ← Unified React 19 app (53 pages, role-based routing)
│   ├── verify/       ← Public PWA (Tailwind + Shadcn, <100KB gzipped)
│   └── (web/admin/)  ← Development-only targets
├── packages/
│   ├── api-client/   ← 38 TanStack Query hooks (auto-generated API layer)
│   ├── audit-lib/    ← SHA-256 hash-chain tamper-evident logging
│   ├── crypto-lib/   ← AES-256-GCM encryption + POPIA compliance
│   ├── qr-lib/       ← HMAC-SHA256 signed QR codes + verification URLs
│   ├── shared-types/ ← 576 lines: 10 enums, 15 entity interfaces, 17 DTOs
│   ├── database/     ← Prisma schema (799 lines, 28 models), seed data
│   ├── ui/           ← Design system components + Ant Design 5 theme
│   └── eslint-config/← Shared lint rules (base + nestjs + react configs)
├── infrastructure/
│   ├── terraform/    ← AWS af-south-1 IaC (VPC, RDS, ECS, S3, CDN, WAF)
│   └── sql/          ← RLS policies, sequences, partitioning, materialized views
└── docs/             ← 6 comprehensive specs (15,000+ lines of documentation)
```

### B3. Database Architecture

**PostgreSQL Extensions:**
- `PostGIS 3.4` — Geospatial (facility boundaries as GeoJSON polygons, SA coordinate bounds: lat -35 to -22, lng 16 to 33)
- `pgcrypto` — Server-side encryption
- `uuid-ossp` — UUID v4 generation

**Row-Level Security (RLS):**
- 13 tenant-scoped tables: `plants`, `batches`, `facilities`, `transfers`, `sales`, `harvests`, `lab_results`, `zones`, `permits`, `inspections`, `compliance_alerts`, `destruction_events`, `inventory_snapshots`
- Operator role → sees only own tenant's data (even without WHERE clause)
- Regulator role → bypasses RLS, sees all data
- Audit events → immutable (no UPDATE/DELETE policy)
- SA geographic constraint on facilities: latitude -35 to -22, longitude 16 to 33

**Table Partitioning:**
- `audit_events` partitioned by month (range on `created_at`)
- Automatic partition creation for next 12 months via scheduled function

**Materialized Views:**
- `mv_dashboard_kpis` — Pre-computed national dashboard KPIs, refreshed every 5 minutes (CONCURRENTLY)
- Fields: total_operators, active_permits, total_plants (by state), total_transfers (by status), total_sales_volume_zar, total_facilities, avg_compliance_score

**Seed Data:**
- 3 tenants (GreenFields Cannabis, Durban Organics, Cape Hemp Co)
- 6 users across 3 roles (operator_admin, operator_staff, regulator)
- 4 facilities across 3 provinces
- 5 SA cannabis strains (Durban Poison, Swazi Gold, Malawi Gold, Rooibaard, SA Hemp Cultivar #1)
- 100 plants, 2 batches, 1 lab result, 1 transfer, 2 sales

### B4. Event-Driven Architecture (Outbox Pattern)

```
Domain Operation → Same DB Transaction → outbox_events table
                                              ↓
                              OutboxPollerService (every 5 seconds)
                                              ↓
                              EventBus (NestJS EventEmitter2, wildcard support)
                                    ↓         ↓           ↓
                              Compliance   Notification   Audit
                              Handler      Handler        Handler
```

**18 Event Types:**
`plant.created`, `plant.state_changed`, `plant.destroyed`, `batch.created`, `batch.weight_updated`, `harvest.created`, `lab_result.submitted`, `transfer.created`, `transfer.accepted`, `transfer.rejected`, `sale.created`, `permit.status_changed`, `inspection.completed`, `compliance_alert.created`, `destruction.recorded`, `user.login`, `user.login_failed`, `inventory.reconciled`

### B5. Cron Job Schedule (9 Jobs, Africa/Johannesburg Timezone)

| Frequency | Time (SAST) | Job |
|---|---|---|
| Every 5 seconds | — | Outbox event polling |
| Every 5 minutes | — | Dashboard KPI materialized view refresh |
| Every 1 hour | — | Compliance alert escalation (overdue check) |
| Daily | 02:00 | Batch compliance rule evaluation (all tenants) |
| Daily | 03:00 | Mass balance check (diversion detection) |
| Daily | 06:00 | Permit expiry notifications (7-day and 30-day) |
| Daily | 00:00 | Published outbox event cleanup (>30 days) |
| Weekly | Monday 04:00 | QR verification pattern analysis |
| Monthly | 1st 01:00 | Auto-reconcile all facility inventories |

### B6. Serverless Deployment (Vercel)

- **Catch-all route:** `api/v1/[...path].ts` proxies all requests to NestJS Fastify
- **Portal:** `ncts-portal-ivory.vercel.app` (React SPA)
- **Verify:** `ncts-alpha.vercel.app` (lightweight PWA)
- **Production target:** AWS af-south-1 via Terraform (ECS Fargate, RDS, ElastiCache, S3, CloudFront, WAF)

### B7. Docker Development Stack

```yaml
PostgreSQL 16 + PostGIS 3.4  → port 5432
Redis 7 Alpine               → port 6379
Mailpit (email testing)      → port 8025 (UI), 1025 (SMTP)
MinIO (S3-compatible)        → port 9000 (API), 9001 (console)
```

---

## C. UI/UX DETAILS

### C1. Design System Foundation

**Color Palette:**
- **Primary:** `#1B3A5C` (deep blue — government authority)
- **Secondary:** `#007A4D` (SA green — growth, cannabis)
- **Accent:** `#FFB81C` (gold — SA flag)
- **Error:** `#DE3831` (red — alerts)
- **Success:** `#007A4D` (same as secondary)
- **Warning:** `#E8590C` (orange)
- **Info:** `#2196F3` (blue)
- **Neutrals:** 12-step grey scale from `#FFFFFF` to `#141414`

**Typography:**
- Primary: **Inter** (clean, modern, government-appropriate)
- Monospace: **JetBrains Mono** (tracking IDs, codes)
- Scale: 12px body → 38px h1

**Spacing:** 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
**Border Radius:** 2px (tiny) → 6px (default) → 12px (large) → 50% (round)
**Breakpoints:** xs(480), sm(576), md(768), lg(992), xl(1200), xxl(1600)
**Icon System:** 35 Lucide icons + 12 custom SVGs (SA coat of arms, cannabis leaf, etc.)

### C2. Government Branding Elements

**Government Masthead Bar:**
- 40px fixed top bar, `#1B3A5C` background
- Left: RSA coat of arms (24x24) + "Republic of South Africa"
- Right: "Official Government System" badge
- Below: Phase banner ("PILOT PHASE" amber / "BETA" blue)

**Government Footer:**
- 3-column layout: About NCTS | Legal (POPIA Notice, PAIA Manual, Terms, Accessibility, Cookies) | Contact
- Copyright: "© {year} Republic of South Africa. Department of Health."
- SA Government crest

### C3. Key UI Components (21 Shared Components)

| Component | File | Description |
|---|---|---|
| `GovMasthead` | `packages/ui/` | Government authority header with coat of arms |
| `GovFooter` | `packages/ui/` | 3-column legal footer |
| `PhaseBanner` | `packages/ui/` | PILOT/BETA/LIVE phase indicator |
| `StatusBadge` | `packages/ui/` | 30 status types with semantic colors (dot/tag/outline/filled variants) |
| `TrackingId` | `packages/ui/` | Monospace ID display with copy, link, entity icon |
| `NctsLogo` | `packages/ui/` | Shield logo with size/variant control |
| `StatCard` | `packages/ui/` | KPI card with sparkline, trend arrows, semantic colors |
| `DataFreshness` | `packages/ui/` | "Updated 2 minutes ago" with green/amber/red indicator |
| `PlantLifecycle` | `packages/ui/` | 6-stage stepper with custom botanical icons per stage |
| `TransferTimeline` | `packages/ui/` | 5-stage transfer journey (initiated → dispatched → in_transit → received → verified) |
| `PermitCard` | `packages/ui/` | Visual permit display with left accent bar colored by type |
| `ComplianceScore` | `packages/ui/` | Circular progress ring with traffic-light color (Excellent/Good/Needs Improvement/At Risk/Critical) |
| `EntityEmptyState` | `packages/ui/` | 9 entity-specific empty states with custom illustrations |
| `SkeletonPage` | `packages/ui/` | 4 variants: dashboard, table, detail, form |
| `OfflineBanner` | `packages/ui/` | Yellow warning bar with pending sync count |
| `SyncStatus` | `packages/ui/` | 4 states: synced/syncing/pending/error |
| `LanguageSwitcher` | `packages/ui/` | Support for 11 SA official languages |
| `CsvExportButton` | `packages/ui/` | Client-side CSV generation with Blob download |
| `PrintButton` | `packages/ui/` | Print stylesheet with gov header on every page |
| `SearchGlobal` | `packages/ui/` | Ctrl+K command palette, 7 entity types, grouped results |
| `AppBreadcrumbs` | `packages/ui/` | Auto-generated from React Router location |

### C4. Dashboard Specifications

**Operator Dashboard (4 KPI Cards + 2 Charts + Activity Feed + Alerts):**
- KPI 1: Active Plants (Sprout icon, green, 7-day sparkline)
- KPI 2: Pending Transfers (Truck icon, orange, 7-day sparkline)
- KPI 3: Monthly Sales in ZAR (ShoppingCart icon, blue, 7-day sparkline)
- KPI 4: Compliance Score % (ShieldCheck icon, traffic-light color, last 6 assessments)
- Chart 1: Plant Lifecycle Distribution (donut/bar — seedling/vegetative/flowering/harvested/destroyed)
- Chart 2: Transfer Volume 30 Days (line chart — outgoing blue, incoming green)
- Activity Feed: 10-item timeline (plant_registered, transfer_initiated, harvest_recorded, lab_result, sale_completed)
- Alerts Panel: Color-coded (red/yellow/blue) with clickable navigation
- Quick Actions: Register Plant, Record Harvest, Create Transfer, Record Sale

**Government National Dashboard (6 KPI Cards + Map + Supply Chain + Compliance Heatmap):**
- KPI 1: Total Operators (Users icon)
- KPI 2: Active Permits (FileCheck icon)
- KPI 3: Total Plants Tracked (Sprout icon)
- KPI 4: Active Transfers (Truck icon)
- KPI 5: Monthly Revenue ZAR (DollarSign icon)
- KPI 6: Avg Compliance Score (ShieldCheck icon, traffic-light)
- **Interactive SA Map:** Leaflet + OpenStreetMap, facility markers (color-coded by status or compliance), cluster markers, popup cards, province breakdown bar
- **Supply Chain Flow:** Sankey diagram: Cultivation → Processing → Distribution → Retail (with aggregate counts)
- **Compliance Heatmap:** Province table with operator count, avg score, alert count — clickable drill-down

### C5. Inspection Management System (Calendar + Forms + Recording)

- **Calendar View:** Ant Design Calendar with color-coded dots (green=passed, yellow=scheduled, blue=in-progress, red=failed/overdue)
- **Schedule Form:** 3-step StepsForm (Details → Assign Inspector → Checklist)
- **15-item Standard Checklist:** SAHPRA permit displayed, security measures, QR tags, seed-to-sale records, environmental controls, waste disposal, staff training, pesticide records, lab results, inventory counts, transfer manifests, restricted area access, fire safety, unauthorized varieties, destruction records
- **Recording:** Collapsible panels per checklist item with: findings (rich text), photo upload, severity (none/minor/major/critical), remediation required + deadline
- **Digital signature** via `react-signature-canvas`
- **Auto-generated PDF report** with government letterhead

### C6. Public Verification App (Verify)

**Target:** <100KB JS gzipped, First Contentful Paint <2s on 3G

**Home Page:**
- Large NCTS shield logo
- Search input (44px height) accepting `PLT-YYYYMMDD-XXX`, `TRF-YYYYMMDD-XXX`, `SAL-YYYYMMDD-XXX`
- QR Scanner button (rear camera, overlay with scan area, haptic feedback, torch toggle)
- Trust badges: "Government Verified", "SAHPRA Compliant", "Real-time Tracking"

**Verified Result Page:**
- Large green ✅ VERIFIED banner
- Product details: Tracking ID, Strain + type (Indica/Sativa/Hybrid), Operator, Facility, Harvest Date, Lab Status (Passed/Failed/Pending), THC%/CBD%, Permit Status
- Supply Chain Journey: 🌱 Cultivated → 🧪 Lab Tested → 📦 Transferred → 🛒 Sold
- Verification timestamp + unique verification ID

**Not Verified Page:**
- Red ❌ NOT VERIFIED with warning: "Do not consume unverified cannabis products"
- Action items: Contact seller, Report to SAHPRA, Call: 0800-NCTS (6287)
- "Report Suspicious Product" button

**Security:** Rate limit 10 verifications/IP/minute, hCaptcha after 5 consecutive verifications

### C7. Mobile Optimization

**Target Devices:**
- Samsung Galaxy A15 (6.5" 1080×2340, 4GB, Android 14)
- Samsung Galaxy A05 (6.7" 720×1600, 4GB, Android 13)
- iPhone SE 3rd gen (4.7" 750×1334, 4GB, iOS 16+)

**Mobile Patterns:**
- Bottom navigation bar (56px, 5 tabs: Dashboard, Plants, Transfers, Scan, Menu)
- ProTable → Card list transformation at <768px
- Bottom sheet filter panels (max 80% viewport, drag handle)
- Floating Action Button (56×56px, primary-500, speed-dial on long-press)
- All touch targets minimum 44×44px (WCAG 2.5.5 AAA)
- Swipe gestures: left on cards for quick actions, down for pull-to-refresh

**Performance Budget (Mobile):**
- First Contentful Paint: <2.0s on 4G
- Largest Contentful Paint: <3.0s on 4G
- Time to Interactive: <4.0s on 4G
- JS Bundle: <200KB gzipped
- CSS Bundle: <50KB gzipped

### C8. Offline Support Strategy

**Cached Data:**
- Facility list (cache-first, 1hr TTL)
- Plant registry (network-first, 5min TTL)
- User profile (cache-first, 1 day)
- Static assets (cache-first, until version change)
- Map tiles (cache-first, 1 week, limited area)

**Offline Write Queue (FIFO):**
- Register plant (queued)
- Update plant stage (queued)
- Record harvest weights (queued)
- Draft transfer (queued, not submitted until online)

**Sync Conflict Resolution per Entity:**
- Plant: server-wins (regulatory data)
- Batch: server-wins (tracking IDs must be consistent)
- Harvest: last-write-wins (field data entry)
- Inspection: merge-fields (inspector + server contributions combined)
- Sale: reject-if-conflict (financial records)

### C9. Internationalization (11 SA Official Languages)

| Code | Language |
|---|---|
| `en` | English (fully implemented) |
| `af` | Afrikaans |
| `zu` | isiZulu |
| `xh` | isiXhosa |
| `st` | Sesotho |
| `tn` | Setswana |
| `ss` | Siswati |
| `ve` | Tshivenḓa |
| `ts` | Xitsonga |
| `nso` | Sesotho sa Leboa |
| `nr` | isiNdebele |

- i18next + react-i18next integration
- `Intl.NumberFormat('en-ZA')` for currency (ZAR) and numbers
- `Intl.DateTimeFormat('en-ZA')` for dates
- Infrastructure ready, English-only for MVP, others flagged as "Coming soon"

---

## D. COMPLIANCE & SECURITY

### D1. SA Government Integration Points

| Agency | Standard | Integration |
|---|---|---|
| **SAHPRA** (SA Health Products Regulatory Authority) | Section 22A permits | 12+ additional permit fields (authorized substances, activities, max annual quantity, responsible person, renewal date) |
| **SARS** (SA Revenue Service) | DA 260 Excise Returns | XML generation per e-Filing specification, quarterly filing, excise duty auto-calculation per product category |
| **DALRRD** (Agriculture) | Hemp permits | THC <0.2% threshold enforcement, planting intention reports, area/yield forecasting |
| **INCB** (International Narcotics Control Board) | Form C Annual Returns | National aggregates: area, production, consumption, exports, imports, stocks |
| **SITA/MIOS** | Government IT Standards | MISS classification (CONFIDENTIAL for PII, RESTRICTED for permits) |
| **Municipal** | Local Business Licenses | Municipal license tracking per facility (number, expiry date) |

### D2. POPIA Compliance (8 Conditions Mapped)

| # | POPIA Condition | NCTS Implementation |
|---|---|---|
| 1 | Accountability | Data Processing Officer role, immutable audit trail |
| 2 | Processing Limitation | Purpose-bound consent with version tracking, minimal data collection |
| 3 | Purpose Specification | Consent records with specific purposes per policy version |
| 4 | Further Processing Limitation | No data sharing without explicit consent |
| 5 | Information Quality | DTO validation (class-validator), correction endpoints |
| 6 | Openness | Privacy policy versioning, data inventory endpoint |
| 7 | Security Safeguards | AES-256-GCM (crypto-lib), RLS, SHA-256 audit chain, TLS 1.3 |
| 8 | Data Subject Participation | Subject Access Request (48hr target), data deletion (anonymization), data portability (ZIP export) |

**Data Retention Policy:**
- User PII: Account lifetime + 5 years
- Plant tracking: 7 years from harvest
- Financial records: 7 years (SARS)
- Audit events: 10 years
- Lab results: 7 years
- Verification scan logs: 2 years

### D3. Security Architecture

**Encryption:**
- At rest: AES-256-GCM (via `@ncts/crypto-lib` — 45 lines, field-level encryption)
- In transit: TLS 1.2+ (HTTPS only)
- Passwords: bcrypt (12 rounds)
- MFA secrets: AES-256-GCM encrypted at rest
- SA ID numbers: AES-256-GCM encrypted at rest
- Patient pseudonymization: SHA-256 (one-way hash)
- S3 objects: AWS SSE-S3 (server-side encryption)
- Audit chain: SHA-256 hash-chaining (tamper-evident)
- QR codes: HMAC-SHA256 signed verification URLs (via `@ncts/qr-lib` — 50 lines)
- Key management: AWS KMS (production), env variable (development)

**Authentication:**
- JWT access tokens + refresh tokens
- Redis-backed session storage (key: `session:{userId}:{tokenId}`)
- MFA via TOTP (authenticator app), required for all government accounts
- Rate limiting: login (5/min), authenticated (1000/min), public (100/min)
- Account lockout: 5 failed attempts → 15-minute lock
- Concurrent sessions: max 2 per user (newest invalidates oldest)
- Session timeouts: 30min idle (operator), 8hr max (admin), 12hr max (operator)
- Remember me: extends to 7 days idle, 30 days max
- First-login forced password change

**RBAC (7 Roles):**
- `super_admin` — System-wide, full access
- `regulator` — System-wide, all data + permit management
- `inspector` — System-wide, assigned inspections + read facilities
- `operator_admin` — Tenant-scoped, full CRUD within own data
- `operator_staff` — Tenant-scoped, operational CRUD
- `lab_technician` — Tenant-scoped, lab result submission only
- `auditor` — System-wide, read-only access to everything

**Security Headers (Fastify Helmet):**
- Content Security Policy (strict directives)
- HSTS: 1-year max-age + includeSubDomains
- CORS whitelist (known origins only)
- Referrer-Policy: strict-origin-when-cross-origin
- No X-Powered-By

**Input Protection:**
- Global `SanitizeInterceptor` strips all HTML from request bodies (`sanitize-html`)
- SQL injection prevention: parameterized queries only (zero `$executeRawUnsafe` with string interpolation)
- S3 path traversal prevention (enforce `{tenantId}/` prefix)
- SA ID number validation with Luhn checksum
- SA coordinate validation (-35 to -22 lat, 16 to 33 lng)

### D4. Compliance Alert Escalation Workflow

```
Level 0: INFO    → In-app notification to facility manager
Level 1: WARNING → Email to operator admin + 48-hour resolution deadline
Level 2: CRITICAL→ SMS to regulator + auto-suspend permit + 24-hour deadline
Level 3: EMERGENCY→ Flag for ministerial review + law enforcement notification
```

- Hourly cron checks for overdue alerts
- Auto-escalation when deadline passes
- Level 2+ auto-suspends all operator permits
- Level 3 notifies super_admin for ministerial review

### D5. Compliance Scoring Algorithm

```
Score (0-100) = 100 - Σ(penalties) + Σ(bonuses)

Penalties per open alert:
  info     = -2 points
  warning  = -5 points
  critical = -15 points

Bonuses:
  +5 if no alerts in last 30 days
  +3 if all lab results submitted on time
  +2 if all reports submitted before deadline

Grades:
  90-100 = "Excellent" (green)
  70-89  = "Good" (lime)
  50-69  = "Needs Improvement" (orange)
  25-49  = "At Risk" (red)
  0-24   = "Critical" (dark red, auto-escalate)
```

- Cached in Redis with key `compliance_score:{tenantId}`, 10-minute TTL
- Invalidated on alert creation or resolution
- Weekly trend snapshots for 12-week history
- Score <25 auto-generates critical escalation

### D6. Audit Trail (Tamper-Evident Hash Chain)

**26 Audited Event Types:**
`user.login`, `user.login_failed`, `user.logout`, `user.created`, `user.password_changed`, `plant.created`, `plant.state_changed`, `plant.destroyed`, `batch.created`, `batch.weight_updated`, `harvest.created`, `lab_result.submitted`, `transfer.created`, `transfer.accepted`, `transfer.rejected`, `sale.created`, `permit.status_changed`, `inspection.created`, `inspection.completed`, `compliance_alert.created`, `compliance_alert.resolved`, `destruction.recorded`, `data_export.requested`, `data_deletion.executed`, `facility.created`, `facility.updated`

**Chain Verification:**
- Each event stores `previousHash` + `chainHash`
- `chainHash = SHA-256(JSON.stringify({ ...event, previousHash, timestamp }))`
- Genesis event: `previousHash = 'GENESIS'`
- Verification endpoint: recomputes chain, reports broken links with position
- Performance target: <5 seconds for 10,000 events
- Accessed by regulators for audit compliance

---

## E. NUMBERS & STATS (For Video Impact)

### E1. Scale & Scope

| Metric | Count |
|---|---|
| Total lines of production code | ~7,500+ |
| Total lines of documentation | ~15,655 |
| Prisma schema lines | 799 |
| Database models | 28 (14 existing + 14 new) |
| Database fields | ~371 |
| Database indexes | ~57 |
| API endpoints | 86 target (36 built + 50 planned) |
| NestJS modules | 28 |
| React pages | 53 (portal) + 3 (verify) = 56 |
| Shared UI components | 21 |
| TanStack Query hooks | 38 existing + ~24 new = 62 total |
| Shared TypeScript types | 576 lines (10 enums, 15 entities, 17 DTOs) |
| Compliance rules | 14 (strategy pattern) |
| Diversion detection algorithms | 4 |
| Audited event types | 26 |
| RBAC roles | 7 |
| Cron jobs | 9 |
| Event types | 18 |
| Supported languages | 11 (SA official) |

### E2. Implementation Plan

| Phase | Weeks | Tasks | Hours | Key Deliverables |
|---|---|---|---|---|
| Foundation | 1-2 | 10 | 74 | Auth, DTOs, migrations, RLS, Redis |
| Core Features | 3-4 | 10 | 100 | Compliance engine, audit trail, events, notifications |
| Government | 5-6 | 10 | 116 | Inspections, diversion detection, file storage, reports |
| Regulatory | 7-8 | 10 | 102 | Dashboard, POPIA, destruction, CI/CD, initial tests |
| Advanced | 9-10 | 11 | 108 | Excise, imports, exports, full test suite |
| Post-Launch | TBD | 9 | 164 | AWS infrastructure, monitoring, DR, security audit |

**Grand Total: 65 tasks, ~712 hours, 10-week sprint plan**

### E3. Testing Targets

| Layer | Count | Framework |
|---|---|---|
| Unit tests | ~200 | Vitest |
| Integration tests | ~50 | Vitest + Testcontainers (real PostgreSQL + Redis) |
| E2E tests | ~20 | Vitest + Supertest |
| Load tests | k6 | 50 sustained → 100 peak concurrent users |
| **Total** | **~270 tests** | |

**Performance Targets:**
- `GET /verify/:id`: <50ms p50, <150ms p95 (public-facing)
- `GET /plants` (list): <100ms p50, <300ms p95
- `GET /regulatory/dashboard`: <300ms p50, <800ms p95
- All endpoints: <150ms p50, <500ms p95
- 50 concurrent users sustained for 5 minutes without degradation
- 100 concurrent users at peak with <1% error rate

### E4. Infrastructure (AWS af-south-1 Cape Town)

| Resource | Service | Spec |
|---|---|---|
| Compute | ECS Fargate | 2 vCPU, 4 GB RAM, min 2 tasks |
| Database | RDS PostgreSQL 16 | db.r6g.large, Multi-AZ, 100 GB gp3 |
| Cache | ElastiCache Redis | cache.t3.medium, 1 replica |
| Storage | S3 | SSE-S3 encryption, cross-region replication to eu-west-1 |
| CDN | CloudFront | Static assets (web, admin, verify) |
| DNS | Route 53 | ncts.gov.za |
| Security | WAF v2 | Rate limiting, SQL injection, XSS protection |
| Email | SES | Verified domain ncts.gov.za |
| SMS | SNS | SA mobile numbers |
| Monitoring | CloudWatch | Dashboards, alarms, structured JSON logs |

**Disaster Recovery:**
- RTO: 0 (Multi-AZ failover) for single AZ failure
- RPO: <5 minutes (continuous point-in-time recovery)
- Daily automated snapshots (35-day retention)
- S3 cross-region replication to eu-west-1
- Monthly audit event archival to Glacier (10-year retention)

### E5. Cannabis Industry Domain Numbers

**SA Strains in Seed Data:**
1. Durban Poison (Sativa)
2. Swazi Gold (Sativa)
3. Malawi Gold (Sativa)
4. Rooibaard (Indica, Afrikaans: "Red Beard")
5. SA Hemp Cultivar #1 (Hemp)

**SA Provinces Covered:** All 9 (Western Cape, Gauteng, KwaZulu-Natal, Eastern Cape, Limpopo, Mpumalanga, Free State, North West, Northern Cape)

**Regulatory Frameworks Addressed:** Cannabis for Private Purposes Act, SAHPRA Section 22A, DALRRD hemp permits, SARS excise (DA 260), INCB Form C, POPIA, PAIA, MISS

**Compliance Score Distribution Display:**
- Province-level heatmap
- Traffic-light grading (5 tiers)
- 12-week trend lines
- National average tracking

### E6. Document Generation Capability

| Document | Format | Trigger |
|---|---|---|
| Transfer Manifest | PDF | Transfer creation (with QR code) |
| Inspection Report | PDF | Inspection completion (with photos + govt letterhead) |
| Lab Certificate of Analysis | PDF | Lab result submission |
| Destruction Certificate | PDF | Destruction event completion |
| Monthly Compliance Summary | PDF | Scheduled (1st of month) |
| SARS DA 260 Excise Return | XML + PDF | On-demand / quarterly |
| INCB Form C Annual Return | PDF | On-demand / annual |
| Audit Trail Export | CSV/PDF | On-demand |
| Avery 5160 Labels (QR) | PDF | On-demand (1-100 per request) |
| Data Portability Package | ZIP (JSON+CSV) | POPIA SAR request |

### E7. Key Technical Differentiators (For Video Emphasis)

1. **Seed-to-Sale Tracking** — Complete plant lifecycle from seed → seedling → vegetative → flowering → harvested → batch → lab tested → transferred → sold, every step cryptographically audited
2. **Tamper-Evident Audit Trail** — SHA-256 hash-chained log with genesis block, regulator-accessible chain verification endpoint, detects any modification
3. **14-Rule Compliance Engine** — Strategy pattern allowing dynamic rule addition, real-time + batch + scheduled evaluation, auto-suspend permits on critical violations
4. **4-Algorithm Diversion Detection** — Mass balance, wet-to-dry ratio, transfer velocity, QR scan pattern analysis — catches illicit diversion at scale
5. **Multi-Tenant RLS** — PostgreSQL Row-Level Security isolates each operator's data at database level, not application level — impossible to bypass
6. **South African Data Sovereignty** — All data in AWS af-south-1 (Cape Town), MISS classification, POPIA full compliance with 8 conditions mapped
7. **Offline-First Mobile** — WatermelonDB sync with 5 entity-specific conflict resolution strategies, works in rural SA provinces with no connectivity
8. **Public Verification** — Any citizen can scan a QR code and verify product authenticity, lab results, and complete supply chain journey
9. **Government Integration** — SAHPRA permits, SARS excise, DALRRD hemp, INCB reporting — all built-in
10. **11-Language Ready** — Infrastructure for all SA official languages (Zulu, Xhosa, Afrikaans, Sotho, etc.)

---

*Extracted from: README.md, ProductionReady.md, CODEBASE_ANALYSIS_REPORT.md, BACKEND_RESEARCH_REPORT.md, BackendAndFeatures.md (7,633 lines), FrontEnd.md (5,204 lines), Prisma schema (799 lines), app.module.ts (114 lines)*
