# Backend Research Report — NCTS (National Cannabis Tracking System)

> **Generated:** 2026-02-21 | **Agent:** Backend Researcher Agent  
> **Purpose:** Identify backend gaps vs. Plan.md, SA government integration standards, regulatory requirements, compliance engine design, and security requirements.  
> **Inputs:** Plan.md (858 lines, 7 phases), CODEBASE_ANALYSIS_REPORT.md (828 lines), full codebase inspection of `ncts/`

---

## Table of Contents

1. [Gap Analysis: Plan.md vs. Codebase](#1-gap-analysis-planmd-vs-codebase)
2. [SA Government API Integration Requirements](#2-sa-government-api-integration-requirements)
3. [SA Cannabis Regulatory Backend Requirements](#3-sa-cannabis-regulatory-backend-requirements)
4. [Compliance Engine Specifications](#4-compliance-engine-specifications)
5. [Data Architecture Requirements](#5-data-architecture-requirements)
6. [Security & Privacy Backend Requirements](#6-security--privacy-backend-requirements)
7. [Prioritized Feature List](#7-prioritized-feature-list)
8. [Technical Recommendations](#8-technical-recommendations)

---

## 1. Gap Analysis: Plan.md vs. Codebase

### 1.1 Phase 0 — Project Bootstrap (Weeks 1–2)

| Requirement | Plan.md Spec | Codebase Status | Gap |
|---|---|---|---|
| Monorepo (Turborepo + pnpm) | Turborepo + pnpm workspaces | ✅ Done | — |
| Shared tooling (ESLint, Prettier, Husky) | Shared config packages | ✅ 90% | `commitlint.config.mjs` exists but Plan.md marked "missing" |
| Docker Compose | PostgreSQL+PostGIS, Redis, LocalStack, Mailhog | ✅ Done | Mailpit used instead of Mailhog (acceptable substitute) |
| NestJS API scaffold | Fastify adapter, health, Swagger, global pipes/filters/interceptors | ✅ Done | — |
| React app scaffolds (3 apps) | web (Ant Design), admin (Ant Design), verify (Shadcn/Tailwind) | ⚠️ 75% | **verify** missing Shadcn/ui + Tailwind CSS — still uses inline CSS |
| CI/CD pipeline | lint → type-check → unit tests → build | ✅ Done | No deploy stage (expected for Phase 0) |
| Design system (`packages/ui/`) | Authoritative theme source, shared components | ⚠️ 70% | Only 3 components (StatusBadge, TrackingId, NctsLogo). Theme tokens duplicated in `apps/web/src/theme.ts` and `apps/admin/src/theme.ts` instead of single source in `@ncts/ui` |

**Backend-specific gaps for Phase 0:** None — scaffolding is complete.

---

### 1.2 Phase 1 — Foundation Layer (Weeks 3–6)

| Requirement | Plan.md Spec | Codebase Status | Gap Description | Severity |
|---|---|---|---|---|
| **Prisma migrations** | Generate & run migrations, provision DB | ❌ TODO | No `prisma/migrations/` directory. Schema exists (357 lines, 14 models) but `prisma migrate dev` has never run. Database has never been provisioned. | **CRITICAL** |
| **AuthController (login/register)** | `POST /auth/login`, `POST /auth/register` | ❌ Missing | `AuthService` exists with `generateAccessToken()` and `generateRefreshToken()` but **no controller exposes these via HTTP**. No login endpoint, no register endpoint. Portal app's login form has no backend to hit. | **CRITICAL** |
| **JWT refresh token rotation** | Refresh token stored as HTTP-only cookie, rotated on use | ⚠️ Partial | `generateRefreshToken()` method exists in `AuthService` but no endpoint to exchange refresh→access token. No HTTP-only cookie logic. | HIGH |
| **Token blacklist (Redis)** | Redis-backed immediate revocation | ❌ Missing | Redis is in Docker Compose but **zero NestJS modules use Redis**. No `@nestjs/cache-manager`, no `ioredis`, no Bull queues. | HIGH |
| **Cognito integration** | AWS Cognito (af-south-1) for production auth | ❌ TODO | Dev-mode JWT with hardcoded secret only. JWT strategy has placeholder comment for Cognito JWKS. | MEDIUM (dev-mode acceptable for prototype) |
| **Transactional Outbox pattern** | Insert outbox event in same transaction as entity change | ❌ TODO | No outbox table in schema, no outbox worker. State changes go directly to DB without event emission. | HIGH |
| **EventBridge integration** | Outbox worker → EventBridge → consumers | ❌ TODO | No AWS SDK integration, no event publishing, no event routing rules. | HIGH |
| **TenantContext middleware wiring** | `SET LOCAL app.current_tenant` on every DB transaction | ⚠️ Partial | `TenantContextMiddleware` exists but only stores context on `req` — **does NOT call** `PrismaService.withTenantContext()`. Services use `where: { tenantId }` in Prisma queries instead of relying on RLS. | **CRITICAL** (security) |
| **Audit trail — RLS integration** | RLS policies enforce tenant isolation at DB level | ⚠️ Broken | RLS policies exist in `post-migration-rls.sql` but are never applied because: (a) no migrations run, (b) middleware doesn't set session variables. Application-level filtering is the only protection. | **CRITICAL** |
| **Temporal history tables** | Plan.md mentions "triggers for temporal history tables" | ❌ Missing | No temporal/versioning tables. No `_history` or `_audit` tables. Only the `AuditEvent` log exists. | LOW (audit log covers most use cases) |

**Summary: 5 critical backend gaps in Foundation Layer.** The Auth + RLS + Migrations trio blocks all demos and pilot readiness.

---

### 1.3 Phase 2 — Operator Module (Weeks 7–14)

| Requirement | Plan.md Spec | Codebase Status | Gap | Severity |
|---|---|---|---|---|
| Facility CRUD API | 6 routes | ✅ 6 routes implemented | — | — |
| Plant registration + lifecycle | 4 routes with state machine | ✅ 4 routes with `VALID_TRANSITIONS` map | — | — |
| Harvest API | Transactional harvest→batch creation | ✅ 3 routes, transactional | **Missing:** `GET /harvests` list endpoint | LOW |
| Lab result API | Submit CoA, auto pass/fail | ✅ 4 routes | **Missing:** Configurable threshold rules engine (Plan 2.4). Pass/fail is hardcoded boolean check. | MEDIUM |
| Transfer API | 5 routes, discrepancy detection | ✅ 5 routes | **Missing:** Inventory auto-adjustment on acceptance. **Missing:** Discrepancy flag when `receivedQuantityGrams ≠ quantityGrams`. | HIGH |
| Sales API | 3 routes, inventory deduction | ✅ 3 routes | **Missing:** Inventory auto-deduction on sale. **Missing:** Sales aggregation/reporting endpoints. | HIGH |
| **class-validator DTOs** | Plan 6.1 + ValidationPipe explicit | ❌ Missing | All controllers use `@Body() dto: any`. `ValidationPipe` is configured globally but has nothing to validate because there are no class-validator classes. **Any malformed request reaches Prisma.** | **CRITICAL** |
| **Plant tracking ID atomicity** | Globally unique NCTS-ZA-YYYY-NNNNNN | ⚠️ Race condition | `generateTrackingId()` does `findFirst(orderBy: desc)` + increment. Under concurrent requests, two plants can get the same ID. Need DB sequence or `SERIAL` field. | HIGH |
| **Transfer/Sale number atomicity** | Auto-generated unique numbers | ⚠️ Race condition | `count() + 1` pattern used for TRF-YYYY and SALE-YYYY numbers. Not atomic. Same race condition as plant tracking IDs. | HIGH |
| **Batch creation for processing** | `POST /batches` for manual batch creation (processing batches) | ❌ Missing | Batches are only created via harvest. No way to create a "processed" or "packaged" batch from a parent batch. | MEDIUM |
| **Batch weight updates** | `PATCH /batches/:id` | ❌ Missing | No endpoint to update batch `processedWeightGrams` or `dryWeightGrams` post-harvest. | MEDIUM |
| GPS coordinate validation | Plan: must be within SA | ✅ SQL constraint | `chk_facility_within_sa` constraint in `post-migration-rls.sql`. Also `SA_BOUNDS` in `shared-types/common.ts`. Need application-level validation too. | LOW |

---

### 1.4 Phase 3 — Regulatory Module (Weeks 15–20)

| Requirement | Plan.md Spec | Codebase Status | Gap | Severity |
|---|---|---|---|---|
| Dashboard KPIs + trends API | `GET /regulatory/dashboard` + `/trends` | ✅ Done | `pendingInspections: 0` hardcoded (no inspection model) | LOW |
| Facilities GeoJSON API | `GET /regulatory/facilities/geo` | ✅ Done | Returns valid GeoJSON FeatureCollection | — |
| Operators list API | `GET /regulatory/operators` | ✅ Done | Paginated with counts | — |
| Permits API + status update | `GET` + `PATCH /regulatory/permits/:id/status` | ✅ Done | **Permit status audit event** skips hash-chaining (empty `previousHash` and `eventHash`) | MEDIUM |
| Compliance alerts API | `GET /regulatory/compliance/alerts` | ✅ Done | Dynamically computed from data. **But:** hardcoded rules, not configurable. | HIGH |
| **Configurable compliance rules engine** | Rules stored in DB, not hardcoded (Plan 3.3) | ❌ Missing | No `ComplianceRule` model in Prisma schema. Rules are inline in `RegulatoryService.getComplianceAlerts()`. Regulations change — this must be data-driven. | HIGH |
| **Compliance rules CRUD** | `POST /regulatory/compliance/rules` | ❌ Missing | No endpoint to create/update rules. | HIGH |
| **Operator compliance profile** | `GET /regulatory/compliance/operator/:id` | ❌ Missing | No per-operator profile endpoint. Dashboard has aggregate only. | MEDIUM |
| **Inspection model** | Plan 3.4: `POST /regulatory/inspections`, `PATCH /:id` | ❌ Missing | **No Inspection model in Prisma schema.** No routes, no service. This is a full missing module. | HIGH |
| **Inspection scheduling** | Calendar, routing, checklist | ❌ Missing | No inspection workflow at all. | HIGH |
| **Standard reports** | Monthly production summary, compliance rates, export docs | ❌ Missing | No report generation endpoints. No PDF export. | MEDIUM |
| **Diversion detection** | Expected vs. actual inventory comparison | ❌ Missing | Mentioned in Plan 3.3 — no inventory reconciliation logic. | HIGH |
| **Provincial drill-down** | National → Provincial → Operator hierarchy | ⚠️ Partial | Dashboard is flat national view. No province-level aggregation endpoint. | MEDIUM |

---

### 1.5 Phase 4 — Verification Module (Weeks 21–23)

| Requirement | Plan.md Spec | Codebase Status | Gap | Severity |
|---|---|---|---|---|
| Verification API | `GET /verify/:trackingId` (public) | ✅ Done | Full chain-of-custody resolution | — |
| Report suspicious | `POST /verify/report` | ✅ Done | Logs to audit event but **uses `require('crypto')`** (CommonJS in ESM context) | LOW |
| **QR code generation API** | `GET /qr/:batchId` — SVG, `GET /qr/:batchId/label` — Avery | ❌ Missing | `qr-lib` package has HMAC signing but **no controller/service** generates QR codes via API. No QR SVG rendering on server side. | MEDIUM |
| **HMAC URL validation** | Verify QR signature on verification endpoint | ❌ Missing | `qr-lib` has `verifySignature()` but verification controller **doesn't validate HMAC**. Anyone can fabricate a URL. | HIGH |
| **Response caching** | CloudFront edge caching (TTL: 5 min) | ❌ Missing | No cache headers on verification endpoint. No Redis caching. | MEDIUM |
| **Suspicious product table** | Dedicated model for suspicious reports | ❌ Missing | Reports only logged to console + audit event. No queryable table for investigators. | MEDIUM |

---

### 1.6 Phase 5 — Mobile App & Offline Support (Weeks 24–29)

| Requirement | Codebase Status | Notes |
|---|---|---|
| React Native app | ❌ Not started | No `apps/mobile/` directory |
| WatermelonDB offline sync | ❌ Not started | No sync protocol |
| PWA offline (Workbox) | ❌ Not started | No service worker in any app |
| SMS notifications (Clickatell) | ❌ Not started | No notification service |
| WhatsApp Business API | ❌ Not started | Stretch goal |

**Backend API requirements for mobile support:**
- `POST /api/v1/sync/push` — client pushes offline mutations
- `GET /api/v1/sync/pull?since=<timestamp>` — client pulls changes since last sync
- Conflict resolution logic (server-wins for compliance data)
- Delta/incremental sync response format
- Offline-friendly pagination with cursor-based pagination (not offset)

---

### 1.7 Phase 6 — Security Hardening & POPIA (Weeks 30–34)

| Requirement | Codebase Status | Notes |
|---|---|---|
| RLS audit (cross-tenant tests) | ❌ Not started | RLS not wired at app level |
| Rate limiting (`@nestjs/throttler`) | ❌ Not started | No throttler module |
| PII encryption (envelope encryption) | ⚠️ Library exists | `@ncts/crypto-lib` has `encrypt()`/`decrypt()` but **not integrated** into any service |
| Secrets management (AWS Secrets Manager) | ❌ Not started | Secrets in `.env` files |
| Vulnerability scanning (Snyk/Trivy) | ❌ Not started | No security scanning in CI |
| DSAR export endpoint | ❌ Not started | No `GET /privacy/export/:userId` |
| Deletion request endpoint | ❌ Not started | No soft-delete workflow |
| Consent management | ❌ Not started | No consent model |
| Breach detection | ❌ Not started | No anomaly detection |
| Patient data pseudonymization | ❌ Not started | No patient model at all |

---

### 1.8 Phase 7 — Integration, Testing & Pilot (Weeks 35–40)

| Requirement | Codebase Status | Notes |
|---|---|---|
| E2E seed-to-sale test | ❌ Zero tests | No `*.spec.ts` files anywhere in `apps/api/` |
| Multi-tenant isolation test | ❌ Zero tests | — |
| Load tests (k6) | ❌ Not started | No k6 scripts |
| Terraform / AWS infrastructure | ❌ Empty | `infrastructure/terraform/` has only `.gitkeep` |
| Staging deployment | ❌ Not started | No deploy pipeline |
| Monitoring (CloudWatch + Sentry) | ❌ Not started | No monitoring config |
| API documentation | ⚠️ Partial | Swagger auto-generated but DTOs are `any` so docs show no request schemas |

---

### 1.9 Gap Summary Matrix

| Category | Items in Plan.md | Items Built | Gap Count | Gap % |
|---|---|---|---|---|
| Auth & Login | 8 | 3 | 5 | 63% |
| Database & Migrations | 5 | 3 | 2 | 40% |
| Core CRUD APIs | 10 | 10 | 0 | 0% |
| Business Logic | 12 | 8 | 4 | 33% |
| DTO Validation | 1 (critical) | 0 | 1 | 100% |
| Compliance Engine | 5 | 1 | 4 | 80% |
| Inspection Module | 4 | 0 | 4 | 100% |
| Event System | 3 | 0 | 3 | 100% |
| QR/Verification | 5 | 2 | 3 | 60% |
| Testing | 5 | 0 | 5 | 100% |
| Security/POPIA | 11 | 1 | 10 | 91% |
| Infrastructure | 6 | 1 | 5 | 83% |
| **TOTAL** | **75** | **29** | **46** | **61%** |

---

## 2. SA Government API Integration Requirements

### 2.1 SARS eFiling Integration

**Context:** South Africa's Cannabis for Private Purposes Act and the broader commercial framework will require excise duty reporting to SARS. Cannabis excise is likely to follow the established alcohol/tobacco model.

**Technical requirements:**
- **Data format:** SARS eFiling uses XML-based submissions conforming to their own schemas. The eFiling platform accepts `.xml` uploads or API-based submissions via their e@syFile system.
- **Excise duty returns:** SARS Customs & Excise prescribes DA 260 returns (excisable goods declaration). Cannabis will require adapted forms.
- **Fields needed from NCTS:**
  - Manufacturer/cultivator registration number (Customs code)
  - Product category (medicinal, recreational, hemp, industrial)
  - Quantity produced (kg)
  - Quantity sold (kg)
  - Quantity destroyed (kg)
  - Excise duty rate × quantity = amount payable
  - Period (monthly or quarterly)
- **Authentication:** SARS eFiling uses certificate-based authentication + tax reference numbers. No public OAuth/OIDC.
- **Real-time vs. batch:** SARS operates on a **batch/periodic submission** model (monthly excise returns), not real-time.
- **Backend need:** A `SarsReportingService` that:
  - Aggregates production, sales, and destruction data per reporting period
  - Generates XML conforming to the DA 260 schema
  - Signs the submission (SARS may require digital signatures)
  - Stores submission history + acknowledgment receipts
  - Handles resubmission/amendment workflows

### 2.2 SAHPRA Data Exchange

**Context:** SAHPRA (South African Health Products Regulatory Authority) regulates medicinal cannabis under the Medicines and Related Substances Act (Section 22A permits). SAHPRA maintains a permit database and requires reporting from licensees.

**Technical requirements:**
- **Permit data model:** Section 22A permits specify:
  - Substance(s) authorized (e.g., "Cannabis sativa L., dried flowering tops")
  - Authorized activities (cultivate, manufacture, distribute, research)
  - Maximum quantities per annum
  - Facility locations
  - Responsible person (pharmacist/physician)
  - Validity period (typically 1–2 years)
  - Conditions/restrictions
- **Reporting obligations:**
  - Annual return of quantities produced, used, distributed, destroyed
  - Incident reports (theft, loss, diversion)
  - Product quality complaints
  - Records retained for **minimum 5 years** (Medicines Act), SAHPRA practice is **7 years**
- **Data exchange format:** SAHPRA does not currently have a standardized API. Communication is via:
  - Email + PDF/Excel for permit applications and returns
  - The SAHPRA RRMS (Regulatory and Registration Management System, built on Oracle) for internal processing
  - Future: SAHPRA has indicated intent to build an e-submission portal (similar to EMA CESP)
- **Backend need:** 
  - `SahpraReportingModule` generating annual returns in PDF + structured data (CSV/JSON)
  - Permit lifecycle management matching SAHPRA's workflow (application → provisional → full approval)
  - Automatic alerts when production approaches permitted maximums
  - Pre-built data export in formats SAHPRA currently accepts (Excel/XLSX)
  - API-ready integration layer for when SAHPRA launches e-submission

### 2.3 SITA Standards for Government APIs

**Context:** SITA (State Information Technology Agency) defines standards for government IT systems in SA.

**Key standards:**
- **MIOS (Minimum Interoperability Standards):** Mandates use of:
  - XML or JSON for data exchange
  - SOAP or REST for web services
  - HTTPS/TLS 1.2+ for transport security
  - UTF-8 encoding
  - ISO 8601 for dates/times
  - ISO 3166-1 for country codes (ZA)
  - ISO 4217 for currency codes (ZAR)
- **e-Government Interoperability Framework (e-GIF SA):**
  - OpenAPI/Swagger specification recommended for REST services
  - Metadata standards based on Dublin Core
  - Government domain classification scheme
- **Data standards:**
  - SA ID number validation (Luhn checksum algorithm)
  - Business registration: CIPC registration numbers
  - Tax: SARS tax reference numbers
  - Address: SA address format standards
- **Authentication patterns:**
  - SA government does not have a universal citizen SSO/eID system yet
  - Government personnel authenticate via departmental Active Directory / LDAP
  - eID South Africa (eSA) is in pilot/development — smart ID card-based
  - SAML 2.0 federation is the recommended approach for inter-agency SSO
  - OAuth 2.0 / OIDC gaining adoption in newer government systems
- **Backend need:**
  - All API responses use ISO 8601 dates (already done)
  - OpenAPI spec auto-generated (already done, but undocumented because DTOs are `any`)
  - SAML federation placeholder for government users (planned for Cognito)
  - SA ID number validation in DTO validators
  - CIPC registration number validation

### 2.4 Data Retention Requirements

| Regulator | Retention Period | Data Types | Legal Basis |
|---|---|---|---|
| SAHPRA | 5–7 years | Permits, production records, distribution, CoAs, incident reports | Medicines Act s.22C, Schedule 7 |
| SARS | 5 years | Excise returns, sales records, financial data | Tax Administration Act s.29 |
| DALRRD | 5 years | Hemp permits, cultivation records, export certificates | Agricultural Pests Act, DALRRD guidelines |
| POPIA | Purpose limitation | Personal data only retained while purpose exists | POPIA s.14 |
| Labour | 3 years | Employee records relevant to cannabis operations | Basic Conditions of Employment Act |
| INCB | Indefinite | Annual statistical reports (International Narcotics Control Board) | Single Convention on Narcotic Drugs, 1961 |

**Backend need:** 
- `DataRetentionService` with configurable per-table retention policies
- Soft-delete for operational data, hard-delete after retention period
- Archive tier (cold storage) for expired retention data
- Retention metadata on every record type

---

## 3. SA Cannabis Regulatory Backend Requirements

### 3.1 Cannabis for Private Purposes Act Tracking

**Context:** The Cannabis for Private Purposes Act (signed into law 2024, commencement date pending) decriminalizes private use and sets the framework for commercial legalization via subsequent regulations.

**Backend requirements:**
- **Distinction between private and commercial:** System must track only commercially licensed operations. Private use data is NOT collected (POPIA minimization).
- **Prohibited activities tracking:** The Act criminalizes non-licensed commercial cultivation, sale, and distribution. The tracking system serves as evidence of lawful activity.
- **License validation:** Every entity in the system must be linked to a valid permit. No operations permitted without active license.
- **Backend need:** 
  - `LicenseValidationGuard` — NestJS guard that checks permit validity on every state-changing operation
  - Permit expiry pre-check on `POST /plants`, `POST /harvests`, `POST /transfers`, `POST /sales`
  - Automatic rejection of operations by operators with expired/revoked/suspended permits

### 3.2 SAHPRA Section 22A Permit Data Model

**Current schema:** The `Permit` model has 12 fields — adequate for basic tracking but missing SAHPRA-specific fields.

**Missing fields for Section 22A compliance:**
```
authorizedSubstances: Json         // List of authorized substances + forms
authorizedActivities: String[]     // ['cultivate', 'manufacture', 'distribute', 'research', 'export']
maxAnnualQuantityKg: Float         // Maximum production authorized per annum
responsiblePersonName: String      // Pharmacist/physician responsible
responsiblePersonQualification: String
responsiblePersonRegistration: String  // HPCSA/SAPC registration number
safetyOfficerName: String?
securityMeasures: String?          // Description of security at facility
storageConditions: String?         // Required storage conditions
renewalDate: DateTime?             // Next renewal due date
applicationReference: String?       // SAHPRA application reference number
previousPermitId: String?          // Link to previous permit for renewal chain
```

### 3.3 DALRRD Hemp Permit Reporting

**Context:** DALRRD (Department of Agriculture, Land Reform, and Rural Development) regulates hemp cultivation (<0.2% THC).

**Backend requirements:**
- Separate permit type tracking (already have `PermitType.DALRRD_HEMP` enum)
- THC threshold enforcement: batches from hemp-licensed operators must have lab results confirming <0.2% THC
- **Planting intention reports:** DALRRD requires pre-season planting intention declarations
  - Fields: intended area (hectares), cultivar(s), estimated yield, planting dates
- **Harvest reports:** Post-harvest yield reporting per cultivar
- **Export certificates:** For hemp fiber/seed exports, DALRRD issues phytosanitary certificates
- **Backend need:**
  - `PlantingIntention` model (new entity)
  - `HarvestReport` model (extends existing Harvest data)
  - Auto-check: if `permit.permitType === 'dalrrd_hemp'` and `labResult.thcPercent > 0.2`, generate CRITICAL compliance alert
  - Export certificate generation endpoint

### 3.4 Excise Duty Calculation Engine

**Context:** Cannabis excise duty in SA is expected to follow the alcohol/tobacco model based on draft regulations.

**Backend requirements:**
- **Rate structure** (configurable — rates not yet finalized):
  - Rate per gram of dried cannabis flower
  - Rate per ml of cannabis extract/oil
  - Rate per unit of edible product
  - Different rates for medicinal vs. recreational (if differentiated)
- **Calculation service:**
  ```
  ExciseDutyService:
    calculateDuty(batchId, saleQuantity, productCategory) → {
      rateApplied: number,
      dutyAmount: number (ZAR),
      quantity: number,
      unit: string,
      period: string
    }
  ```
- **Aggregation:** Monthly/quarterly totals for SARS DA 260 submission
- **Backend need:**
  - `ExciseRate` model (configurable rate table)
  - `ExciseLedger` model (per-transaction duty calculation)
  - `ExciseReturnService` generates period returns

### 3.5 INCB Annual Reporting

**Context:** South Africa, as a signatory to the 1961 Single Convention on Narcotic Drugs, must submit annual statistical returns to the International Narcotics Control Board (INCB) in Vienna.

**Required data (Form C — Cannabis):**
- Total area of cannabis cultivation (hectares)
- Total production of cannabis herb (kg)
- Total production of cannabis resin (kg)
- Quantity consumed for medical/scientific purposes (kg)
- Quantity used for industrial purposes (kg)
- Quantity exported (kg, by destination country)
- Quantity imported (kg, by source country)
- Stocks held at end of year (kg)

**Backend need:**
- `IncbReportService` that aggregates annual data from plants, batches, sales, transfers (export/import), and inventory
- Output format matching INCB submission template (Excel/PDF)
- Year-end inventory snapshot calculation

### 3.6 Import/Export Documentation

**Backend requirements for international trade:**
- Import/export permit tracking (linked to SAHPRA Section 22C and DALRRD hemp export permits)
- Country-specific destination/origin tracking  
- `ImportExportRecord` model:
  ```
  id, tenantId, type (import|export), 
  countryCode (ISO 3166-1), partnerCompany,
  batchId, quantityKg, productCategory,
  permitId, customsDeclarationNumber,
  shippingDate, arrivalDate, status,
  documents: Json (links to CoA, GMP cert, phytosanitary cert)
  ```
- Customs documentation generation
- Auto-link with INCB reporting

### 3.7 Destruction/Disposal Tracking

**Current state:** The `Plant` model has `destroyedDate` and `destroyedReason` fields, and the state machine supports `→ destroyed`. But this is minimal.

**Regulatory requirement:** Cannabis destruction must be witnessed, documented, and reported. SAHPRA and SAPS may require notification.

**Missing backend capabilities:**
- `DestructionEvent` model:
  ```
  id, tenantId, entityType (plant|batch), entityIds,
  quantityKg, destructionMethod (incineration|grinding|composting),
  destructionDate, witnessNames: String[],
  witnessOrganizations: String[] (e.g., SAPS, SAHPRA inspector),
  witnessSignatures: String? (base64 or URL),
  reason (failed_lab|expired|damaged|regulatory_order|excess),
  photos: String[], videoUrl: String?,
  regulatoryNotificationSent: Boolean,
  approvedBy: String (user ID), createdAt
  ```
- Destruction must generate audit event + mandatory regulator notification
- Destruction quantities must reconcile with inventory (plant count + batch weight)

### 3.8 Patient Access Tracking (Medical Cannabis)

**Context:** Medical cannabis patients in SA access cannabis via SAHPRA Section 21 (individual patient) or Section 22A (general permit for Schedule 6 substances). Patient identity must be pseudonymized per POPIA.

**Backend requirements:**
- **No patient PII in main DB** — patients referenced by pseudonymous ID only
- `PatientAccess` model:
  ```
  id, pseudonymizedPatientId (SHA-256 hash of ID number + salt),
  prescribingDoctorHPCSA: String,
  diagnosisCategory: String (not full diagnosis — just ICD-10 category),
  productCategory: String,
  quantityDispensed: Float,
  dispensingDate: DateTime,
  dispensingFacilityId: String,
  batchId: String
  ```
- Aggregate reporting only (no individual patient data exposure)
- Access controlled: only `lab_technician` and `regulator` roles can view aggregate reports

---

## 4. Compliance Engine Specifications

### 4.1 Architecture: Configurable Rules Engine

**Current state:** Compliance alerts in `RegulatoryService` are hardcoded inline logic (expired permits, expiring permits, non-compliant operators, failed lab results). This is not sustainable — South African cannabis regulations are evolving rapidly.

**Target architecture:**

```
ComplianceRule (Prisma model):
  id: UUID
  name: String              // "Expired Permit Check"
  description: String
  category: String          // 'permit', 'inventory', 'lab', 'production', 'transfer'
  severity: String          // 'info', 'warning', 'critical'
  isActive: Boolean
  evaluationType: String    // 'real_time' | 'batch' | 'scheduled'
  ruleDefinition: Json      // Structured rule definition (see below)
  thresholds: Json          // Configurable numeric thresholds
  escalationPolicy: Json    // Who gets notified, when
  createdBy: String
  createdAt: DateTime
  updatedAt: DateTime
```

**Rule definition schema (JSON):**
```json
{
  "type": "threshold_check",
  "entity": "permit",
  "condition": "expiryDate < NOW()",
  "parameters": {
    "warningDaysBefore": 30,
    "criticalDaysBefore": 7
  }
}
```

### 4.2 Rule Types

| Rule ID | Name | Category | Evaluation | Default Threshold |
|---|---|---|---|---|
| R001 | Expired permit | permit | scheduled (daily) | 0 days past expiry |
| R002 | Permit expiring soon | permit | scheduled (daily) | 30 / 14 / 7 days |
| R003 | Production exceeds permit limit | production | real-time (on harvest) | 100% of `maxAnnualQuantityKg` |
| R004 | Inventory discrepancy | inventory | batch (weekly) | >5% variance |
| R005 | Overdue lab testing | lab | scheduled (weekly) | >30 days since batch creation without lab result |
| R006 | Failed lab result | lab | real-time (on submit) | Any contaminant fail |
| R007 | Hemp THC over limit | lab | real-time (on submit) | >0.2% for DALRRD permits |
| R008 | Transfer quantity mismatch | transfer | real-time (on acceptance) | >2% variance sent vs received |
| R009 | Missing transfer documentation | transfer | batch (weekly) | Transfer accepted without all items received |
| R010 | Unusual production volume | production | batch (monthly) | >200% of rolling 3-month average |
| R011 | Suspicious verification pattern | verification | real-time | >50 verifications/hour for same product |
| R012 | Operator not reporting | production | scheduled (monthly) | Zero activity for 60+ days |
| R013 | Unregistered facility activity | facility | real-time | Plants registered to inactive facility |
| R014 | Cross-operator transfer to non-licensed entity | transfer | real-time | Receiver permit expired/revoked |

### 4.3 Real-Time vs. Batch Compliance Checking

**Real-time (synchronous — checked on every write operation):**
- Implemented as NestJS interceptor or guard
- Runs BEFORE the operation completes (blocking)
- Critical rules only: R003 (production limit), R006 (failed lab), R007 (hemp THC), R008 (transfer mismatch), R014 (non-licensed receiver)
- Returns 400/403 if rule violated (prevents non-compliant data entry)

**Batch (asynchronous — scheduled job):**
- Runs via `@nestjs/schedule` cron jobs
- Non-blocking, produces alerts after the fact
- Weekly: R004 (inventory discrepancy), R005 (overdue testing), R009 (missing docs)
- Monthly: R010 (unusual volume), R012 (not reporting)
- Daily: R001 (expired permits), R002 (expiring permits)

**Backend implementation pattern:**
```typescript
@Injectable()
export class ComplianceEngineService {
  // Load active rules from DB
  async loadRules(): Promise<ComplianceRule[]> {}
  
  // Evaluate a single rule against an entity
  async evaluateRule(rule: ComplianceRule, context: ComplianceContext): Promise<ComplianceAlert | null> {}
  
  // Evaluate all real-time rules (called by interceptor)
  async evaluateRealTime(entityType: string, entityId: string, operation: string): Promise<ComplianceAlert[]> {}
  
  // Run all batch/scheduled rules
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyChecks(): Promise<void> {}
  
  @Cron('0 3 * * 0') // Sundays at 3 AM
  async runWeeklyChecks(): Promise<void> {}
}
```

### 4.4 Alert Escalation Workflows

```
Alert Created → [severity = info] → Dashboard only
                [severity = warning] → Dashboard + email to compliance officer
                [severity = critical] → Dashboard + email + SMS + in-app notification
                [severity = critical, unresolved > 48h] → Escalate to senior regulator
                [severity = critical, unresolved > 7d] → Auto-suspend operator permit
```

**Escalation model:**
```
ComplianceAlert:
  id, ruleId, operatorTenantId, facilityId?,
  severity, alertType, description,
  status (open|acknowledged|investigating|resolved|escalated),
  assignedTo, escalationLevel (0-3),
  resolvedAt, resolvedBy, resolutionNotes,
  autoActions: Json (e.g., {suspendPermit: true}),
  createdAt, updatedAt
```

### 4.5 Compliance Scoring Algorithm

**Per-operator compliance score (0-100):**

```
Score = 100 - Σ(deductions)

Deductions:
  - Active CRITICAL alert: -20 each (max -60)
  - Active WARNING alert: -5 each (max -20)
  - Failed lab result in last 90 days: -10 each
  - Late reporting: -5 per month overdue
  - Transfer discrepancy: -3 per incident
  - Permit approaching expiry (<30 days): -5
  - Expired permit: -40 (automatic non-compliant)

Score ranges:
  90-100: Compliant (green)
  70-89:  Warning (amber)
  50-69:  Non-compliant (red)
  <50:    Critical — auto-escalation, possible permit suspension
```

### 4.6 Diversion Detection Algorithms

**Algorithm 1: Inventory Mass Balance**
```
Expected inventory = 
  (plants registered × average yield per plant) 
  + incoming transfers 
  - outgoing transfers 
  - sales 
  - destruction events 
  - lab sampling wastage

Actual inventory = 
  Σ(batch weights where status = in_stock)

Variance = |Expected - Actual| / Expected × 100

If variance > 5%: WARNING alert
If variance > 15%: CRITICAL alert + investigation trigger
```

**Algorithm 2: Wet-to-Dry Weight Ratio Anomaly**
```
Normal range: 20-30% (dry weight is 20-30% of wet weight)
If dry_weight / wet_weight < 0.15 or > 0.40: FLAG for review
Could indicate unreported product removal or weight manipulation.
```

**Algorithm 3: Transfer Velocity Analysis**
```
Flag operators who transfer product unusually quickly after harvest:
  Average time from harvest to first transfer: N days
  If transfer < N/3 days: FLAG (possible bypassing of testing)
```

**Algorithm 4: Verification Pattern Anomaly**
```
Flag products with unusually high verification rates:
  If same trackingId verified > 50 times/day: possibly counterfeit QR codes in circulation
  If same IP verifies > 20 different products/hour: possibly automated scraping
```

### 4.7 Inventory Reconciliation Methods

**Method: Perpetual Inventory with Periodic Reconciliation**

- Every plant registration, harvest, batch creation, transfer, sale, and destruction event updates a running inventory counter.
- Weekly batch job performs full reconciliation:
  1. Calculate expected inventory from event chain
  2. Compare with declared batch weights
  3. Generate variance report
  4. Flag anomalies per diversion detection rules

**New model needed:**
```
InventorySnapshot:
  id, tenantId, facilityId,
  snapshotDate, snapshotType (automatic|manual|audit),
  items: Json [{batchId, expectedGrams, declaredGrams, variance}],
  totalExpectedGrams, totalDeclaredGrams, variancePercent,
  status (clean|flagged|under_investigation),
  investigatorId?, notes?,
  createdAt
```

---

## 5. Data Architecture Requirements

### 5.1 Data Sovereignty

**Requirement:** All NCTS data **must reside within South African borders.**

**Implementation:**
- AWS `af-south-1` (Cape Town) region — **only** region used for all services
- RDS: Multi-AZ within af-south-1 (no cross-region replication)
- S3: Bucket in af-south-1 with bucket policy denying cross-region replication
- CloudFront: Leave cache globally distributed (no PII in cached content — only verification results)
- EventBridge: af-south-1 only
- Cognito: af-south-1 only
- Backups: S3 lifecycle policy keeping backups in af-south-1

**Backend implications:**
- Terraform must hard-code `af-south-1` region
- S3 bucket policy: `"Condition": {"StringEquals": {"s3:LocationConstraint": "af-south-1"}}`
- No Lambda@Edge processing that could run outside SA
- CloudFront verification endpoint must forward to af-south-1 origin (no edge compute for data-bearing responses)

### 5.2 Government Data Classification

**SA government data classification framework (MISS):**

| Classification | Examples in NCTS | Handling |
|---|---|---|
| **TOP SECRET** | N/A (no national security data) | — |
| **SECRET** | N/A | — |
| **CONFIDENTIAL** | Operator tax numbers, SA ID numbers, patient pseudonymous IDs | Encrypted at rest + in transit. Access logged. |
| **RESTRICTED** | Permit details, compliance scores, inspection findings | Access control (RBAC). Audit trail required. |
| **UNCLASSIFIED** | Public verification data, strain reference data | Standard security. Can be cached. |

**Backend need:**
- Data classification metadata on each model/field
- `@Confidential()` decorator for controller fields that require enhanced logging
- Encryption at field level for CONFIDENTIAL data (SA ID numbers, tax numbers) using `@ncts/crypto-lib`
- API responses strip CONFIDENTIAL fields for lower-privilege roles

### 5.3 Data Sharing Agreements Between Agencies

**Expected inter-agency data flows:**

```
SAHPRA ←→ NCTS: Permit data, production volumes, lab results, incident reports
SARS ←→ NCTS: Excise duty returns, operator tax identifiers
DALRRD ←→ NCTS: Hemp permits, planting intentions, harvest reports, export certificates
DTIC ←→ NCTS: Processing permits, industrial hemp product data
SAPS ←→ NCTS: Destruction events, theft/loss reports, suspect activity
INCB ←→ NCTS (via SAHPRA): Annual statistical returns
Provincial govts ← NCTS: Provincial compliance reports, facility registrations
```

**Backend need:**
- `DataSharingAgreement` model tracking which agencies have access to which data categories
- Role-based data filtering: `regulator` role with `agency` field determines what data they see
- Agency-specific API endpoints or filtered views per agency
- Data sharing audit trail (who accessed what, when, for what purpose)

### 5.4 Open Data Initiatives

SA government encourages open data per the Open Government Partnership commitments.

**Candidate open datasets (anonymized):**
- Total licensed operators by province (no names)
- Total plants by lifecycle stage (aggregated)
- Compliance rates by province
- Lab test pass/fail rates by contaminant type
- Market volumes (aggregated, no operator identification)

**Backend need:**
- `GET /api/v1/public/statistics` — aggregated, anonymized data endpoint
- Rate limiting to prevent abuse
- No PII, no operator-identifiable information

### 5.5 Archive and Retention Policies

**Tiered storage architecture:**

| Age | Storage | Access | Backend |
|---|---|---|---|
| 0-12 months | PostgreSQL (hot) | Real-time API | Prisma queries |
| 1-5 years | PostgreSQL partitioned (warm) | Query on demand | Prisma with table partitioning |
| 5-7 years | S3 Glacier (cold) | Archived, retrieval in hours | Archive service |
| >7 years | Delete (unless legal hold) | N/A | `DataRetentionService` |

**Backend need:**
- Table partitioning by `created_at` (annual partitions for `audit_events`, `plants`, `sales`)
- Nightly archival job moving old data to warm/cold tier
- Legal hold flag per entity to prevent deletion
- `ArchiveService` for cold storage backup/retrieval

### 5.6 Disaster Recovery

**Requirements:**
- **RPO (Recovery Point Objective):** 1 hour (max data loss)
- **RTO (Recovery Time Objective):** 4 hours (max downtime)
- **Strategy:** RDS Multi-AZ with automated failover + daily snapshots to S3 + point-in-time recovery enabled

**Backend need:**
- Health check endpoint that actually tests DB connectivity (current one is static)
- Automated DB backup verification job
- Failover testing runbook
- Read replica for reporting queries (reduce load on primary)

---

## 6. Security & Privacy Backend Requirements

### 6.1 POPIA Compliance (Protection of Personal Information Act)

**POPIA alignment requirements:**

| POPIA Condition | Backend Implementation |
|---|---|
| **Accountability (s.8):** Responsible party must ensure compliance | Audit trail, data classification, consent records |
| **Processing limitation (s.9-12):** Minimal, adequate, not excessive | DTO validation removing unnecessary PII fields. Data minimization review per endpoint. |
| **Purpose specification (s.13):** Collected for specific purpose | `purpose` field on consent records. Data not used beyond stated purpose. |
| **Further processing limitation (s.15):** Compatible with original purpose | Access control preventing repurposing. Audit logs on cross-purpose access. |
| **Information quality (s.16):** Complete, accurate, up to date | Validation pipes on all inputs. Regular data quality checks. |
| **Openness (s.17-18):** Transparent about processing | PAIA manual. Privacy notice API. |
| **Security safeguards (s.19):** Appropriate measures | Encryption, RBAC, RLS, audit trail, penetration testing. |
| **Data subject participation (s.23-25):** Access, correction, deletion | DSAR endpoints: `GET /privacy/export/:userId`, `POST /privacy/deletion-request`, `PATCH /privacy/correction` |

**Specific backend endpoints needed:**
```
GET  /api/v1/privacy/export/:userId          — Full data export (DSAR)
POST /api/v1/privacy/deletion-request        — Request deletion
GET  /api/v1/privacy/deletion-request/:id    — Check deletion status
POST /api/v1/privacy/consent                 — Record consent
GET  /api/v1/privacy/consent/:userId         — Get consent status
POST /api/v1/privacy/breach-report           — Internal breach report
GET  /api/v1/privacy/data-classification     — Field-level classification map
```

### 6.2 Minimum Information Security Standards (MISS)

**MISS prescribes security controls for SA government IT systems:**

| Control | NCTS Implementation |
|---|---|
| **Access control** | RBAC (6 roles), JWT, MFA (Cognito TOTP), RLS at database level |
| **Audit trails** | Hash-chained append-only audit log (already built) |
| **Encryption at rest** | RDS KMS encryption, S3 SSE-KMS, PII field-level encryption |
| **Encryption in transit** | TLS 1.3 (Fastify HTTPS), `force_ssl` on RDS |
| **Key management** | AWS KMS for encryption keys, Secrets Manager for API keys/DB credentials |
| **Incident management** | Breach detection (anomaly monitoring), notification workflow, POPIA compliance |
| **Physical security** | AWS data center compliance (SOC 2, ISO 27001) |
| **Personnel security** | Role-based access, principle of least privilege |
| **Business continuity** | Multi-AZ deployment, automated backup, disaster recovery plan |

### 6.3 SA Government Encryption Standards

- **At rest:** AES-256 minimum (KMS default meets this)
- **In transit:** TLS 1.2 minimum, TLS 1.3 preferred
- **Hashing:** SHA-256 or better (already using SHA-256 for audit chain)
- **Digital signatures:** RSA-2048 or ECDSA P-256 for document signing
- **PII encryption:** AES-256-GCM with envelope encryption pattern (encrypt data with DEK, encrypt DEK with KEK in KMS)

**Backend needs:**
- Integrate `@ncts/crypto-lib` into services handling PII (currently exists but unused)
- `encrypt()` SA ID numbers, tax numbers before storage
- `hashForLookup()` for SA ID → pseudonymous lookup (for patient access)
- Document signing service for regulatory reports (PDF digital signatures)

### 6.4 Penetration Testing Requirements

**SA government standard:** Systems handling CONFIDENTIAL or higher data must undergo:
- Annual penetration test by SABS-accredited assessor
- Vulnerability assessment before production deployment
- Web application security testing (OWASP Top 10)

**Backend preparation:**
- OWASP Top 10 mitigations:
  1. **Broken Access Control:** RLS + RBAC + TenantGuard ✓ (but RLS not wired)
  2. **Cryptographic Failures:** Field-level encryption needed for PII
  3. **Injection:** Prisma parameterized queries ✓, but `$executeRawUnsafe` in tenant context is risky — uses string interpolation for tenant ID
  4. **Insecure Design:** Threat modeling documentation needed
  5. **Security Misconfiguration:** No security headers configured (Helmet/Fastify equivalent)
  6. **Vulnerable Components:** No dependency scanning in CI
  7. **Auth Failures:** No rate limiting on login, no account lockout
  8. **Data Integrity Failures:** Hash-chained audit trail ✓
  9. **Logging & Monitoring:** Logging ✓, monitoring not deployed
  10. **SSRF:** N/A — no user-provided URLs fetched server-side

**Specific code fix needed:**
```typescript
// CURRENT (vulnerable to SQL injection):
await (tx as any).$executeRawUnsafe(
  `SET LOCAL app.current_tenant = '${tenantId}'`
);

// SHOULD BE:
await (tx as any).$executeRawUnsafe(
  `SET LOCAL app.current_tenant = $1`, tenantId
);
```

### 6.5 Additional Security Backend Features

| Feature | Status | Detail |
|---|---|---|
| **Rate limiting** | ❌ Missing | Need `@nestjs/throttler`: 100/min for verification, 1000/min for authenticated, 5/min for login |
| **Security headers** | ❌ Missing | Need `@fastify/helmet`: HSTS, X-Content-Type-Options, X-Frame-Options, CSP |
| **Request correlation** | ✅ Done | `AllExceptionsFilter` generates correlation IDs |
| **Structured logging** | ✅ Done | `LoggingInterceptor` with JSON output |
| **IP allowlisting** | ❌ Missing | Government admin endpoints should be IP-restricted |
| **Session management** | ❌ Missing | No session store, no concurrent session limits |
| **Account lockout** | ❌ Missing | No failed login tracking |
| **API key management** | ❌ Missing | For machine-to-machine integrations (SARS, SAHPRA) |
| **Webhook signing** | ❌ Missing | HMAC signatures on outgoing webhook payloads |

---

## 7. Prioritized Feature List

### Tier 1: Critical for Government Acceptance (Must-Have for Pilot)

| # | Feature | Phase | Effort | Blocks |
|---|---|---|---|---|
| 1 | **AuthController — login/register/refresh endpoints** | 1 | 2 days | All frontend apps, demo |
| 2 | **Run Prisma migrations + provision database** | 1 | 0.5 day | All data operations |
| 3 | **class-validator DTO classes for ALL controllers** | 1-2 | 3 days | API security, Swagger docs |
| 4 | **Wire RLS via TenantContextMiddleware + PrismaService.withTenantContext()** | 1 | 2 days | Multi-tenant security |
| 5 | **Fix SQL injection in tenant context** (`$executeRawUnsafe` string interpolation) | 1 | 0.5 day | Security audit |
| 6 | **Inspection module** (Prisma model + CRUD API + scheduling) | 3 | 3 days | Regulatory module |
| 7 | **Configurable compliance rules engine** (model + CRUD + evaluation service) | 3 | 4 days | Regulatory compliance |
| 8 | **Inventory tracking** (auto-deduction on sale/transfer, mass balance reconciliation) | 2 | 3 days | Diversion detection |
| 9 | **Hash-chained audit for permit status changes** (fix empty hash in `updatePermitStatus`) | 3 | 0.5 day | Audit integrity |
| 10 | **Atomic sequence number generation** (DB sequences for tracking IDs, transfer/sale numbers) | 2 | 1 day | Data integrity |

### Tier 2: Important for Pilot Quality

| # | Feature | Phase | Effort |
|---|---|---|---|
| 11 | **HMAC URL validation on verification endpoint** | 4 | 0.5 day |
| 12 | **QR code generation API** (`/qr/:batchId` SVG + label) | 4 | 2 days |
| 13 | **Compliance scoring algorithm** (per-operator 0-100 score) | 3 | 2 days |
| 14 | **Diversion detection service** (mass balance + anomaly algorithms) | 3 | 3 days |
| 15 | **Rate limiting** (`@nestjs/throttler`) | 6 | 1 day |
| 16 | **Health check — real service checks** (DB, Redis) | 0 | 0.5 day |
| 17 | **Redis integration module** (caching, sessions, token blacklist) | 1 | 2 days |
| 18 | **Destruction/disposal tracking** (model + API) | 2 | 2 days |
| 19 | **Batch creation/update endpoints** (processing, packaging) | 2 | 1 day |
| 20 | **Reporting endpoints** (monthly production, compliance rates, export) | 3 | 3 days |

### Tier 3: Important for Production

| # | Feature | Phase | Effort |
|---|---|---|---|
| 21 | **Transactional Outbox pattern** (outbox table + polling worker) | 1 | 3 days |
| 22 | **EventBridge integration** (publish domain events) | 1 | 2 days |
| 23 | **POPIA endpoints** (DSAR export, deletion request, consent management) | 6 | 3 days |
| 24 | **PII field encryption** (integrate crypto-lib into services) | 6 | 2 days |
| 25 | **Security headers** (Fastify Helmet) | 6 | 0.5 day |
| 26 | **Transfer discrepancy detection + alerts** | 2 | 1 day |
| 27 | **Sales aggregation/reporting endpoints** | 2 | 1 day |
| 28 | **Provincial drill-down API** for regulatory dashboard | 3 | 1 day |
| 29 | **Operator compliance profile endpoint** | 3 | 1 day |
| 30 | **Suspicious product reports table + investigator API** | 4 | 1 day |

### Tier 4: Nice-to-Have / Future Phases

| # | Feature | Phase | Effort |
|---|---|---|---|
| 31 | **SAHPRA reporting service** (annual returns, permit-aligned) | 3+ | 3 days |
| 32 | **SARS excise duty engine** (rate tables, calculation, DA 260 generation) | 3+ | 4 days |
| 33 | **INCB annual reporting** (Form C aggregation) | 3+ | 2 days |
| 34 | **Cognito production setup** (SAML federation for government) | 5+ | 3 days |
| 35 | **Offline sync API** (push/pull endpoints for mobile) | 5 | 4 days |
| 36 | **SMS/WhatsApp notifications** (Clickatell integration) | 5 | 2 days |
| 37 | **Patient access pseudonymization** | 6 | 2 days |
| 38 | **Import/export tracking** model + API | 3+ | 2 days |
| 39 | **PlantingIntention model** (DALRRD hemp pre-season reporting) | 3+ | 1 day |
| 40 | **Terraform for AWS af-south-1** (full IaC) | 7 | 5 days |
| 41 | **k6 load test scripts** | 7 | 2 days |
| 42 | **Unit + integration tests** (minimum 80% coverage on services) | 7 | 8 days |
| 43 | **E2E seed-to-sale test** (Playwright or Testcontainers) | 7 | 3 days |
| 44 | **Data retention service** (tiered storage + archival) | 6 | 3 days |
| 45 | **Breach detection/anomaly monitoring** | 6 | 3 days |
| 46 | **Public statistics open data endpoint** | 3+ | 1 day |

---

## 8. Technical Recommendations

### 8.1 NestJS Architecture Patterns

**1. DTO Validation Layer:**
Create `apps/api/src/{module}/dto/` directories with class-validator classes that mirror the `@ncts/shared-types` interfaces:

```typescript
// apps/api/src/facilities/dto/create-facility.dto.ts
import { IsString, IsEnum, IsNumber, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FacilityType, Province } from '@ncts/shared-types';

export class CreateFacilityDto {
  @IsString() name: string;
  @IsEnum(FacilityType) facilityType: FacilityType;
  @IsEnum(Province) province: Province;
  @IsString() address: string;
  @IsNumber() @Min(-35) @Max(-22) latitude: number;
  @IsNumber() @Min(16) @Max(33) longitude: number;
  @IsOptional() @ValidateNested() @Type(() => GeoJsonPolygonDto) boundary?: GeoJsonPolygonDto;
}
```

This preserves the shared interfaces (for frontend) while adding runtime validation (for backend).

**2. Module Structure for New Modules:**
```
apps/api/src/inspections/
  inspections.module.ts
  inspections.controller.ts
  inspections.service.ts
  dto/
    create-inspection.dto.ts
    update-inspection.dto.ts
    schedule-inspection.dto.ts
  inspections.controller.spec.ts
  inspections.service.spec.ts
```

**3. ComplianceEngine as a NestJS Module with Strategy Pattern:**
```typescript
// apps/api/src/compliance/strategies/compliance-rule-strategy.interface.ts
interface ComplianceRuleStrategy {
  evaluate(context: ComplianceContext): Promise<ComplianceAlert | null>;
}

// Concrete strategies loaded from DB rule definitions:
class ExpiredPermitStrategy implements ComplianceRuleStrategy { ... }
class InventoryDiscrepancyStrategy implements ComplianceRuleStrategy { ... }
class ThcThresholdStrategy implements ComplianceRuleStrategy { ... }
```

**4. Event-Driven Architecture (Outbox Pattern):**
```typescript
// In any service that needs to emit events:
async createPlant(dto: CreatePlantDto) {
  return this.prisma.$transaction(async (tx) => {
    const plant = await tx.plant.create({ ... });
    // Outbox event in SAME transaction
    await tx.outboxEvent.create({
      data: {
        eventType: 'plant.created',
        aggregateId: plant.id,
        payload: plant,
        publishedAt: null, // null = not yet published
      }
    });
    return plant;
  });
}

// Background worker polls outbox, publishes to EventBridge, marks as published
```

### 8.2 PostgreSQL-Specific Recommendations

**1. Use DB Sequences for Atomic ID Generation:**
```sql
-- In migration:
CREATE SEQUENCE ncts_plant_tracking_seq START WITH 1;
CREATE SEQUENCE ncts_transfer_number_seq START WITH 1;
CREATE SEQUENCE ncts_sale_number_seq START WITH 1;
```

```typescript
// In service:
const [{ nextval }] = await this.prisma.$queryRaw<[{nextval: bigint}]>`
  SELECT nextval('ncts_plant_tracking_seq')
`;
const trackingId = `NCTS-ZA-${year}-${String(nextval).padStart(6, '0')}`;
```

**2. Table Partitioning for Audit Events:**
```sql
-- Partition audit_events by year for performance
CREATE TABLE audit_events (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_events_2026 PARTITION OF audit_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

**3. Materialized Views for Dashboard Performance:**
```sql
-- Instead of expensive COUNT(*) queries in regulatory dashboard
CREATE MATERIALIZED VIEW mv_dashboard_kpis AS
SELECT 
  COUNT(DISTINCT t.id) AS total_operators,
  COUNT(DISTINCT p.id) FILTER (WHERE p.state NOT IN ('harvested', 'destroyed')) AS active_plants,
  COUNT(DISTINCT f.id) FILTER (WHERE f.is_active) AS active_facilities,
  -- ... more KPIs
FROM tenants t
LEFT JOIN plants p ON p.tenant_id = t.id
LEFT JOIN facilities f ON f.tenant_id = t.id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;
```

**4. Fix RLS Wiring:**
```typescript
// TenantContextMiddleware should set DB session vars
// Option A: Use PrismaService.withTenantContext() in all services
// Option B: Use Prisma middleware to auto-set context
// Recommended: Option B for consistency

// prisma.service.ts — add $use middleware
constructor() {
  super();
  this.$use(async (params, next) => {
    const context = AsyncLocalStorage.getStore(); // from middleware
    if (context?.tenantId) {
      await this.$executeRawUnsafe('SET LOCAL app.current_tenant = $1', context.tenantId);
      await this.$executeRawUnsafe('SET LOCAL app.current_role = $1', context.role);
    }
    return next(params);
  });
}
```

### 8.3 Security Architecture Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| **RLS enforcement** | Wire RLS at DB level AND keep application-level `where: { tenantId }` | Defense in depth. RLS is the security boundary; app-level filter is UX optimization. |
| **PII encryption** | Encrypt SA ID numbers, tax numbers, driver ID numbers using `@ncts/crypto-lib` + KMS | CONFIDENTIAL classification under MISS. POPIA s.19 "appropriate safeguards." |
| **Token strategy** | Access token (15 min, in-memory) + refresh token (7 day, HTTP-only cookie + Redis) | Balance security with UX. Sliding window refresh. |
| **Rate limiting tiers** | Public: 100/min/IP, Auth: 1000/min/user, Login: 5/min/IP, Admin: 500/min/user | Protect against abuse while supporting operational volume. |
| **SQL injection prevention** | Move ALL `$executeRawUnsafe` to parameterized `$executeRaw` | Current tenant context uses string interpolation → injectable. |
| **Dependency scanning** | Add `npm audit --audit-level=high` to CI + weekly Snyk/Trivy report | Government systems require documented vulnerability management. |

### 8.4 Testing Strategy

| Layer | Tool | Coverage Target | What to Test |
|---|---|---|---|
| **Unit** | Vitest | 80% services | State machines (plant transitions), hash-chaining, compliance rules, excise calculations, ID generation |
| **Integration** | Testcontainers (PostgreSQL) | 70% services | Full CRUD with real DB, RLS enforcement, transactions, audit trail |
| **E2E API** | Supertest + NestJS testing module | 100% routes | Auth flow, RBAC, tenant isolation, full seed-to-sale chain |
| **Load** | k6 | All critical paths | QR verification (10K RPS), dashboard aggregation (100 RPS), concurrent CRUD (1K RPS) |
| **Security** | OWASP ZAP | All endpoints | Automated DAST scan in CI |

**Priority test targets:**
1. Plant state machine — all valid/invalid transitions
2. Audit hash chain — compute, verify, detect tampering
3. Tenant isolation — cross-tenant access denied
4. Transfer flow — create, accept, reject, discrepancy detection
5. Compliance rule evaluation — each rule type with edge cases

### 8.5 API Design Patterns for Government Systems

**1. Versioning:** Already using URI versioning (`/api/v1/`). Good — government integrations need stable APIs.

**2. Pagination:** Current implementation uses offset pagination. For mobile/sync, also implement **cursor-based pagination**:
```
GET /api/v1/plants?cursor=<lastId>&limit=20
```

**3. Filtering standard:** Adopt a consistent filter pattern:
```
GET /api/v1/plants?state=flowering&facility=<uuid>&planted_after=2026-01-01&sort=created_at:desc
```

**4. Bulk operations:** For government data imports:
```
POST /api/v1/bulk/plants — batch create up to 1000 plants
POST /api/v1/bulk/lab-results — batch import lab results from LIMS
```

**5. Webhook delivery for inter-agency integration:**
```
POST /api/v1/webhooks — register webhook URL
GET  /api/v1/webhooks — list registered webhooks
DELETE /api/v1/webhooks/:id — unregister

// Outgoing events signed with HMAC:
POST https://sahpra-api.gov.za/ncts-events
Headers: X-NCTS-Signature: sha256=<hmac>
Body: { event: "lab_result.failed", data: { ... } }
```

**6. Error response format:** Already implementing structured errors with correlation IDs. Ensure all errors follow:
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Plant NCTS-ZA-2026-000123 cannot transition from HARVESTED to FLOWERING",
  "details": { "currentState": "harvested", "requestedState": "flowering", "validTransitions": [] },
  "requestId": "req-abc-123",
  "timestamp": "2026-02-21T10:30:00Z"
}
```

### 8.6 Missing Prisma Models Summary

The following new models should be added to `schema.prisma`:

| Model | Purpose | Fields (key) | Priority |
|---|---|---|---|
| **Inspection** | Regulatory inspection management | id, tenantId, facilityId, inspectorId, scheduledDate, actualDate, status, findings, correctiveActions, photos, resolutionStatus | Tier 1 |
| **ComplianceRule** | Configurable compliance engine | id, name, category, severity, evaluationType, ruleDefinition (Json), thresholds (Json), isActive | Tier 1 |
| **ComplianceAlert** | Generated compliance alerts | id, ruleId, tenantId, facilityId, severity, description, status, assignedTo, escalationLevel, resolvedAt, resolutionNotes | Tier 1 |
| **InventorySnapshot** | Periodic inventory reconciliation | id, tenantId, facilityId, snapshotDate, items (Json), totalExpected, totalDeclared, variancePercent, status | Tier 1 |
| **OutboxEvent** | Transactional outbox for events | id, eventType, aggregateId, aggregateType, payload (Json), publishedAt, createdAt | Tier 2 |
| **DestructionEvent** | Tracked cannabis destruction | id, tenantId, entityType, entityIds, quantityKg, method, witnesses (Json), reason, photos, regulatoryNotified | Tier 2 |
| **SuspiciousReport** | Product verification reports | id, trackingId, reason, reporterIp, reporterContact, investigationStatus, investigatorId | Tier 2 |
| **ExciseRate** | Configurable excise rates | id, productCategory, ratePerGram, effectiveDate, expiryDate | Tier 3 |
| **ExciseLedger** | Per-transaction duty calc | id, tenantId, saleId, batchId, quantity, rate, dutyAmountZar, period | Tier 3 |
| **ImportExportRecord** | International trade tracking | id, tenantId, type, countryCode, batchId, quantity, permitId, status | Tier 3 |
| **PlantingIntention** | DALRRD pre-season reports | id, tenantId, facilityId, season, cultivars (Json), areaHectares, estimatedYield | Tier 3 |
| **PatientAccess** | Pseudonymized patient dispensing | id, pseudonymizedPatientId, doctorHPCSA, productCategory, quantity, dispensingDate | Tier 3 |
| **Consent** | POPIA consent records | id, userId, consentType, granted, policyVersion, timestamp, withdrawnAt | Tier 3 |
| **DataSharingAgreement** | Inter-agency access control | id, agencyName, dataCategories (Json), effectiveDate, expiryDate, signedBy | Tier 4 |

---

## Appendix A: Backend Endpoints Inventory (Current + Required)

### Currently Implemented (36 routes)

```
# Auth (0 routes — MISSING)

# Health (1)
GET  /api/v1/health

# Facilities (6)
POST /api/v1/facilities
GET  /api/v1/facilities
GET  /api/v1/facilities/:id
PATCH /api/v1/facilities/:id
POST /api/v1/facilities/:id/zones
GET  /api/v1/facilities/:id/zones

# Plants (4)
POST /api/v1/plants
POST /api/v1/plants/batch-register
GET  /api/v1/plants
PATCH /api/v1/plants/:id/state

# Batches (2)
GET  /api/v1/batches
GET  /api/v1/batches/:id

# Harvests (3)
POST /api/v1/harvests
GET  /api/v1/harvests/:id
PATCH /api/v1/harvests/:id

# Lab Results (4)
POST /api/v1/lab-results
GET  /api/v1/lab-results
GET  /api/v1/lab-results/:id
GET  /api/v1/lab-results/batch/:batchId

# Transfers (5)
POST /api/v1/transfers
GET  /api/v1/transfers
GET  /api/v1/transfers/:id
PATCH /api/v1/transfers/:id/accept
PATCH /api/v1/transfers/:id/reject

# Sales (3)
POST /api/v1/sales
GET  /api/v1/sales
GET  /api/v1/sales/:id

# Regulatory (7)
GET  /api/v1/regulatory/dashboard
GET  /api/v1/regulatory/dashboard/trends
GET  /api/v1/regulatory/facilities/geo
GET  /api/v1/regulatory/operators
GET  /api/v1/regulatory/permits
PATCH /api/v1/regulatory/permits/:id/status
GET  /api/v1/regulatory/compliance/alerts

# Verification (2)
GET  /api/v1/verify/:trackingId
POST /api/v1/verify/report
```

### New Routes Required (estimated 40+ new endpoints)

```
# Auth (Tier 1 — 4 routes)
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

# Harvests (Tier 2 — 1 route)
GET  /api/v1/harvests

# Batches (Tier 2 — 2 routes)
POST /api/v1/batches                    # manual batch creation
PATCH /api/v1/batches/:id               # weight updates

# Inspections (Tier 1 — 5 routes)
POST /api/v1/regulatory/inspections
GET  /api/v1/regulatory/inspections
GET  /api/v1/regulatory/inspections/:id
PATCH /api/v1/regulatory/inspections/:id
GET  /api/v1/regulatory/inspections/schedule

# Compliance Engine (Tier 1 — 5 routes)
POST /api/v1/regulatory/compliance/rules
GET  /api/v1/regulatory/compliance/rules
PATCH /api/v1/regulatory/compliance/rules/:id
GET  /api/v1/regulatory/compliance/operator/:id
GET  /api/v1/regulatory/compliance/score/:tenantId

# Inventory (Tier 1 — 3 routes)
GET  /api/v1/inventory/facility/:facilityId
GET  /api/v1/inventory/reconciliation/:facilityId
POST /api/v1/inventory/snapshot

# QR Code (Tier 2 — 2 routes)
GET  /api/v1/qr/:batchId
GET  /api/v1/qr/:batchId/label

# Reporting (Tier 2 — 4 routes)
GET  /api/v1/reports/production-monthly
GET  /api/v1/reports/compliance-rates
GET  /api/v1/reports/diversion-assessment
GET  /api/v1/reports/export-package/:tenantId

# Destruction (Tier 2 — 3 routes)
POST /api/v1/destruction
GET  /api/v1/destruction
GET  /api/v1/destruction/:id

# Privacy / POPIA (Tier 3 — 5 routes)
GET  /api/v1/privacy/export/:userId
POST /api/v1/privacy/deletion-request
GET  /api/v1/privacy/deletion-request/:id
POST /api/v1/privacy/consent
GET  /api/v1/privacy/consent/:userId

# Regulatory Drill-down (Tier 2 — 2 routes)
GET  /api/v1/regulatory/dashboard/province/:code
GET  /api/v1/regulatory/operators/:id/details

# Sales Aggregation (Tier 3 — 2 routes)
GET  /api/v1/sales/aggregation
GET  /api/v1/sales/revenue

# Public Open Data (Tier 4 — 1 route)
GET  /api/v1/public/statistics

# Sync (Tier 4 — 2 routes, for mobile)
POST /api/v1/sync/push
GET  /api/v1/sync/pull
```

**Total: ~36 existing + ~41 new = ~77 endpoints for full Plan.md coverage.**

---

*End of Backend Research Report*
