# NCTS Backend & Features Master Plan

> **National Cannabis Tracking System — Republic of South Africa**
> **Document Version:** 1.1
> **Status:** APPROVED — All 6 review criteria PASS
> **Last Updated:** 2026-02-21
> **Author:** Backend Planning Agent (Phase 2)
> **Inputs:** Codebase Analysis Report (828 lines), Backend Research Report (1,319 lines), Plan.md (858 lines)

---

## Table of Contents

- [Section 0: Database Completion & Optimization](#section-0-database-completion--optimization)
- [Section 1: Authentication & Authorization Completion](#section-1-authentication--authorization-completion)
- [Section 2: Core API Completion & DTO Validation](#section-2-core-api-completion--dto-validation)
- [Section 3: Compliance Engine](#section-3-compliance-engine)
- [Section 4: Audit Trail Completion](#section-4-audit-trail-completion)
- [Section 5: Event System & Notifications](#section-5-event-system--notifications)
- [Section 6: File Management & Document Generation](#section-6-file-management--document-generation)
- [Section 7: Government Integration APIs](#section-7-government-integration-apis)
  - [7.6 QR Code Generation Module](#76-qr-code-generation-module)
  - [7.7 Mobile Sync API](#77-mobile-sync-api)
- [Section 8: Advanced Features](#section-8-advanced-features)
- [Section 9: Security Hardening](#section-9-security-hardening)
- [Section 10: Testing Strategy](#section-10-testing-strategy)
- [Section 11: DevOps & Deployment](#section-11-devops--deployment)
- [Implementation Priority](#implementation-priority)

---

## Current State Summary

| Component | Completion | Key Gaps |
|---|---|---|
| Backend API (36 routes) | 85% | No AuthController, no DTO validation, no tests |
| Database (14 models) | 75% | No migrations run, missing ~14 new models |
| Shared Packages | 80% | crypto-lib/qr-lib not integrated |
| Infrastructure | 45% | Terraform empty, no monitoring |
| **Overall Backend** | **~65%** | Auth + RLS + DTOs + Migrations = critical blockers |

**Existing Endpoints:** 36 routes across 10 modules (health, facilities, plants, batches, harvests, lab-results, transfers, sales, regulatory, verification)

**Target:** ~77 total endpoints (36 existing + ~41 new)

---

# Section 0: Database Completion & Optimization

All database changes go through Prisma schema modifications + raw SQL for features Prisma doesn't support (RLS, triggers, sequences, partitioning). Changes in this section must be applied **before** any API work begins.

## 0.1 Generate & Run Initial Prisma Migration

**Priority:** P0 (Critical)
**Dependencies:** None — this is the starting point
**Estimated Complexity:** Low

### Action

```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma migrate dev --name apply-rls
```

### Steps

1. Generate migration from existing `schema.prisma` (14 models, 171 fields, 17 indexes)
2. Run migration to create all tables in PostgreSQL
3. Execute `infrastructure/docker/init-db.sql` for extensions and roles
4. Execute `infrastructure/docker/post-migration-rls.sql` for RLS policies, triggers, and constraints
5. Run `npx prisma db seed` to populate development data (555-line seed script)

### Verification

```sql
-- Verify table count
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expect: 14 tables

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
-- Expect: 13 tables with RLS

-- Verify PostGIS
SELECT PostGIS_Version();
-- Expect: "3.4..."

-- Verify extensions
SELECT extname FROM pg_extension;
-- Expect: uuid-ossp, postgis, pgcrypto
```

### Acceptance Criteria
- [ ] All 14 tables created with correct schema
- [ ] All 17 indexes present
- [ ] RLS policies active on all tenant-scoped tables
- [ ] Seed data populated (3 tenants, 6 users, 100 plants, etc.)
- [ ] PostGIS boundary columns and triggers active
- [ ] SA coordinate constraint `chk_facility_within_sa` active

---

## 0.2 New Prisma Models

**Priority:** P0-P1 (depends on model)
**Dependencies:** 0.1 (initial migration)
**Estimated Complexity:** Medium

Add the following 14 new models to `packages/database/prisma/schema.prisma`:

### 0.2.1 Inspection Model (P0 — Critical)

```prisma
model Inspection {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  facilityId            String    @map("facility_id") @db.Uuid
  inspectorId           String    @map("inspector_id") @db.Uuid
  type                  String    // 'routine' | 'complaint' | 'follow_up' | 'random'
  priority              String    @default("medium") // 'low' | 'medium' | 'high' | 'critical'
  status                String    @default("scheduled") // 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  scheduledDate         DateTime  @map("scheduled_date")
  actualStartDate       DateTime? @map("actual_start_date")
  completedDate         DateTime? @map("completed_date")
  estimatedDurationHrs  Float?    @map("estimated_duration_hrs")
  checklist             Json?     // [{item: string, status: 'pass'|'fail'|'na', notes: string, severity: string}]
  findings              String?   @db.Text
  overallOutcome        String?   @map("overall_outcome") // 'pass' | 'conditional_pass' | 'fail'
  remediationRequired   Boolean   @default(false) @map("remediation_required")
  remediationDeadline   DateTime? @map("remediation_deadline")
  remediationNotes      String?   @map("remediation_notes") @db.Text
  followUpInspectionId  String?   @map("follow_up_inspection_id") @db.Uuid
  photos                String[]  // S3 URLs
  reportUrl             String?   @map("report_url") // Generated PDF URL
  reason                String?   @db.Text
  additionalInspectors  String[]  @map("additional_inspectors") // User IDs
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  facility  Facility @relation(fields: [facilityId], references: [id])

  @@index([tenantId])
  @@index([facilityId])
  @@index([inspectorId])
  @@index([status])
  @@index([scheduledDate])
  @@map("inspections")
}
```

### 0.2.2 ComplianceRule Model (P0 — Critical)

```prisma
model ComplianceRule {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String
  description     String   @db.Text
  category        String   // 'permit' | 'inventory' | 'lab' | 'production' | 'transfer' | 'verification'
  severity        String   // 'info' | 'warning' | 'critical'
  evaluationType  String   @map("evaluation_type") // 'real_time' | 'batch' | 'scheduled'
  ruleDefinition  Json     @map("rule_definition")
  thresholds      Json?
  escalationPolicy Json?   @map("escalation_policy")
  isActive        Boolean  @default(true) @map("is_active")
  createdBy       String?  @map("created_by") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  alerts ComplianceAlert[]

  @@index([category])
  @@index([isActive])
  @@map("compliance_rules")
}
```

### 0.2.3 ComplianceAlert Model (P0 — Critical)

```prisma
model ComplianceAlert {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ruleId            String    @map("rule_id") @db.Uuid
  tenantId          String    @map("tenant_id") @db.Uuid
  facilityId        String?   @map("facility_id") @db.Uuid
  severity          String    // 'info' | 'warning' | 'critical'
  alertType         String    @map("alert_type")
  description       String    @db.Text
  entityType        String?   @map("entity_type") // 'plant' | 'batch' | 'transfer' | 'permit' | 'facility'
  entityId          String?   @map("entity_id") @db.Uuid
  status            String    @default("open") // 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'escalated'
  assignedTo        String?   @map("assigned_to") @db.Uuid
  escalationLevel   Int       @default(0) @map("escalation_level")
  resolvedAt        DateTime? @map("resolved_at")
  resolvedBy        String?   @map("resolved_by") @db.Uuid
  resolutionNotes   String?   @map("resolution_notes") @db.Text
  autoActions       Json?     @map("auto_actions") // e.g., {suspendPermit: true}
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  rule   ComplianceRule @relation(fields: [ruleId], references: [id])
  tenant Tenant         @relation(fields: [tenantId], references: [id])

  @@index([ruleId])
  @@index([tenantId])
  @@index([status])
  @@index([severity])
  @@index([createdAt])
  @@map("compliance_alerts")
}
```

### 0.2.4 InventorySnapshot Model (P1)

```prisma
model InventorySnapshot {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId            String    @map("tenant_id") @db.Uuid
  facilityId          String    @map("facility_id") @db.Uuid
  snapshotDate        DateTime  @map("snapshot_date")
  snapshotType        String    @map("snapshot_type") // 'automatic' | 'manual' | 'audit'
  items               Json      // [{batchId, expectedGrams, declaredGrams, variance}]
  totalExpectedGrams  Float     @map("total_expected_grams")
  totalDeclaredGrams  Float     @map("total_declared_grams")
  variancePercent     Float     @map("variance_percent")
  status              String    @default("clean") // 'clean' | 'flagged' | 'under_investigation'
  investigatorId      String?   @map("investigator_id") @db.Uuid
  notes               String?   @db.Text
  createdAt           DateTime  @default(now()) @map("created_at")

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  facility Facility @relation(fields: [facilityId], references: [id])

  @@index([tenantId])
  @@index([facilityId])
  @@index([snapshotDate])
  @@map("inventory_snapshots")
}
```

### 0.2.5 OutboxEvent Model (P1)

```prisma
model OutboxEvent {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventType      String    @map("event_type") // e.g., 'plant.created', 'transfer.accepted'
  aggregateType  String    @map("aggregate_type") // 'plant' | 'transfer' | 'batch' | etc.
  aggregateId    String    @map("aggregate_id") @db.Uuid
  payload        Json
  publishedAt    DateTime? @map("published_at") // null = not yet published
  createdAt      DateTime  @default(now()) @map("created_at")

  @@index([publishedAt]) // NULL index for polling unpublished events
  @@index([eventType])
  @@index([createdAt])
  @@map("outbox_events")
}
```

### 0.2.6 DestructionEvent Model (P1)

```prisma
model DestructionEvent {
  id                       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId                 String   @map("tenant_id") @db.Uuid
  facilityId               String   @map("facility_id") @db.Uuid
  entityType               String   @map("entity_type") // 'plant' | 'batch'
  entityIds                String[] @map("entity_ids") // UUIDs of plants or batches destroyed
  quantityKg               Float    @map("quantity_kg")
  destructionMethod        String   @map("destruction_method") // 'incineration' | 'grinding' | 'composting'
  destructionDate          DateTime @map("destruction_date")
  witnessNames             String[] @map("witness_names")
  witnessOrganizations     String[] @map("witness_organizations") // e.g., 'SAPS', 'SAHPRA'
  witnessSignatures        String[] @map("witness_signatures") // S3 URLs for signature images
  reason                   String   // 'failed_lab' | 'expired' | 'damaged' | 'regulatory_order' | 'excess'
  photos                   String[] // S3 URLs
  videoUrl                 String?  @map("video_url")
  regulatoryNotified       Boolean  @default(false) @map("regulatory_notified")
  regulatoryNotifiedAt     DateTime? @map("regulatory_notified_at")
  approvedBy               String   @map("approved_by") @db.Uuid
  createdAt                DateTime @default(now()) @map("created_at")

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  facility Facility @relation(fields: [facilityId], references: [id])

  @@index([tenantId])
  @@index([facilityId])
  @@index([destructionDate])
  @@map("destruction_events")
}
```

### 0.2.7 SuspiciousReport Model (P2)

```prisma
model SuspiciousReport {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  trackingId          String    @map("tracking_id")
  reason              String    @db.Text
  reporterIp          String?   @map("reporter_ip")
  reporterContact     String?   @map("reporter_contact")
  reporterLocation    Json?     @map("reporter_location") // {lat, lng}
  investigationStatus String    @default("new") @map("investigation_status") // 'new' | 'reviewing' | 'confirmed' | 'dismissed'
  investigatorId      String?   @map("investigator_id") @db.Uuid
  investigatorNotes   String?   @map("investigator_notes") @db.Text
  resolvedAt          DateTime? @map("resolved_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@index([trackingId])
  @@index([investigationStatus])
  @@index([createdAt])
  @@map("suspicious_reports")
}
```

### 0.2.8 ExciseRate Model (P2)

```prisma
model ExciseRate {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productCategory String    @map("product_category") // 'dried_flower' | 'extract' | 'edible' | 'hemp_fiber'
  ratePerUnit     Float     @map("rate_per_unit") // ZAR per gram/ml/unit
  unit            String    // 'gram' | 'ml' | 'unit'
  effectiveDate   DateTime  @map("effective_date")
  expiryDate      DateTime? @map("expiry_date")
  isActive        Boolean   @default(true) @map("is_active")
  createdBy       String?   @map("created_by") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")

  ledgerEntries ExciseLedger[]

  @@index([productCategory, isActive])
  @@map("excise_rates")
}
```

### 0.2.9 ExciseLedger Model (P2)

```prisma
model ExciseLedger {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid
  saleId          String   @map("sale_id") @db.Uuid
  batchId         String   @map("batch_id") @db.Uuid
  rateId          String   @map("rate_id") @db.Uuid
  quantity        Float
  unit            String
  rateApplied     Float    @map("rate_applied")
  dutyAmountZar   Float    @map("duty_amount_zar")
  reportingPeriod String   @map("reporting_period") // 'YYYY-MM'
  createdAt       DateTime @default(now()) @map("created_at")

  tenant Tenant     @relation(fields: [tenantId], references: [id])
  rate   ExciseRate @relation(fields: [rateId], references: [id])

  @@index([tenantId, reportingPeriod])
  @@index([reportingPeriod])
  @@map("excise_ledger")
}
```

### 0.2.10 ImportExportRecord Model (P2)

```prisma
model ImportExportRecord {
  id                       String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId                 String    @map("tenant_id") @db.Uuid
  type                     String    // 'import' | 'export'
  countryCode              String    @map("country_code") // ISO 3166-1 alpha-2
  partnerCompany           String    @map("partner_company")
  batchId                  String    @map("batch_id") @db.Uuid
  quantityKg               Float     @map("quantity_kg")
  productCategory          String    @map("product_category")
  permitId                 String    @map("permit_id") @db.Uuid
  customsDeclarationNumber String?   @map("customs_declaration_number")
  shippingDate             DateTime? @map("shipping_date")
  arrivalDate              DateTime? @map("arrival_date")
  status                   String    @default("pending") // 'pending' | 'in_transit' | 'completed' | 'cancelled'
  documents                Json?     // [{type: string, url: string}]
  createdAt                DateTime  @default(now()) @map("created_at")
  updatedAt                DateTime  @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([type])
  @@index([status])
  @@map("import_export_records")
}
```

### 0.2.11 PlantingIntention Model (P2)

```prisma
model PlantingIntention {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid
  facilityId      String   @map("facility_id") @db.Uuid
  season          String   // '2026/2027'
  cultivars       Json     // [{strainId, areaHectares, estimatedYieldKg}]
  totalAreaHa     Float    @map("total_area_ha")
  totalEstYieldKg Float    @map("total_est_yield_kg")
  plantingStart   DateTime @map("planting_start")
  plantingEnd     DateTime @map("planting_end")
  status          String   @default("draft") // 'draft' | 'submitted' | 'acknowledged'
  submittedAt     DateTime? @map("submitted_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  facility Facility @relation(fields: [facilityId], references: [id])

  @@index([tenantId, season])
  @@map("planting_intentions")
}
```

### 0.2.12 Consent Model (P2)

```prisma
model Consent {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  consentType   String    @map("consent_type") // 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing'
  granted       Boolean
  policyVersion String    @map("policy_version")
  ipAddress     String?   @map("ip_address")
  userAgent     String?   @map("user_agent")
  withdrawnAt   DateTime? @map("withdrawn_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([userId])
  @@index([consentType])
  @@map("consents")
}
```

### 0.2.13 Notification Model (P1)

```prisma
model Notification {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  type        String    // 'info' | 'warning' | 'critical' | 'action_required'
  channel     String    @default("in_app") // 'in_app' | 'email' | 'sms'
  title       String
  body        String    @db.Text
  entityType  String?   @map("entity_type")
  entityId    String?   @map("entity_id") @db.Uuid
  actionUrl   String?   @map("action_url")
  readAt      DateTime? @map("read_at")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

### 0.2.14 PatientAccess Model (P3)

```prisma
model PatientAccess {
  id                      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pseudonymizedPatientId  String   @map("pseudonymized_patient_id") // SHA-256 hash of SA ID + salt
  prescribingDoctorHpcsa  String   @map("prescribing_doctor_hpcsa")
  diagnosisCategory       String   @map("diagnosis_category") // ICD-10 category only
  productCategory         String   @map("product_category")
  quantityDispensedGrams  Float    @map("quantity_dispensed_grams")
  dispensingDate          DateTime @map("dispensing_date")
  dispensingFacilityId    String   @map("dispensing_facility_id") @db.Uuid
  batchId                 String   @map("batch_id") @db.Uuid
  createdAt               DateTime @default(now()) @map("created_at")

  @@index([pseudonymizedPatientId])
  @@index([dispensingDate])
  @@index([dispensingFacilityId])
  @@map("patient_access")
}
```

### Prisma Schema Update — Relation Additions

Add the following relation fields to existing models:

```prisma
// In Tenant model, add:
inspections         Inspection[]
complianceAlerts    ComplianceAlert[]
inventorySnapshots  InventorySnapshot[]
destructionEvents   DestructionEvent[]
exciseLedger        ExciseLedger[]
importExportRecords ImportExportRecord[]
plantingIntentions  PlantingIntention[]

// In Facility model, add:
inspections         Inspection[]
inventorySnapshots  InventorySnapshot[]
destructionEvents   DestructionEvent[]
plantingIntentions  PlantingIntention[]

// In LabResult model, add:
labAccreditationNumber String?  @map("lab_accreditation_number") // SANAS ISO 17025 accreditation number (e.g., T0538)

// In Batch model, add:
productCategory     String?   @default("dried_flower") @map("product_category")
// Valid: 'dried_flower', 'oil', 'extract', 'edible', 'topical', 'seeds', 'hemp_fiber'
```

---

## 0.3 Database Sequences for Atomic ID Generation

**Priority:** P0 (Critical)
**Dependencies:** 0.1
**Issue:** Current `generateTrackingId()` uses `findFirst(orderBy: desc) + 1` which is not atomic. Under concurrent requests, duplicate IDs can be generated.

### Migration SQL

```sql
-- Create atomic sequences for unique number generation
CREATE SEQUENCE ncts_plant_tracking_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE ncts_transfer_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE ncts_sale_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE ncts_inspection_number_seq START WITH 1 INCREMENT BY 1;

-- Grant usage to app_user role
GRANT USAGE, SELECT ON SEQUENCE ncts_plant_tracking_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE ncts_transfer_number_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE ncts_sale_number_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE ncts_inspection_number_seq TO app_user;
```

### Service Implementation Pattern

```typescript
// plants.service.ts — replace current findFirst+increment pattern
async generateTrackingId(): Promise<string> {
  const year = new Date().getFullYear();
  const [{ nextval }] = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval('ncts_plant_tracking_seq')
  `;
  return `NCTS-ZA-${year}-${String(nextval).padStart(6, '0')}`;
}

// Similarly for transfers and sales:
// TRF-{YYYY}-{6-digit} → ncts_transfer_number_seq
// SALE-{YYYY}-{6-digit} → ncts_sale_number_seq
// INS-{YYYY}-{6-digit} → ncts_inspection_number_seq
```

### Acceptance Criteria
- [ ] All 4 sequences created in migration
- [ ] `plants.service.ts` uses `nextval('ncts_plant_tracking_seq')` 
- [ ] `transfers.service.ts` uses `nextval('ncts_transfer_number_seq')`
- [ ] `sales.service.ts` uses `nextval('ncts_sale_number_seq')`
- [ ] No duplicate IDs under concurrent load (verified by integration test)

---

## 0.4 Fix RLS Wiring

**Priority:** P0 (Critical — Security)
**Dependencies:** 0.1
**Issue:** `PrismaService.withTenantContext()` exists but is never called. All services use `where: { tenantId }` application-level filters instead of PostgreSQL RLS. If a developer forgets the filter, data leaks across tenants.

### Current State

```typescript
// prisma.service.ts — withTenantContext exists
async withTenantContext<T>(tenantId: string, role: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return this.$transaction(async (tx) => {
    await (tx as any).$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
    await (tx as any).$executeRawUnsafe(`SET LOCAL app.current_role = '${role}'`);
    return fn(tx as PrismaClient);
  });
}
```

### Fix 1: SQL Injection Prevention

```typescript
// BEFORE (vulnerable — string interpolation):
await (tx as any).$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);

// AFTER (parameterized):
await (tx as any).$executeRawUnsafe(`SET LOCAL app.current_tenant = $1`, tenantId);
await (tx as any).$executeRawUnsafe(`SET LOCAL app.current_role = $1`, role);
```

### Fix 2: Automatic RLS Context via AsyncLocalStorage

```typescript
// apps/api/src/common/middleware/tenant-context.middleware.ts
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

export const tenantStore = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const user = req.user; // populated by JWT strategy
    if (user?.tenantId) {
      tenantStore.run(
        { tenantId: user.tenantId, userId: user.sub, role: user.role },
        () => next()
      );
    } else {
      next();
    }
  }
}
```

### Fix 3: Prisma Extension for Automatic SET LOCAL

```typescript
// packages/database/src/prisma.service.ts
import { tenantStore } from '../common/middleware/tenant-context.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    
    // Prisma middleware: auto-set RLS context on every query
    this.$use(async (params, next) => {
      const context = tenantStore.getStore();
      if (context?.tenantId && params.runInTransaction) {
        // For transactional queries, SET LOCAL applies for the transaction duration
        // For non-transactional, SET LOCAL applies for the statement
      }
      return next(params);
    });
  }
}
```

### Strategy Decision

**Recommended approach: Defense in Depth**
1. **Keep** `where: { tenantId }` in all service queries (application-level filter = first line of defense)
2. **Also wire** RLS via `SET LOCAL` in all transactional operations (database-level filter = security boundary)
3. **Write integration tests** that verify cross-tenant access is denied at the DB level even without application-level filter

### Acceptance Criteria
- [ ] SQL injection in `withTenantContext()` fixed (parameterized queries)
- [ ] `AsyncLocalStorage` stores tenant context from JWT
- [ ] All `$transaction()` calls set RLS context automatically
- [ ] Integration test: query without `where: { tenantId }` still returns only own tenant's data (RLS enforces)
- [ ] Integration test: direct SQL query without `SET LOCAL` returns nothing for tenant-scoped tables

---

## 0.5 Table Partitioning for Audit Events

**Priority:** P2
**Dependencies:** 0.1
**Estimated Complexity:** Medium

### Migration SQL

```sql
-- Partition audit_events by year for performance at scale
-- Only do this BEFORE significant data accumulates

-- Recreate as partitioned table
ALTER TABLE audit_events RENAME TO audit_events_old;

CREATE TABLE audit_events (
  LIKE audit_events_old INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE audit_events_2026 PARTITION OF audit_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_events_2027 PARTITION OF audit_events
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Migrate existing data
INSERT INTO audit_events SELECT * FROM audit_events_old;
DROP TABLE audit_events_old;

-- Auto-create future partitions (via pg_partman or scheduled job)
```

### Acceptance Criteria
- [ ] Audit events partitioned by year
- [ ] Query performance unchanged for current-year queries
- [ ] Old partitions can be archived to cold storage

---

## 0.6 Materialized Views for Dashboard Performance

**Priority:** P2
**Dependencies:** 0.1
**Estimated Complexity:** Low

### Migration SQL

```sql
-- Materialized view for regulatory dashboard KPIs
CREATE MATERIALIZED VIEW mv_dashboard_kpis AS
SELECT
  COUNT(DISTINCT t.id) AS total_operators,
  COUNT(DISTINCT p.id) FILTER (WHERE p.state NOT IN ('harvested', 'destroyed')) AS active_plants,
  COUNT(DISTINCT f.id) FILTER (WHERE f.is_active) AS active_facilities,
  COUNT(DISTINCT per.id) FILTER (WHERE per.status = 'active') AS active_permits,
  COUNT(DISTINCT per.id) FILTER (WHERE per.status = 'active' AND per.expiry_date < NOW() + INTERVAL '30 days') AS expiring_permits,
  COALESCE(SUM(s.total_price_zar), 0) AS total_revenue_zar,
  COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'in_transit') AS active_transfers
FROM tenants t
LEFT JOIN plants p ON p.tenant_id = t.id
LEFT JOIN facilities f ON f.tenant_id = t.id
LEFT JOIN permits per ON per.tenant_id = t.id
LEFT JOIN sales s ON s.tenant_id = t.id
LEFT JOIN transfers tr ON tr.tenant_id = t.id;

-- Refresh every 5 minutes via pg_cron or NestJS scheduler
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;

-- Index for concurrent refresh
-- UNIQUE index required for CONCURRENTLY refresh. Use a synthetic row_id since this is a single-row view.
CREATE UNIQUE INDEX ON mv_dashboard_kpis (total_operators, active_plants);
```

### NestJS Refresh Job

```typescript
@Cron('*/5 * * * *') // Every 5 minutes
async refreshDashboardKpis() {
  await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis');
}
```

---

## 0.7 Additional Schema Enhancements

### Add Missing Permit Fields (SAHPRA Section 22A)

```prisma
// Add to existing Permit model:
permitType             String    @default("sahpra_22a") @map("permit_type")
// Valid values: 'sahpra_22a', 'sahpra_22c', 'dalrrd_hemp', 'dtic_hemp_industrial', 'research', 'import_export'
// — 'dtic_hemp_industrial' added for Department of Trade, Industry and Competition hemp permits
authorizedSubstances   Json?     @map("authorized_substances")
authorizedActivities   String[]  @map("authorized_activities")
maxAnnualQuantityKg    Float?    @map("max_annual_quantity_kg")
responsiblePersonName  String?   @map("responsible_person_name")
responsiblePersonReg   String?   @map("responsible_person_reg") // HPCSA/SAPC registration
renewalDate            DateTime? @map("renewal_date")
applicationReference   String?   @map("application_reference") // SAHPRA reference
previousPermitId       String?   @map("previous_permit_id") @db.Uuid // Renewal chain
```

### Add Facility Municipal License Field

```prisma
// Add to existing Facility model:
municipalLicenseNumber  String?  @map("municipal_license_number") // Municipal business license (required for retail/distribution)
municipalLicenseExpiry  DateTime? @map("municipal_license_expiry")
```

### Add GET /harvests List Support

Add `@@index([tenantId, createdAt])` to Harvest model if not present.

### Acceptance Criteria
- [ ] Permit model extended with SAHPRA-specific fields
- [ ] Migration generated and applied

---

# Section 1: Authentication & Authorization Completion

This section addresses the most critical blocker: there is **no AuthController** — the login form in `apps/portal/` has no backend endpoint to authenticate against.

## 1.1 AuthController — Login Endpoint

**Priority:** P0 (Critical — blocks all demos)
**Dependencies:** Section 0.1 (migrations must run first)
**Module:** `apps/api/src/auth/`
**Estimated Complexity:** Medium

### API Contract

```
POST /api/v1/auth/login
Headers: Content-Type: application/json
Body:
{
  "email": "operator@greenfields.co.za",
  "password": "SecurePassword123!"
}

Response 200:
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "operator@greenfields.co.za",
    "firstName": "John",
    "lastName": "Nkosi",
    "role": "operator_admin",
    "tenantId": "uuid",
    "tenantName": "GreenFields Cannabis"
  }
}

Response 401:
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "requestId": "req-xxx"
}

Response 429:
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many login attempts. Try again in 15 minutes.",
  "retryAfter": 900
}
```

### DTO

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'operator@greenfields.co.za' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### Business Logic

1. Find user by email (case-insensitive)
2. Compare password hash (bcrypt)
3. Check account is active (not locked, not disabled)
4. Check failed login attempts (< 5 in 15 minutes)
5. Generate access token (15 min expiry) and refresh token (7 day expiry)
6. Set refresh token as HTTP-only cookie (in production; localStorage in dev)
7. Increment login count, update `lastLoginAt`
8. Create audit event: `user.login`
9. Return tokens + user profile

### Database Changes

```prisma
// Add to User model:
passwordHash       String    @map("password_hash")
passwordHistory    String[]  @default([]) @map("password_history") // BCrypt hashes of last 3 passwords — prevents reuse
isActive           Boolean   @default(true) @map("is_active")
isLocked           Boolean   @default(false) @map("is_locked")
failedLoginAttempts Int      @default(0) @map("failed_login_attempts")
lockedUntil        DateTime? @map("locked_until")
lastLoginAt        DateTime? @map("last_login_at")
lastLoginIp        String?   @map("last_login_ip")
forcePasswordChange Boolean  @default(false) @map("force_password_change")
mfaEnabled         Boolean   @default(false) @map("mfa_enabled")
mfaSecret          String?   @map("mfa_secret") // Encrypted TOTP secret
```

### Controller

```typescript
// apps/api/src/auth/auth.controller.ts
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest): Promise<LoginResponse> {
    return this.authService.login(dto.email, dto.password, req.ip);
  }
}
```

### Acceptance Criteria
- [ ] `POST /auth/login` returns JWT tokens and user profile
- [ ] Invalid credentials return 401 with no user enumeration
- [ ] Account locks after 5 failed attempts in 15 minutes
- [ ] Locked accounts auto-unlock after 15 minutes
- [ ] Audit event logged for successful and failed logins
- [ ] Swagger documentation shows request/response schemas

---

## 1.2 AuthController — Register Endpoint

**Priority:** P1 (Admin-only user creation)
**Dependencies:** 1.1
**Module:** `apps/api/src/auth/`

### API Contract

```
POST /api/v1/auth/register
Headers: Authorization: Bearer {admin-jwt}, Content-Type: application/json
Body:
{
  "email": "newuser@greenfields.co.za",
  "firstName": "Jane",
  "lastName": "Botha",
  "role": "operator_staff",
  "tenantId": "uuid"
}

Response 201:
{
  "id": "uuid",
  "email": "newuser@greenfields.co.za",
  "temporaryPassword": "TempPass!2026abc",
  "forcePasswordChange": true
}
```

### Business Logic

1. **Only** `operator_admin` and `regulator` roles can create users
2. `operator_admin` can only create users in their own tenant
3. `regulator` can create users in any tenant (for creating new operator admins)
4. Generate temporary password (16 chars, mixed case + digit + special)
5. Hash password with bcrypt (12 rounds)
6. Set `forcePasswordChange: true`
7. Send welcome email with temporary password via SES/Mailpit
8. Create audit event: `user.created`

### Acceptance Criteria
- [ ] Only authorized roles can register new users
- [ ] Temporary password generated and sent via email
- [ ] New users must change password on first login

---

## 1.3 AuthController — Refresh Token Endpoint

**Priority:** P0 (Critical for session management)
**Dependencies:** 1.1, Redis integration (Section 1.5)

### API Contract

```
POST /api/v1/auth/refresh
Headers: Cookie: refresh_token=eyJ... (production) OR Body: { "refreshToken": "eyJ..." } (dev)

Response 200:
{
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 900
}

Response 401:
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token"
}
```

### Business Logic

1. Extract refresh token from HTTP-only cookie (production) or body (dev)
2. Validate JWT signature and expiry
3. Check token is not in Redis blacklist
4. Generate new access token
5. Rotate refresh token (issue new one, blacklist old one in Redis)
6. Set new refresh token cookie (if production mode)

### Acceptance Criteria
- [ ] Refresh token rotation works (old token invalidated after use)
- [ ] Blacklisted tokens cannot be reused
- [ ] Cookie-based in production, body-based in development

---

## 1.4 AuthController — Logout & Password Change

**Priority:** P1
**Dependencies:** 1.1, 1.3

### Logout

```
POST /api/v1/auth/logout
Headers: Authorization: Bearer {jwt}

Response 200: { "message": "Logged out successfully" }
```

Business logic: Blacklist both access and refresh tokens in Redis. Create audit event `user.logout`.

### Change Password

```
POST /api/v1/auth/change-password
Headers: Authorization: Bearer {jwt}
Body:
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePass456!"
}

Response 200: { "message": "Password changed successfully" }
Response 400: { "message": "New password does not meet requirements" }
```

Business logic:
1. Verify current password
2. Validate new password: min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
3. Cannot reuse last 3 passwords (store password history)
4. Hash and store new password
5. Clear `forcePasswordChange` flag
6. Invalidate all other sessions (blacklist all tokens for this user in Redis)
7. Create audit event `user.password_changed`

### Forgot Password

```
POST /api/v1/auth/forgot-password
Body: { "email": "user@example.co.za" }
Response 200: { "message": "If an account exists, a reset link has been sent" }
```

```
POST /api/v1/auth/reset-password
Body: { "token": "reset-token-uuid", "newPassword": "NewPassword123!" }
Response 200: { "message": "Password reset successfully" }
```

Business logic: Generate UUID reset token, store in Redis with 1-hour TTL, send email with link. Token is single-use. No account enumeration (always return 200).

---

## 1.5 Redis Integration Module

**Priority:** P0 (Critical — required for auth)
**Dependencies:** Docker Compose (already has Redis)
**Module:** New `apps/api/src/redis/`

### Implementation

```typescript
// apps/api/src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => ({
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        ttl: 300, // default 5 min
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
```

### Redis Key Patterns

| Key Pattern | Purpose | TTL |
|---|---|---|
| `blacklist:{tokenJti}` | Blacklisted JWT | Until token's original expiry |
| `login_attempts:{email}` | Failed login counter | 15 minutes |
| `reset_token:{uuid}` | Password reset token | 1 hour |
| `mfa_challenge:{userId}` | Pending MFA verification | 5 minutes |
| `session:{userId}:{deviceId}` | Active session tracking | Session duration |
| `cache:dashboard_kpis` | Cached dashboard data | 5 minutes |
| `cache:compliance_score:{tenantId}` | Cached compliance score | 10 minutes |
| `rate_limit:{ip}:{route}` | Rate limit counter | 1 minute |

### Acceptance Criteria
- [ ] Redis module imported globally in AppModule
- [ ] `CACHE_MANAGER` injectable in any service
- [ ] Token blacklisting works for logout
- [ ] Login attempt tracking prevents brute force
- [ ] Health check tests Redis connectivity

---

## 1.6 Rate Limiting

**Priority:** P1
**Dependencies:** 1.5 (Redis)
**Module:** Global (via `@nestjs/throttler`)

### Configuration

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'public',
    ttl: 60000,   // 1 minute window
    limit: 100,   // 100 requests per minute for public endpoints
  },
  {
    name: 'authenticated',
    ttl: 60000,
    limit: 1000,  // 1000 req/min for authenticated users
  },
  {
    name: 'login',
    ttl: 60000,
    limit: 5,     // 5 login attempts per minute per IP
  },
]),
```

### Per-Endpoint Overrides

| Endpoint Category | Limit | Rationale |
|---|---|---|
| `POST /auth/login` | 5/min/IP | Brute force prevention |
| `POST /auth/forgot-password` | 3/min/IP | Email bombing prevention |
| `GET /verify/:trackingId` | 100/min/IP | Public endpoint, higher volume |
| `POST /*/batch-*` | 10/min/user | Bulk operations are expensive |
| `GET /regulatory/dashboard*` | 60/min/user | Complex aggregation queries |
| All other authenticated | 1000/min/user | Normal operational volume |

### Acceptance Criteria
- [ ] Rate limits enforced per endpoint category
- [ ] 429 responses include `Retry-After` header
- [ ] Redis-backed counter (not in-memory)

---

# Section 2: Core API Completion & DTO Validation

This section addresses the **critical gap** of missing class-validator DTOs. All controllers currently accept `@Body() dto: any` — no runtime validation occurs despite `ValidationPipe` being globally enabled.

## 2.1 DTO Validation Layer Architecture

**Priority:** P0 (Critical — Security)
**Dependencies:** None
**Estimated Complexity:** Medium (repetitive but important)

### Pattern

For each module, create a `dto/` directory with class-validator classes that correspond to the `@ncts/shared-types` interfaces:

```
apps/api/src/facilities/
  dto/
    create-facility.dto.ts
    update-facility.dto.ts
    create-zone.dto.ts
  facilities.controller.ts   ← update params: @Body() dto: CreateFacilityDto
  facilities.service.ts
  facilities.module.ts
```

### Shared Decorators

```typescript
// apps/api/src/common/decorators/sa-validators.ts
import { registerDecorator, ValidationOptions } from 'class-validator';

// SA ID Number validator (13 digits, Luhn checksum)
export function IsSaIdNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSaIdNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string' || value.length !== 13) return false;
          // Luhn checksum validation
          let sum = 0;
          for (let i = 0; i < 13; i++) {
            let digit = parseInt(value[i]);
            if (i % 2 === 1) {
              digit *= 2;
              if (digit > 9) digit -= 9;
            }
            sum += digit;
          }
          return sum % 10 === 0;
        },
        defaultMessage: () => 'Invalid South African ID number',
      },
    });
  };
}

// SA coordinate validator
export function IsWithinSaBounds(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isWithinSaBounds',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'number';
          // Actual bounds check done at field-pair level
        },
      },
    });
  };
}
```

## 2.2 Facilities DTOs

```typescript
// apps/api/src/facilities/dto/create-facility.dto.ts
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeoJsonPolygonDto {
  @ApiProperty({ example: 'Polygon' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsArray()
  coordinates: number[][][];
}

export class CreateFacilityDto {
  @ApiProperty({ example: 'Cape Town Cultivation Facility' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'] })
  @IsEnum(['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'] as const)
  facilityType: string;

  @ApiPropertyOptional({ example: 'MUN-CPT-2026-001', description: 'Municipal business license number (required for retail & distribution)' })
  @IsOptional()
  @IsString()
  municipalLicenseNumber?: string;

  @ApiProperty({ example: 'Western Cape' })
  @IsString()
  province: string;

  @ApiProperty({ example: '123 Main Street, Cape Town, 8001' })
  @IsString()
  address: string;

  @ApiProperty({ example: -33.9249 })
  @IsNumber()
  @Min(-35)
  @Max(-22)
  latitude: number;

  @ApiProperty({ example: 18.4241 })
  @IsNumber()
  @Min(16)
  @Max(33)
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-35)
  @Max(-22)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(33)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  boundary?: GeoJsonPolygonDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateZoneDto {
  @ApiProperty({ example: 'Zone A - Flowering' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'flowering' })
  @IsString()
  zoneType: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  capacity: number;
}
```

## 2.3 Plants DTOs

```typescript
// apps/api/src/plants/dto/create-plant.dto.ts
import { IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsDateString, Min, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlantDto {
  @ApiProperty()
  @IsUUID()
  strainId: string;

  @ApiProperty()
  @IsUUID()
  facilityId: string;

  @ApiProperty()
  @IsUUID()
  zoneId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  motherPlantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedDate?: string;
}

export class BatchCreatePlantsDto {
  @ApiProperty({ type: [CreatePlantDto], minItems: 1, maxItems: 1000 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlantDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  plants: CreatePlantDto[];
}

export class UpdatePlantStateDto {
  @ApiProperty({ enum: ['seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] })
  @IsEnum(['seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] as const)
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destroyedReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  destroyedDate?: string;
}

export class PlantFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['seed', 'seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'] as const)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  strainId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantedBefore?: string;

  @ApiPropertyOptional({ example: 'created_at:desc' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
```

## 2.4 Harvests DTOs

```typescript
// apps/api/src/harvests/dto/create-harvest.dto.ts
import { IsUUID, IsArray, IsNumber, IsOptional, IsString, IsDateString, Min, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHarvestDto {
  @ApiProperty({ description: 'Plant IDs to harvest (must be in FLOWERING state)' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  plantIds: string[];

  @ApiProperty()
  @IsUUID()
  facilityId: string;

  @ApiProperty({ example: 2500.5 })
  @IsNumber()
  @Min(0.01)
  wetWeightGrams: number;

  @ApiPropertyOptional({ example: 625.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestDate?: string;
}

export class UpdateHarvestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dryWeightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
```

## 2.5 Lab Results DTOs

```typescript
// apps/api/src/lab-results/dto/submit-lab-result.dto.ts
import { IsUUID, IsNumber, IsBoolean, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitLabResultDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiProperty({ example: 'Cape Analytics Lab' })
  @IsString()
  labName: string;

  @ApiProperty({ example: 'T0538', description: 'SANAS ISO 17025 accreditation number — SAHPRA requires lab results from accredited facilities' })
  @IsString()
  @Matches(/^T\d{4}$/, { message: 'Must be a valid SANAS accreditation number (e.g., T0538)' })
  labAccreditationNumber: string;

  @ApiProperty({ example: 'LAB-2026-001' })
  @IsString()
  labReportNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  testDate?: string;

  @ApiProperty({ example: 18.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  thcPercent: number;

  @ApiProperty({ example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cbdPercent: number;

  @ApiPropertyOptional({ example: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbgPercent?: number;

  @ApiPropertyOptional({ example: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbnPercent?: number;

  @ApiProperty({ example: 5.2 })
  @IsNumber()
  @Min(0)
  moisturePercent: number;

  @ApiProperty()
  @IsBoolean()
  pesticidesFree: boolean;

  @ApiProperty()
  @IsBoolean()
  heavyMetalsFree: boolean;

  @ApiProperty()
  @IsBoolean()
  microbialFree: boolean;

  @ApiProperty()
  @IsBoolean()
  mycotoxinsFree: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  terpeneProfile?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
```

## 2.6 Transfers DTOs

```typescript
// apps/api/src/transfers/dto/create-transfer.dto.ts
import { IsUUID, IsArray, IsOptional, IsString, IsDateString, IsNumber, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TransferItemDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(0.01)
  quantityGrams: number;
}

export class CreateTransferDto {
  @ApiProperty()
  @IsUUID()
  senderFacilityId: string;

  @ApiProperty()
  @IsUUID()
  receiverFacilityId: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  @ArrayMinSize(1)
  items: TransferItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverIdNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;
}

export class AcceptTransferDto {
  @ApiProperty({ description: 'Received items with actual quantities' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  receivedItems: ReceivedItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class ReceivedItemDto {
  @ApiProperty()
  @IsUUID()
  transferItemId: string;

  @ApiProperty({ example: 498.5 })
  @IsNumber()
  @Min(0)
  receivedQuantityGrams: number;
}

export class RejectTransferDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
```

## 2.7 Sales DTOs

```typescript
// apps/api/src/sales/dto/create-sale.dto.ts
import { IsUUID, IsNumber, IsString, IsOptional, IsDateString, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  batchId: string;

  @ApiProperty()
  @IsUUID()
  facilityId: string;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  @Min(0.01)
  quantityGrams: number;

  @ApiProperty({ example: 1500.0, description: 'Total price in ZAR' })
  @IsNumber()
  @Min(0)
  totalPriceZar: number;

  @ApiPropertyOptional({ enum: ['retail', 'wholesale', 'medical', 'export'] })
  @IsOptional()
  @IsEnum(['retail', 'wholesale', 'medical', 'export'] as const)
  saleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  saleDate?: string;
}
```

## 2.8 Regulatory DTOs

```typescript
// apps/api/src/regulatory/dto/update-permit-status.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermitStatusDto {
  @ApiProperty({ enum: ['active', 'suspended', 'revoked', 'expired', 'pending_review'] })
  @IsEnum(['active', 'suspended', 'revoked', 'expired', 'pending_review'] as const)
  status: string;

  @ApiPropertyOptional({ description: 'Required when suspending or revoking' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Review notes for audit trail' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

## 2.9 Controller Updates

**Every controller** must be updated to use the new DTO classes instead of `any`:

```typescript
// BEFORE:
@Post()
async create(@Body() dto: any) { ... }

// AFTER:
@Post()
async create(@Body() dto: CreateFacilityDto) { ... }
```

### Update Manifest

| Controller | Method | Before | After |
|---|---|---|---|
| `facilities.controller.ts` | `POST /facilities` | `@Body() dto: any` | `@Body() dto: CreateFacilityDto` |
| `facilities.controller.ts` | `PATCH /facilities/:id` | `@Body() dto: any` | `@Body() dto: UpdateFacilityDto` |
| `facilities.controller.ts` | `POST /facilities/:id/zones` | `@Body() dto: any` | `@Body() dto: CreateZoneDto` |
| `plants.controller.ts` | `POST /plants` | `@Body() dto: any` | `@Body() dto: CreatePlantDto` |
| `plants.controller.ts` | `POST /plants/batch-register` | `@Body() dto: any` | `@Body() dto: BatchCreatePlantsDto` |
| `plants.controller.ts` | `PATCH /plants/:id/state` | `@Body() dto: any` | `@Body() dto: UpdatePlantStateDto` |
| `plants.controller.ts` | `GET /plants` (query) | Raw query params | `@Query() filter: PlantFilterDto` |
| `harvests.controller.ts` | `POST /harvests` | `@Body() dto: any` | `@Body() dto: CreateHarvestDto` |
| `harvests.controller.ts` | `PATCH /harvests/:id` | `@Body() dto: any` | `@Body() dto: UpdateHarvestDto` |
| `lab-results.controller.ts` | `POST /lab-results` | `@Body() dto: any` | `@Body() dto: SubmitLabResultDto` |
| `transfers.controller.ts` | `POST /transfers` | `@Body() dto: any` | `@Body() dto: CreateTransferDto` |
| `transfers.controller.ts` | `PATCH /:id/accept` | `@Body() dto: any` | `@Body() dto: AcceptTransferDto` |
| `transfers.controller.ts` | `PATCH /:id/reject` | `@Body() dto: any` | `@Body() dto: RejectTransferDto` |
| `sales.controller.ts` | `POST /sales` | `@Body() dto: any` | `@Body() dto: CreateSaleDto` |
| `regulatory.controller.ts` | `PATCH /permits/:id/status` | `@Body() dto: any` | `@Body() dto: UpdatePermitStatusDto` |

### Acceptance Criteria
- [ ] All 15 controller endpoints use typed DTO classes
- [ ] `ValidationPipe` now rejects malformed requests with structured 400 errors
- [ ] Swagger `/api/docs` shows complete request/response schemas for all endpoints
- [ ] Extra fields are stripped (`whitelist: true` in pipe config — already set)
- [ ] Unknown fields cause 400 error (`forbidNonWhitelisted: true` — already set)

---

## 2.10 Missing Endpoints

### GET /harvests (List)

```
GET /api/v1/harvests?facilityId=uuid&page=1&limit=20
Headers: Authorization: Bearer {jwt}

Response 200:
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Currently only `GET /harvests/:id` and `POST /harvests` exist. The list endpoint is missing.

### POST /batches (Manual Batch Creation)

```
POST /api/v1/batches
Headers: Authorization: Bearer {jwt}
Body:
{
  "parentBatchId": "uuid",
  "batchType": "processed",
  "facilityId": "uuid",
  "processedWeightGrams": 450.0,
  "notes": "Extracted into oil"
}
```

Currently batches are only created via `POST /harvests`. Manual batch creation is needed for processing/packaging workflows.

### PATCH /batches/:id (Weight Update)

```
PATCH /api/v1/batches/:id
Headers: Authorization: Bearer {jwt}
Body:
{
  "processedWeightGrams": 430.5,
  "dryWeightGrams": 550.0,
  "notes": "Final drying complete"
}
```

### Transfer Discrepancy Detection

**Modify** `transfers.service.ts` `acceptTransfer()` to:
1. Compare `receivedQuantityGrams` vs `quantityGrams` for each item
2. If variance > 2%, flag the transfer as `discrepancy_detected`
3. Generate a `ComplianceAlert` (severity = warning for 2-5%, critical for >5%)
4. Store variance details in the transfer record

### Sales Inventory Auto-Deduction

**Modify** `sales.service.ts` `createSale()` to:
1. Check sufficient batch quantity before sale
2. Deduct `quantityGrams` from batch's available stock
3. If insufficient stock, return 400 with clear error
4. Create audit event with before/after quantities

### Acceptance Criteria
- [ ] `GET /harvests` returns paginated list with filters
- [ ] `POST /batches` creates processing/packaging batches from parent
- [ ] `PATCH /batches/:id` updates batch weights
- [ ] Transfer acceptance calculates and stores discrepancy percentage
- [ ] Sale creation validates and deducts inventory
- [ ] `GET /sales/summary` returns period-based aggregation

### GET /sales/summary (Period Aggregation)

**Reference:** Plan.md Phase 2.6 — Sales tracking with aggregation

```
GET /api/v1/sales/summary?period=2026-03&facilityId=uuid
Headers: Authorization: Bearer {jwt}

Response 200:
{
  "period": "2026-03",
  "facilityId": "uuid",
  "facilityName": "Cape Town Dispensary",
  "totalSales": 142,
  "totalQuantityGrams": 8540.5,
  "totalRevenueZar": 1282075.00,
  "bySaleType": {
    "retail": { "count": 98, "quantityGrams": 4200.0, "revenueZar": 840000.00 },
    "wholesale": { "count": 25, "quantityGrams": 3500.0, "revenueZar": 350000.00 },
    "medical": { "count": 19, "quantityGrams": 840.5, "revenueZar": 92075.00 }
  },
  "topBatches": [
    { "batchId": "uuid", "trackingId": "NCTS-ZA-2026-000042", "quantityGrams": 1200.0, "revenueZar": 180000.00 }
  ],
  "averagePricePerGram": 150.12,
  "comparisonToPreviousPeriod": {
    "revenueChangePercent": 12.5,
    "quantityChangePercent": 8.2
  }
}
```

**Implementation:**

```typescript
// apps/api/src/sales/sales.controller.ts
@Get('summary')
@Roles('operator_admin', 'regulator', 'super_admin')
async getSalesSummary(
  @Query('period') period: string,       // 'YYYY-MM'
  @Query('facilityId') facilityId?: string,
  @CurrentUser() user: JwtPayload,
): Promise<SalesSummaryDto> {
  // Validate period format
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw new BadRequestException('Period must be YYYY-MM format');
  }

  const startDate = new Date(`${period}-01T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const where: Prisma.SaleWhereInput = {
    tenantId: user.tenantId,
    createdAt: { gte: startDate, lt: endDate },
    ...(facilityId && { facilityId }),
  };

  const [sales, grouped, previousPeriodTotal] = await Promise.all([
    this.prisma.sale.aggregate({
      where,
      _count: true,
      _sum: { quantityGrams: true, totalPriceZar: true },
    }),
    this.prisma.sale.groupBy({
      by: ['saleType'],
      where,
      _count: true,
      _sum: { quantityGrams: true, totalPriceZar: true },
    }),
    this.prisma.sale.aggregate({
      where: {
        ...where,
        createdAt: {
          gte: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: startDate,
        },
      },
      _sum: { totalPriceZar: true, quantityGrams: true },
    }),
  ]);

  const totalRevenue = sales._sum.totalPriceZar || 0;
  const prevRevenue = previousPeriodTotal._sum.totalPriceZar || 0;

  return {
    period,
    facilityId: facilityId || 'all',
    totalSales: sales._count,
    totalQuantityGrams: sales._sum.quantityGrams || 0,
    totalRevenueZar: totalRevenue,
    bySaleType: Object.fromEntries(
      grouped.map(g => [g.saleType || 'unclassified', {
        count: g._count,
        quantityGrams: g._sum.quantityGrams || 0,
        revenueZar: g._sum.totalPriceZar || 0,
      }]),
    ),
    averagePricePerGram: sales._sum.quantityGrams
      ? totalRevenue / sales._sum.quantityGrams
      : 0,
    comparisonToPreviousPeriod: {
      revenueChangePercent: prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : null,
      quantityChangePercent: previousPeriodTotal._sum.quantityGrams
        ? (((sales._sum.quantityGrams || 0) - previousPeriodTotal._sum.quantityGrams) / previousPeriodTotal._sum.quantityGrams) * 100
        : null,
    },
  };
}
```

---

# Section 3: Compliance Engine

The compliance engine is the system's **core differentiator** — it enables real-time and scheduled rule evaluation, diversion detection, alert escalation, and automated enforcement. This is what turns NCTS from a CRUD tracker into a regulatory intelligence platform.

## 3.1 Compliance Module Structure

**Priority:** P0 (Critical — regulatory requirement)
**Dependencies:** Section 0 (ComplianceRule, ComplianceAlert models), Section 1 (Auth)
**Module:** New `apps/api/src/compliance/`

### Directory Layout

```
apps/api/src/compliance/
  compliance.module.ts
  compliance.controller.ts
  compliance.service.ts
  engine/
    compliance-engine.ts          ← Strategy pattern orchestrator
    rule-evaluator.interface.ts   ← Common interface for all rules
    evaluators/
      permit-expiry.evaluator.ts
      thc-limit.evaluator.ts
      inventory-variance.evaluator.ts
      transfer-velocity.evaluator.ts
      verification-anomaly.evaluator.ts
      wet-dry-ratio.evaluator.ts
      mass-balance.evaluator.ts
      production-limit.evaluator.ts
      lab-result-frequency.evaluator.ts
      zone-capacity.evaluator.ts
      reporting-deadline.evaluator.ts
      destruction-compliance.evaluator.ts
      import-export-balance.evaluator.ts
      permit-activity-scope.evaluator.ts
    diversion/
      diversion-detector.service.ts
      algorithms/
        mass-balance.algorithm.ts
        wet-dry-ratio.algorithm.ts
        transfer-velocity.algorithm.ts
        verification-pattern.algorithm.ts
  scoring/
    compliance-score.service.ts
  escalation/
    alert-escalation.service.ts
  inventory/
    inventory-reconciliation.service.ts
  dto/
    create-rule.dto.ts
    update-alert.dto.ts
    inventory-snapshot.dto.ts
```

## 3.2 Rule Evaluator Interface (Strategy Pattern)

```typescript
// apps/api/src/compliance/engine/rule-evaluator.interface.ts
export interface RuleEvaluationContext {
  tenantId: string;
  facilityId?: string;
  entityType?: string;
  entityId?: string;
  triggerEvent?: string; // e.g., 'lab_result.created', 'transfer.accepted'
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  details: Record<string, any>;
  suggestedAction?: string;
  autoAction?: { type: string; params: Record<string, any> };
}

export interface RuleEvaluator {
  readonly ruleCode: string; // e.g., 'R001'
  readonly evaluationType: 'real_time' | 'batch' | 'scheduled';
  evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult>;
}
```

## 3.3 Compliance Engine Orchestrator

```typescript
// apps/api/src/compliance/engine/compliance-engine.ts
@Injectable()
export class ComplianceEngine {
  private readonly evaluators = new Map<string, RuleEvaluator>();

  constructor(
    private prisma: PrismaService,
    private alertService: AlertEscalationService,
    @Inject('RULE_EVALUATORS') evaluators: RuleEvaluator[],
  ) {
    evaluators.forEach(e => this.evaluators.set(e.ruleCode, e));
  }

  /**
   * Real-time evaluation — called synchronously during API operations.
   * Only runs evaluators that match the trigger event.
   */
  async evaluateRealTime(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const activeRules = await this.prisma.complianceRule.findMany({
      where: { isActive: true, evaluationType: 'real_time' },
    });

    const results: RuleEvaluationResult[] = [];
    for (const rule of activeRules) {
      const evaluator = this.evaluators.get(rule.name);
      if (!evaluator) continue;
      const result = await evaluator.evaluate(context);
      results.push(result);

      if (!result.passed) {
        await this.createAlert(rule, result, context);
      }
    }
    return results;
  }

  /**
   * Batch evaluation — runs all scheduled rules for a tenant.
   * Called by cron job (see Section 5).
   */
  async evaluateBatch(tenantId: string): Promise<RuleEvaluationResult[]> {
    const activeRules = await this.prisma.complianceRule.findMany({
      where: { isActive: true, evaluationType: { in: ['batch', 'scheduled'] } },
    });

    const results: RuleEvaluationResult[] = [];
    for (const rule of activeRules) {
      const evaluator = this.evaluators.get(rule.name);
      if (!evaluator) continue;
      const result = await evaluator.evaluate({ tenantId });
      results.push(result);
      if (!result.passed) {
        await this.createAlert(rule, result, { tenantId });
      }
    }
    return results;
  }

  private async createAlert(
    rule: ComplianceRule,
    result: RuleEvaluationResult,
    context: RuleEvaluationContext,
  ): Promise<void> {
    const alert = await this.prisma.complianceAlert.create({
      data: {
        ruleId: rule.id,
        tenantId: context.tenantId,
        facilityId: context.facilityId || null,
        severity: result.severity,
        alertType: result.ruleId,
        description: result.description,
        entityType: context.entityType || null,
        entityId: context.entityId || null,
        autoActions: result.autoAction || null,
      },
    });

    // Execute auto-actions (e.g., suspend permit)
    if (result.autoAction) {
      await this.executeAutoAction(result.autoAction, alert.id);
    }

    // Escalation
    await this.alertService.processNewAlert(alert);
  }

  private async executeAutoAction(
    action: { type: string; params: Record<string, any> },
    alertId: string,
  ): Promise<void> {
    switch (action.type) {
      case 'suspend_permit':
        await this.prisma.permit.update({
          where: { id: action.params.permitId },
          data: { status: 'suspended' },
        });
        break;
      case 'flag_transfer':
        await this.prisma.transfer.update({
          where: { id: action.params.transferId },
          data: { status: 'flagged' },
        });
        break;
      case 'lock_facility':
        await this.prisma.facility.update({
          where: { id: action.params.facilityId },
          data: { isActive: false },
        });
        break;
    }
  }
}
```

## 3.4 Compliance Rules (14 Rule Definitions)

Each rule is a separate evaluator class implementing `RuleEvaluator`. Rules are seeded into `compliance_rules` table on deployment.

### R001 — Permit Expiry Check

```typescript
// permit-expiry.evaluator.ts
@Injectable()
export class PermitExpiryEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R001';
  readonly evaluationType = 'scheduled' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const expiringSoon = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      ruleId: 'R001',
      ruleName: 'Permit Expiry Check',
      passed: expiringSoon.length === 0,
      severity: expiringSoon.some(p => p.expiryDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        ? 'critical' : 'warning',
      description: `${expiringSoon.length} permit(s) expiring within 30 days`,
      details: { permits: expiringSoon.map(p => ({ id: p.id, expiryDate: p.expiryDate })) },
      suggestedAction: 'Initiate permit renewal process',
    };
  }
}
```

### R002 — THC Limit Enforcement

```typescript
// thc-limit.evaluator.ts — real-time on lab result submission
@Injectable()
export class ThcLimitEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R002';
  readonly evaluationType = 'real_time' as const;

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const labResult = await this.prisma.labResult.findUnique({
      where: { id: context.entityId },
      include: { batch: { include: { facility: true } } },
    });

    if (!labResult) return this.pass();

    // DALRRD hemp threshold: 0.2% THC
    const isHemp = labResult.batch.facility.facilityType === 'hemp_cultivation';
    const threshold = isHemp ? 0.2 : 100; // No THC limit for medicinal

    const passed = labResult.thcPercent <= threshold;

    return {
      ruleId: 'R002',
      ruleName: 'THC Limit Enforcement',
      passed,
      severity: passed ? 'info' : 'critical',
      description: passed
        ? `THC ${labResult.thcPercent}% within limits`
        : `THC ${labResult.thcPercent}% EXCEEDS ${threshold}% limit for ${isHemp ? 'hemp' : 'medicinal'}`,
      details: { thcPercent: labResult.thcPercent, threshold, batchId: labResult.batchId },
      autoAction: !passed && isHemp
        ? { type: 'quarantine_batch', params: { batchId: labResult.batchId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R002', ruleName: 'THC Limit Enforcement', passed: true, severity: 'info', description: 'OK', details: {} };
  }
}
```

### R003 — Inventory Variance Detection

**Type:** Batch (scheduled daily)  
**Trigger:** Cron `0 2 * * *` (2 AM daily)  
**Logic:** Compare tracked inventory (sum of batch weights − sold − transferred − destroyed) vs declared inventory. Flag if variance > 2%.

```typescript
// inventory-variance.evaluator.ts
@Injectable()
export class InventoryVarianceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R003';
  readonly evaluationType = 'batch' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const VARIANCE_WARNING_THRESHOLD = 0.02;  // 2%
    const VARIANCE_CRITICAL_THRESHOLD = 0.05; // 5%

    const facilities = await this.prisma.facility.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      select: { id: true, name: true },
    });

    const variances: { facilityId: string; facilityName: string; variance: number; expected: number; actual: number }[] = [];

    for (const facility of facilities) {
      // Expected: sum of all batch weights for this facility
      const batchWeights = await this.prisma.batch.aggregate({
        where: { facilityId: facility.id },
        _sum: { processedWeightGrams: true, dryWeightGrams: true },
      });

      const totalBatchWeight = (batchWeights._sum.processedWeightGrams || 0)
        + (batchWeights._sum.dryWeightGrams || 0);

      // Deductions: sold + transferred out + destroyed
      const [sold, transferredOut, destroyed] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityGrams: true },
        }),
        this.prisma.transferItem.aggregate({
          where: { transfer: { sourceFacilityId: facility.id, status: 'completed' } },
          _sum: { quantityGrams: true },
        }),
        this.prisma.destructionEvent.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityGrams: true },
        }),
      ]);

      const expectedInventory = totalBatchWeight
        - (sold._sum.quantityGrams || 0)
        - (transferredOut._sum.quantityGrams || 0)
        - (destroyed._sum.quantityGrams || 0);

      // Actual: from latest inventory snapshot
      const latestSnapshot = await this.prisma.inventorySnapshot.findFirst({
        where: { facilityId: facility.id },
        orderBy: { snapshotDate: 'desc' },
      });

      const actualInventory = latestSnapshot?.totalWeightGrams || 0;

      if (expectedInventory > 0) {
        const variance = Math.abs(expectedInventory - actualInventory) / expectedInventory;
        if (variance > VARIANCE_WARNING_THRESHOLD) {
          variances.push({
            facilityId: facility.id,
            facilityName: facility.name,
            variance,
            expected: expectedInventory,
            actual: actualInventory,
          });
        }
      }
    }

    const hasCritical = variances.some(v => v.variance > VARIANCE_CRITICAL_THRESHOLD);

    return {
      ruleId: 'R003',
      ruleName: 'Inventory Variance Detection',
      passed: variances.length === 0,
      severity: hasCritical ? 'critical' : variances.length > 0 ? 'warning' : 'info',
      description: variances.length === 0
        ? 'All facility inventories within 2% tolerance'
        : `${variances.length} facility(ies) with inventory variance exceeding 2%`,
      details: {
        facilities: variances.map(v => ({
          facilityId: v.facilityId,
          facilityName: v.facilityName,
          variancePercent: (v.variance * 100).toFixed(2),
          expectedGrams: v.expected.toFixed(1),
          actualGrams: v.actual.toFixed(1),
        })),
      },
      suggestedAction: hasCritical
        ? 'Initiate physical inventory audit and investigation'
        : 'Schedule inventory reconciliation for flagged facilities',
      autoAction: hasCritical
        ? { type: 'flag_facility_for_audit', params: { facilityIds: variances.filter(v => v.variance > VARIANCE_CRITICAL_THRESHOLD).map(v => v.facilityId) } }
        : undefined,
    };
  }
}
```

### R004 — Transfer Velocity Anomaly

**Type:** Real-time (on transfer creation)  
**Trigger:** Fires on `POST /transfers` before persistence  
**Logic:** Calculate average transfer frequency across all operators. Flag if current operator's transfer rate is > 3σ above mean.

```typescript
// transfer-velocity.evaluator.ts
@Injectable()
export class TransferVelocityEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R004';
  readonly evaluationType = 'real_time' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const LOOKBACK_DAYS = 30;
    const SIGMA_THRESHOLD = 3;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Get transfer counts per tenant in last 30 days
    const allTenantCounts = await this.prisma.transfer.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: lookbackDate } },
      _count: true,
    });

    if (allTenantCounts.length < 3) {
      // Not enough data for statistical analysis
      return this.pass();
    }

    const counts = allTenantCounts.map(t => t._count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length);

    // Get current tenant's count
    const currentTenantCount = allTenantCounts.find(t => t.tenantId === context.tenantId)?._count || 0;
    const zScore = stdDev > 0 ? (currentTenantCount - mean) / stdDev : 0;

    const passed = zScore <= SIGMA_THRESHOLD;

    return {
      ruleId: 'R004',
      ruleName: 'Transfer Velocity Anomaly',
      passed,
      severity: passed ? 'info' : (zScore > 5 ? 'critical' : 'warning'),
      description: passed
        ? `Transfer rate normal (z-score: ${zScore.toFixed(2)})`
        : `Transfer rate anomaly detected: ${currentTenantCount} transfers in ${LOOKBACK_DAYS} days (z-score: ${zScore.toFixed(2)}, threshold: ${SIGMA_THRESHOLD}σ)`,
      details: {
        tenantTransferCount: currentTenantCount,
        meanTransferCount: mean.toFixed(1),
        stdDev: stdDev.toFixed(1),
        zScore: zScore.toFixed(2),
        lookbackDays: LOOKBACK_DAYS,
      },
      suggestedAction: !passed ? 'Investigate unusual transfer volume — potential diversion' : undefined,
      autoAction: zScore > 5
        ? { type: 'flag_transfer', params: { transferId: context.entityId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R004', ruleName: 'Transfer Velocity Anomaly', passed: true, severity: 'info', description: 'Insufficient data for analysis', details: {} };
  }
}
```

### R005 — Verification Pattern Anomaly

**Type:** Batch (scheduled weekly)  
**Trigger:** Cron `0 3 * * 0` (3 AM Sundays)  
**Logic:** Analyze QR verification patterns. Flag if:
- Same QR scanned > 20 times in 24 hours (potential counterfeiting)
- Geographic scatter of scans > 500 km (single product in multiple cities)
- Scans from non-SA IP addresses

```typescript
// verification-anomaly.evaluator.ts
@Injectable()
export class VerificationAnomalyEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R005';
  readonly evaluationType = 'batch' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const SCAN_THRESHOLD_24H = 20;
    const GEO_SCATTER_KM = 500;
    const LOOKBACK_DAYS = 7;
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Fetch verification scan events for this tenant
    const scanEvents = await this.prisma.outboxEvent.findMany({
      where: {
        eventType: 'verification.scanned',
        createdAt: { gte: lookbackDate },
      },
      select: { aggregateId: true, payload: true, createdAt: true },
    });

    const anomalies: { type: string; entityId: string; details: Record<string, any> }[] = [];

    // Group by entity (tracking ID)
    const byEntity = new Map<string, typeof scanEvents>();
    for (const event of scanEvents) {
      const group = byEntity.get(event.aggregateId) || [];
      group.push(event);
      byEntity.set(event.aggregateId, group);
    }

    for (const [entityId, events] of byEntity) {
      // Check 1: High-frequency scanning (>20 in any 24h window)
      const sortedEvents = events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 0; i < sortedEvents.length; i++) {
        const windowEnd = new Date(sortedEvents[i].createdAt.getTime() + 24 * 60 * 60 * 1000);
        const windowCount = sortedEvents.filter(e => e.createdAt >= sortedEvents[i].createdAt && e.createdAt <= windowEnd).length;
        if (windowCount > SCAN_THRESHOLD_24H) {
          anomalies.push({
            type: 'high_frequency',
            entityId,
            details: { scanCount: windowCount, windowStart: sortedEvents[i].createdAt },
          });
          break; // One anomaly per entity per type
        }
      }

      // Check 2: Geographic scatter (>500 km between any two scans)
      const locations = events
        .map(e => (e.payload as any)?.location)
        .filter(loc => loc?.lat && loc?.lng);

      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const distance = this.haversineKm(
            locations[i].lat, locations[i].lng,
            locations[j].lat, locations[j].lng,
          );
          if (distance > GEO_SCATTER_KM) {
            anomalies.push({
              type: 'geographic_scatter',
              entityId,
              details: { distanceKm: distance.toFixed(0), loc1: locations[i], loc2: locations[j] },
            });
            break;
          }
        }
        if (anomalies.some(a => a.entityId === entityId && a.type === 'geographic_scatter')) break;
      }

      // Check 3: Non-SA IP addresses
      const nonSaScans = events.filter(e => {
        const ip = (e.payload as any)?.ip;
        // Placeholder: in production, use GeoIP lookup service
        return ip && !ip.startsWith('196.') && !ip.startsWith('197.') && !ip.startsWith('41.');
      });
      if (nonSaScans.length > 0) {
        anomalies.push({
          type: 'non_sa_ip',
          entityId,
          details: { count: nonSaScans.length, ips: nonSaScans.map(e => (e.payload as any)?.ip).slice(0, 5) },
        });
      }
    }

    return {
      ruleId: 'R005',
      ruleName: 'Verification Pattern Anomaly',
      passed: anomalies.length === 0,
      severity: anomalies.length === 0 ? 'info'
        : anomalies.some(a => a.type === 'high_frequency') ? 'critical' : 'warning',
      description: anomalies.length === 0
        ? 'No verification anomalies detected'
        : `${anomalies.length} verification anomalies across ${new Set(anomalies.map(a => a.entityId)).size} entities`,
      details: { anomalies },
      suggestedAction: anomalies.length > 0
        ? 'Investigate flagged entities for potential counterfeiting or parallel market activity'
        : undefined,
    };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

### R006 — Wet-to-Dry Ratio Anomaly

**Type:** Real-time (on harvest dry weight update)  
**Trigger:** Fires on `PATCH /harvests/:id` when `dryWeightGrams` is updated  
**Logic:** Normal ratio is 3:1 to 5:1 (wet:dry). Flag if ratio < 2:1 (adding weight) or > 7:1 (hiding product).

```typescript
// wet-dry-ratio.evaluator.ts
@Injectable()
export class WetDryRatioEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R006';
  readonly evaluationType = 'real_time' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MIN_NORMAL_RATIO = 2.0;   // Below 2:1 → suspiciously heavy dry weight (added material)
    const MAX_NORMAL_RATIO = 7.0;   // Above 7:1 → suspiciously low dry weight (hiding product)
    const CRITICAL_LOW_RATIO = 1.5; // Extremely suspicious
    const CRITICAL_HIGH_RATIO = 9.0;

    const harvest = await this.prisma.harvest.findUnique({
      where: { id: context.entityId },
      include: { facility: true },
    });

    if (!harvest || !harvest.wetWeightGrams || !harvest.dryWeightGrams) {
      return this.pass();
    }

    const ratio = harvest.wetWeightGrams / harvest.dryWeightGrams;
    const withinNormal = ratio >= MIN_NORMAL_RATIO && ratio <= MAX_NORMAL_RATIO;
    const isCritical = ratio < CRITICAL_LOW_RATIO || ratio > CRITICAL_HIGH_RATIO;

    return {
      ruleId: 'R006',
      ruleName: 'Wet-to-Dry Ratio Anomaly',
      passed: withinNormal,
      severity: isCritical ? 'critical' : (!withinNormal ? 'warning' : 'info'),
      description: withinNormal
        ? `Wet-to-dry ratio ${ratio.toFixed(2)}:1 within normal range (${MIN_NORMAL_RATIO}:1 — ${MAX_NORMAL_RATIO}:1)`
        : ratio < MIN_NORMAL_RATIO
          ? `Wet-to-dry ratio ${ratio.toFixed(2)}:1 BELOW minimum ${MIN_NORMAL_RATIO}:1 — possible weight manipulation (added material)`
          : `Wet-to-dry ratio ${ratio.toFixed(2)}:1 ABOVE maximum ${MAX_NORMAL_RATIO}:1 — possible product diversion (hidden yield)`,
      details: {
        harvestId: harvest.id,
        facilityId: harvest.facilityId,
        facilityName: harvest.facility.name,
        wetWeightGrams: harvest.wetWeightGrams,
        dryWeightGrams: harvest.dryWeightGrams,
        ratio: ratio.toFixed(2),
        normalRange: `${MIN_NORMAL_RATIO}:1 — ${MAX_NORMAL_RATIO}:1`,
      },
      suggestedAction: !withinNormal
        ? 'Schedule facility inspection and verify harvest records'
        : undefined,
      autoAction: isCritical
        ? { type: 'flag_facility_for_audit', params: { facilityId: harvest.facilityId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R006', ruleName: 'Wet-to-Dry Ratio Anomaly', passed: true, severity: 'info', description: 'Incomplete harvest data', details: {} };
  }
}
```

### R007 — Mass Balance Check

**Type:** Batch (scheduled daily)  
**Trigger:** Cron `0 3 * * *` (3 AM daily)  
**Logic:** For each facility: `plants_harvested_weight` − `batches_weight` − `waste` < 2% tolerance. Persistent imbalance triggers escalation.

```typescript
// mass-balance.evaluator.ts
@Injectable()
export class MassBalanceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R007';
  readonly evaluationType = 'batch' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const TOLERANCE = 0.02;           // 2%
    const CRITICAL_TOLERANCE = 0.05;  // 5%
    const PERSISTENT_DAYS = 3;        // Escalate if imbalance persists 3+ days

    const facilities = await this.prisma.facility.findMany({
      where: { tenantId: context.tenantId, isActive: true },
    });

    const imbalances: { facilityId: string; facilityName: string; imbalancePercent: number; persistent: boolean }[] = [];

    for (const facility of facilities) {
      // Input: total harvested weight
      const harvestTotal = await this.prisma.harvest.aggregate({
        where: { facilityId: facility.id },
        _sum: { dryWeightGrams: true },
      });

      // Output: batch weight + destroyed waste
      const [batchTotal, wasteTotal] = await Promise.all([
        this.prisma.batch.aggregate({
          where: { facilityId: facility.id },
          _sum: { processedWeightGrams: true },
        }),
        this.prisma.destructionEvent.aggregate({
          where: { facilityId: facility.id },
          _sum: { quantityGrams: true },
        }),
      ]);

      const input = harvestTotal._sum.dryWeightGrams || 0;
      const output = (batchTotal._sum.processedWeightGrams || 0) + (wasteTotal._sum.quantityGrams || 0);

      if (input > 0) {
        const imbalance = Math.abs(input - output) / input;
        if (imbalance > TOLERANCE) {
          // Check persistence: was this flagged yesterday too?
          const recentAlerts = await this.prisma.complianceAlert.count({
            where: {
              ruleCode: 'R007',
              entityId: facility.id,
              createdAt: { gte: new Date(Date.now() - PERSISTENT_DAYS * 24 * 60 * 60 * 1000) },
            },
          });

          imbalances.push({
            facilityId: facility.id,
            facilityName: facility.name,
            imbalancePercent: imbalance * 100,
            persistent: recentAlerts >= PERSISTENT_DAYS - 1,
          });
        }
      }
    }

    const hasCritical = imbalances.some(i => i.imbalancePercent > CRITICAL_TOLERANCE * 100 || i.persistent);

    return {
      ruleId: 'R007',
      ruleName: 'Mass Balance Check',
      passed: imbalances.length === 0,
      severity: hasCritical ? 'critical' : imbalances.length > 0 ? 'warning' : 'info',
      description: imbalances.length === 0
        ? 'All facilities within mass balance tolerance'
        : `${imbalances.length} facility(ies) with mass balance imbalance`,
      details: {
        facilities: imbalances.map(i => ({
          facilityId: i.facilityId,
          facilityName: i.facilityName,
          imbalancePercent: i.imbalancePercent.toFixed(2),
          persistent: i.persistent,
        })),
      },
      suggestedAction: hasCritical
        ? 'Initiate investigation — persistent mass imbalance indicates potential diversion'
        : 'Schedule physical inventory verification',
      autoAction: imbalances.some(i => i.persistent)
        ? { type: 'lock_facility', params: { facilityId: imbalances.find(i => i.persistent)!.facilityId } }
        : undefined,
    };
  }
}
```

### R008 — Production Limit Check

**Type:** Real-time (on plant creation)  
**Trigger:** Fires on `POST /plants` before persistence  
**Logic:** Compare total active plants vs permit's `maxPlantCount`. Warn at 90%, block at 100%.

```typescript
// production-limit.evaluator.ts
@Injectable()
export class ProductionLimitEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R008';
  readonly evaluationType = 'real_time' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const WARN_THRESHOLD = 0.90;  // Warn at 90%
    const BLOCK_THRESHOLD = 1.00; // Block at 100%

    // Get operator's active permits with plant count limits
    const permits = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        maxPlantCount: { not: null },
      },
    });

    if (permits.length === 0) return this.pass();

    // Count active plants (not harvested, not destroyed)
    const activePlantCount = await this.prisma.plant.count({
      where: {
        tenantId: context.tenantId,
        state: { notIn: ['harvested', 'destroyed'] },
      },
    });

    // Use the most restrictive permit limit
    const maxAllowed = Math.min(...permits.map(p => p.maxPlantCount!));
    const utilization = activePlantCount / maxAllowed;

    const atLimit = utilization >= BLOCK_THRESHOLD;
    const nearLimit = utilization >= WARN_THRESHOLD;

    return {
      ruleId: 'R008',
      ruleName: 'Production Limit Check',
      passed: !atLimit,
      severity: atLimit ? 'critical' : nearLimit ? 'warning' : 'info',
      description: atLimit
        ? `BLOCKED: ${activePlantCount}/${maxAllowed} active plants — at permit limit (100%)`
        : nearLimit
          ? `WARNING: ${activePlantCount}/${maxAllowed} active plants — ${(utilization * 100).toFixed(0)}% of permit limit`
          : `${activePlantCount}/${maxAllowed} active plants — within limits`,
      details: {
        activePlantCount,
        maxAllowed,
        utilizationPercent: (utilization * 100).toFixed(1),
        permitIds: permits.map(p => p.id),
      },
      suggestedAction: atLimit
        ? 'Cannot add plants — harvest or destroy existing plants first, or apply for permit amendment'
        : nearLimit
          ? 'Approaching production limit — plan harvests accordingly'
          : undefined,
      autoAction: atLimit
        ? { type: 'block_operation', params: { reason: 'production_limit_reached' } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R008', ruleName: 'Production Limit Check', passed: true, severity: 'info', description: 'No plant count limits on permits', details: {} };
  }
}
```

### R009 — Lab Result Frequency

**Type:** Batch (scheduled weekly)  
**Trigger:** Cron `0 4 * * 1` (4 AM Mondays)  
**Logic:** Flag batches older than 30 days without lab results. Auto-hold sales of untested batches.

```typescript
// lab-result-frequency.evaluator.ts
@Injectable()
export class LabResultFrequencyEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R009';
  readonly evaluationType = 'batch' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MAX_DAYS_WITHOUT_TEST = 30;
    const cutoff = new Date(Date.now() - MAX_DAYS_WITHOUT_TEST * 24 * 60 * 60 * 1000);

    // Find batches created > 30 days ago with no lab results
    const untestedBatches = await this.prisma.batch.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: { lte: cutoff },
        labResults: { none: {} },
      },
      select: {
        id: true,
        trackingId: true,
        createdAt: true,
        facility: { select: { name: true } },
      },
    });

    // Check if any untested batches have active sales
    const batchIdsWithSales = await this.prisma.sale.findMany({
      where: { batchId: { in: untestedBatches.map(b => b.id) } },
      select: { batchId: true },
      distinct: ['batchId'],
    });

    const batchesWithUntestedSales = new Set(batchIdsWithSales.map(s => s.batchId));

    return {
      ruleId: 'R009',
      ruleName: 'Lab Result Frequency',
      passed: untestedBatches.length === 0,
      severity: batchesWithUntestedSales.size > 0 ? 'critical' : (untestedBatches.length > 0 ? 'warning' : 'info'),
      description: untestedBatches.length === 0
        ? 'All batches have lab results within 30-day window'
        : `${untestedBatches.length} batch(es) overdue for lab testing (>${MAX_DAYS_WITHOUT_TEST} days). ${batchesWithUntestedSales.size} have active sales.`,
      details: {
        untestedBatches: untestedBatches.map(b => ({
          batchId: b.id,
          trackingId: b.trackingId,
          facility: b.facility.name,
          daysSinceCreation: Math.floor((Date.now() - b.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
          hasSales: batchesWithUntestedSales.has(b.id),
        })),
      },
      suggestedAction: untestedBatches.length > 0
        ? 'Submit lab samples immediately for overdue batches. Sales of untested batches should be suspended.'
        : undefined,
      autoAction: batchesWithUntestedSales.size > 0
        ? { type: 'hold_batch_sales', params: { batchIds: [...batchesWithUntestedSales] } }
        : undefined,
    };
  }
}
```

### R010 — Zone Capacity Check

**Type:** Real-time (on plant creation/move)  
**Trigger:** Fires on `POST /plants` and `PATCH /plants/:id` (zone change)  
**Logic:** Compare zone's current plant count vs `capacity`. Block if at capacity.

```typescript
// zone-capacity.evaluator.ts
@Injectable()
export class ZoneCapacityEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R010';
  readonly evaluationType = 'real_time' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    // context.metadata.zoneId must be provided by the calling service
    const zoneId = context.metadata?.zoneId;
    if (!zoneId) return this.pass();

    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      include: { facility: true },
    });

    if (!zone || !zone.capacity) return this.pass();

    const currentCount = await this.prisma.plant.count({
      where: {
        zoneId: zone.id,
        state: { notIn: ['harvested', 'destroyed'] },
      },
    });

    const utilization = currentCount / zone.capacity;
    const atCapacity = currentCount >= zone.capacity;
    const nearCapacity = utilization >= 0.90;

    return {
      ruleId: 'R010',
      ruleName: 'Zone Capacity Check',
      passed: !atCapacity,
      severity: atCapacity ? 'critical' : nearCapacity ? 'warning' : 'info',
      description: atCapacity
        ? `BLOCKED: Zone "${zone.name}" at capacity (${currentCount}/${zone.capacity} plants)`
        : nearCapacity
          ? `Zone "${zone.name}" nearly full (${currentCount}/${zone.capacity} — ${(utilization * 100).toFixed(0)}%)`
          : `Zone "${zone.name}" has space (${currentCount}/${zone.capacity})`,
      details: {
        zoneId: zone.id,
        zoneName: zone.name,
        facilityName: zone.facility.name,
        currentCount,
        capacity: zone.capacity,
        utilizationPercent: (utilization * 100).toFixed(1),
      },
      suggestedAction: atCapacity
        ? 'Move plants to a different zone or harvest existing plants'
        : undefined,
      autoAction: atCapacity
        ? { type: 'block_operation', params: { reason: 'zone_capacity_reached', zoneId } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R010', ruleName: 'Zone Capacity Check', passed: true, severity: 'info', description: 'No zone capacity constraint', details: {} };
  }
}
```

### R011 — Reporting Deadline Compliance

**Type:** Scheduled (monthly)  
**Trigger:** Cron `0 6 1 * *` (6 AM, 1st of each month)  
**Logic:** Check if operator submitted required monthly/quarterly reports. Flag overdue.

```typescript
// reporting-deadline.evaluator.ts
@Injectable()
export class ReportingDeadlineEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R011';
  readonly evaluationType = 'scheduled' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    // Check if operator has active permits requiring reports
    const activePermits = await this.prisma.permit.findMany({
      where: { tenantId: context.tenantId, status: 'active' },
      select: { id: true, permitType: true },
    });

    if (activePermits.length === 0) return this.pass();

    // Required reports: monthly production, quarterly compliance
    const requiredReports = [
      { type: 'monthly_production', period: previousMonth, deadline: `${currentMonth}-15` },
    ];

    // Quarterly: due in Jan, Apr, Jul, Oct
    const quarterMonths = [1, 4, 7, 10];
    if (quarterMonths.includes(now.getMonth() + 1)) {
      const prevQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth()) / 3) || 4}`;
      requiredReports.push({
        type: 'quarterly_compliance',
        period: prevQuarter,
        deadline: `${currentMonth}-30`,
      });
    }

    // Check which reports were submitted (look for audit events)
    const submittedReports = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: context.tenantId,
        eventType: { in: ['report.monthly_production.submitted', 'report.quarterly_compliance.submitted'] },
        createdAt: { gte: new Date(`${previousMonth}-01`) },
      },
    });

    const submittedTypes = new Set(submittedReports.map(r => r.eventType.replace('report.', '').replace('.submitted', '')));
    const overdue = requiredReports.filter(r => !submittedTypes.has(r.type) && new Date(r.deadline) < now);

    return {
      ruleId: 'R011',
      ruleName: 'Reporting Deadline Compliance',
      passed: overdue.length === 0,
      severity: overdue.length === 0 ? 'info' : 'warning',
      description: overdue.length === 0
        ? 'All required reports submitted on time'
        : `${overdue.length} overdue report(s): ${overdue.map(r => r.type).join(', ')}`,
      details: { requiredReports, overdue },
      suggestedAction: overdue.length > 0
        ? 'Submit overdue reports immediately to maintain compliance standing'
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R011', ruleName: 'Reporting Deadline Compliance', passed: true, severity: 'info', description: 'No active permits requiring reports', details: {} };
  }
}
```

### R012 — Destruction Compliance

**Type:** Real-time (on destruction event)  
**Trigger:** Fires on `POST /destructions`  
**Logic:** Verify at least 2 witnesses, photos attached, destruction method is approved.

```typescript
// destruction-compliance.evaluator.ts
@Injectable()
export class DestructionComplianceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R012';
  readonly evaluationType = 'real_time' as const;

  private readonly APPROVED_METHODS = [
    'incineration',
    'composting',
    'chemical_denaturation',
    'grinding_and_burial',
  ];

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const MIN_WITNESSES = 2;

    const destruction = await this.prisma.destructionEvent.findUnique({
      where: { id: context.entityId },
      include: { facility: true },
    });

    if (!destruction) {
      return { ruleId: 'R012', ruleName: 'Destruction Compliance', passed: false, severity: 'critical', description: 'Destruction event not found', details: {} };
    }

    const violations: string[] = [];

    // Check 1: Minimum witnesses
    const witnesses = (destruction.witnesses as string[]) || [];
    if (witnesses.length < MIN_WITNESSES) {
      violations.push(`Only ${witnesses.length} witness(es) — minimum ${MIN_WITNESSES} required`);
    }

    // Check 2: Photos attached
    const photoCount = (destruction.photos as string[])?.length || 0;
    if (photoCount === 0) {
      violations.push('No photos attached — photographic evidence is mandatory');
    }

    // Check 3: Approved destruction method
    if (!this.APPROVED_METHODS.includes(destruction.method)) {
      violations.push(`Destruction method "${destruction.method}" not approved — valid methods: ${this.APPROVED_METHODS.join(', ')}`);
    }

    // Check 4: Quantity > 0
    if (!destruction.quantityGrams || destruction.quantityGrams <= 0) {
      violations.push('Destruction quantity not specified or zero');
    }

    const passed = violations.length === 0;

    return {
      ruleId: 'R012',
      ruleName: 'Destruction Compliance',
      passed,
      severity: passed ? 'info' : 'critical',
      description: passed
        ? 'Destruction event compliant — method, witnesses, and evidence verified'
        : `Destruction event non-compliant: ${violations.length} violation(s)`,
      details: {
        destructionId: destruction.id,
        facilityName: destruction.facility.name,
        method: destruction.method,
        witnessCount: witnesses.length,
        photoCount,
        violations,
      },
      suggestedAction: !passed
        ? 'Remediate violations before destruction can be marked complete. Contact compliance officer.'
        : undefined,
      autoAction: !passed
        ? { type: 'block_operation', params: { reason: 'destruction_non_compliant', destructionId: destruction.id } }
        : undefined,
    };
  }
}
```

### R013 — Import/Export Balance

**Type:** Batch (scheduled monthly)  
**Trigger:** Cron `0 5 1 * *` (5 AM, 1st of each month)  
**Logic:** Cross-reference import/export records with INCB quotas. Flag if approaching limits.

```typescript
// import-export-balance.evaluator.ts
@Injectable()
export class ImportExportBalanceEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R013';
  readonly evaluationType = 'batch' as const;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const QUOTA_WARNING_THRESHOLD = 0.80; // Warn at 80% of INCB quota
    const currentYear = new Date().getFullYear();

    // Get all import/export records for the year
    const records = await this.prisma.importExportRecord.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: { gte: new Date(`${currentYear}-01-01`) },
      },
      select: {
        recordType: true,
        countryCode: true,
        quantityGrams: true,
        substanceType: true,
      },
    });

    // INCB quotas (would be in config/database in production)
    // These are South Africa's estimated annual requirements
    const INCB_QUOTAS: Record<string, number> = {
      cannabis_export_total_kg: 5000,    // Example quota
      cannabis_import_total_kg: 500,
    };

    const exportTotal = records
      .filter(r => r.recordType === 'export')
      .reduce((sum, r) => sum + r.quantityGrams, 0) / 1000; // Convert to kg

    const importTotal = records
      .filter(r => r.recordType === 'import')
      .reduce((sum, r) => sum + r.quantityGrams, 0) / 1000;

    const issues: { type: string; currentKg: number; quotaKg: number; utilization: number }[] = [];

    const exportQuota = INCB_QUOTAS.cannabis_export_total_kg;
    if (exportTotal / exportQuota > QUOTA_WARNING_THRESHOLD) {
      issues.push({
        type: 'export',
        currentKg: exportTotal,
        quotaKg: exportQuota,
        utilization: exportTotal / exportQuota,
      });
    }

    const importQuota = INCB_QUOTAS.cannabis_import_total_kg;
    if (importTotal / importQuota > QUOTA_WARNING_THRESHOLD) {
      issues.push({
        type: 'import',
        currentKg: importTotal,
        quotaKg: importQuota,
        utilization: importTotal / importQuota,
      });
    }

    return {
      ruleId: 'R013',
      ruleName: 'Import/Export Balance',
      passed: issues.length === 0,
      severity: issues.some(i => i.utilization > 0.95) ? 'critical' : (issues.length > 0 ? 'warning' : 'info'),
      description: issues.length === 0
        ? `Import/export volumes within INCB quotas (export: ${exportTotal.toFixed(0)}kg, import: ${importTotal.toFixed(0)}kg)`
        : `${issues.length} quota(s) approaching limits`,
      details: {
        exportTotalKg: exportTotal.toFixed(1),
        importTotalKg: importTotal.toFixed(1),
        year: currentYear,
        issues: issues.map(i => ({
          type: i.type,
          currentKg: i.currentKg.toFixed(1),
          quotaKg: i.quotaKg,
          utilizationPercent: (i.utilization * 100).toFixed(1),
        })),
      },
      suggestedAction: issues.length > 0
        ? 'Review import/export projections and coordinate with INCB for quota adjustment if needed'
        : undefined,
    };
  }
}
```

### R014 — Permit Activity Scope

**Type:** Real-time (on various operations)  
**Trigger:** Fires on `POST /plants`, `POST /batches`, `POST /sales`, `POST /transfers`  
**Logic:** Verify the operation being performed is within the permit's `authorizedActivities`. E.g., a cultivation-only permit cannot process/sell.

```typescript
// permit-activity-scope.evaluator.ts
@Injectable()
export class PermitActivityScopeEvaluator implements RuleEvaluator {
  readonly ruleCode = 'R014';
  readonly evaluationType = 'real_time' as const;

  // Map API operations to required permit activities
  private readonly OPERATION_ACTIVITY_MAP: Record<string, string> = {
    'plant.create': 'cultivation',
    'plant.update': 'cultivation',
    'harvest.create': 'cultivation',
    'batch.create': 'processing',
    'batch.process': 'processing',
    'sale.create': 'distribution', // or 'retail'
    'transfer.create': 'distribution',
    'import.create': 'import',
    'export.create': 'export',
    'research.activity': 'research',
  };

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const operation = context.metadata?.operation as string;
    if (!operation) return this.pass();

    const requiredActivity = this.OPERATION_ACTIVITY_MAP[operation];
    if (!requiredActivity) return this.pass();

    // Get operator's active permits
    const permits = await this.prisma.permit.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'active',
        expiryDate: { gte: new Date() },
      },
      select: { id: true, authorizedActivities: true, permitType: true },
    });

    if (permits.length === 0) {
      return {
        ruleId: 'R014',
        ruleName: 'Permit Activity Scope',
        passed: false,
        severity: 'critical',
        description: 'No active permits found — all operations blocked',
        details: { operation, requiredActivity },
        autoAction: { type: 'block_operation', params: { reason: 'no_active_permit' } },
      };
    }

    // Check if any permit authorizes this activity
    const authorized = permits.some(p =>
      (p.authorizedActivities as string[])?.includes(requiredActivity),
    );

    return {
      ruleId: 'R014',
      ruleName: 'Permit Activity Scope',
      passed: authorized,
      severity: authorized ? 'info' : 'critical',
      description: authorized
        ? `Operation "${operation}" authorized under permit activity "${requiredActivity}"`
        : `BLOCKED: Operation "${operation}" requires "${requiredActivity}" authorization — not in any active permit`,
      details: {
        operation,
        requiredActivity,
        permitActivities: permits.flatMap(p => (p.authorizedActivities as string[]) || []),
        permitCount: permits.length,
      },
      suggestedAction: !authorized
        ? `Apply for permit amendment to include "${requiredActivity}" authorization`
        : undefined,
      autoAction: !authorized
        ? { type: 'block_operation', params: { reason: 'unauthorized_activity', requiredActivity } }
        : undefined,
    };
  }

  private pass(): RuleEvaluationResult {
    return { ruleId: 'R014', ruleName: 'Permit Activity Scope', passed: true, severity: 'info', description: 'No scope check required', details: {} };
  }
}
```

### Rule Seed Data

```typescript
// packages/database/prisma/seed-compliance-rules.ts
const rules = [
  { name: 'R001', description: 'Permit Expiry Check', category: 'permit', severity: 'warning', evaluationType: 'scheduled' },
  { name: 'R002', description: 'THC Limit Enforcement', category: 'lab', severity: 'critical', evaluationType: 'real_time' },
  { name: 'R003', description: 'Inventory Variance Detection', category: 'inventory', severity: 'critical', evaluationType: 'batch' },
  { name: 'R004', description: 'Transfer Velocity Anomaly', category: 'transfer', severity: 'warning', evaluationType: 'real_time' },
  { name: 'R005', description: 'Verification Pattern Anomaly', category: 'verification', severity: 'warning', evaluationType: 'batch' },
  { name: 'R006', description: 'Wet-to-Dry Ratio Anomaly', category: 'production', severity: 'critical', evaluationType: 'real_time' },
  { name: 'R007', description: 'Mass Balance Check', category: 'inventory', severity: 'critical', evaluationType: 'batch' },
  { name: 'R008', description: 'Production Limit Check', category: 'production', severity: 'warning', evaluationType: 'real_time' },
  { name: 'R009', description: 'Lab Result Frequency', category: 'lab', severity: 'warning', evaluationType: 'batch' },
  { name: 'R010', description: 'Zone Capacity Check', category: 'production', severity: 'warning', evaluationType: 'real_time' },
  { name: 'R011', description: 'Reporting Deadline Compliance', category: 'permit', severity: 'warning', evaluationType: 'scheduled' },
  { name: 'R012', description: 'Destruction Compliance', category: 'inventory', severity: 'critical', evaluationType: 'real_time' },
  { name: 'R013', description: 'Import/Export Balance', category: 'transfer', severity: 'warning', evaluationType: 'batch' },
  { name: 'R014', description: 'Permit Activity Scope', category: 'permit', severity: 'critical', evaluationType: 'real_time' },
];
```

### Acceptance Criteria (per rule)
- [ ] Rule evaluator class implements `RuleEvaluator` interface
- [ ] Rule seeded in `compliance_rules` table
- [ ] Real-time rules fire on relevant API operations
- [ ] Batch/scheduled rules run via cron on defined schedule
- [ ] Failed evaluations create `ComplianceAlert` with correct severity
- [ ] Auto-actions execute for critical violations

---

## 3.5 Alert Escalation Service

**Priority:** P0
**Dependencies:** ComplianceAlert model, Notification model

### Escalation Workflow

```
Level 0: INFO    → In-app notification to facility manager
Level 1: WARNING → Email to operator admin + 48-hour resolution deadline
Level 2: CRITICAL → SMS to regulator + auto-suspend permit + 24-hour deadline
Level 3: EMERGENCY → Flag for ministerial review + law enforcement notification placeholder
```

### Implementation

```typescript
// apps/api/src/compliance/escalation/alert-escalation.service.ts
@Injectable()
export class AlertEscalationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async processNewAlert(alert: ComplianceAlert): Promise<void> {
    switch (alert.severity) {
      case 'info':
        await this.notifyFacilityManager(alert);
        break;
      case 'warning':
        await this.notifyOperatorAdmin(alert);
        await this.setResolutionDeadline(alert.id, 48);
        break;
      case 'critical':
        await this.notifyRegulator(alert);
        await this.notifyOperatorAdmin(alert);
        await this.setResolutionDeadline(alert.id, 24);
        break;
    }
  }

  /**
   * Cron job: escalate unresolved alerts past their deadline
   */
  @Cron('0 */1 * * *') // Every hour
  async escalateOverdueAlerts(): Promise<void> {
    const overdue = await this.prisma.complianceAlert.findMany({
      where: {
        status: { in: ['open', 'acknowledged'] },
        createdAt: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        escalationLevel: { lt: 3 },
      },
    });

    for (const alert of overdue) {
      await this.prisma.complianceAlert.update({
        where: { id: alert.id },
        data: { escalationLevel: alert.escalationLevel + 1 },
      });
      await this.processEscalation(alert, alert.escalationLevel + 1);
    }
  }

  private async processEscalation(alert: ComplianceAlert, newLevel: number): Promise<void> {
    if (newLevel >= 2) {
      // Auto-suspend permit for unresolved critical alerts
      const permits = await this.prisma.permit.findMany({
        where: { tenantId: alert.tenantId, status: 'active' },
      });
      for (const permit of permits) {
        await this.prisma.permit.update({
          where: { id: permit.id },
          data: { status: 'suspended' },
        });
      }
    }
    if (newLevel >= 3) {
      // Placeholder: flag for ministerial review
      await this.notificationService.sendToRole('super_admin', {
        type: 'critical',
        title: `EMERGENCY: Alert ${alert.id} escalated to Level 3`,
        body: `Unresolved compliance alert requires ministerial review.`,
      });
    }
  }

  private async setResolutionDeadline(alertId: string, hours: number): Promise<void> {
    // Store deadline in alert metadata for escalation cron to check
    await this.prisma.complianceAlert.update({
      where: { id: alertId },
      data: { 
        autoActions: { 
          resolutionDeadline: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() 
        } 
      },
    });
  }

  private async notifyFacilityManager(alert: ComplianceAlert): Promise<void> {
    // Find facility manager for this tenant/facility
    await this.notificationService.send({
      tenantId: alert.tenantId,
      role: 'operator_admin',
      type: 'info',
      title: `Compliance Notice: ${alert.alertType}`,
      body: alert.description,
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }

  private async notifyOperatorAdmin(alert: ComplianceAlert): Promise<void> {
    await this.notificationService.send({
      tenantId: alert.tenantId,
      role: 'operator_admin',
      type: 'warning',
      title: `Action Required: ${alert.alertType}`,
      body: alert.description,
      channel: 'email',
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }

  private async notifyRegulator(alert: ComplianceAlert): Promise<void> {
    await this.notificationService.sendToRole('regulator', {
      type: 'critical',
      title: `Critical Compliance Violation: ${alert.alertType}`,
      body: `Tenant ${alert.tenantId}: ${alert.description}`,
      channel: 'sms',
      entityType: 'compliance_alert',
      entityId: alert.id,
    });
  }
}
```

### Acceptance Criteria
- [ ] Info alerts → in-app notification only
- [ ] Warning alerts → email + 48h deadline
- [ ] Critical alerts → SMS to regulator + 24h deadline
- [ ] Overdue alerts auto-escalate hourly
- [ ] Level 2+ escalation auto-suspends permits
- [ ] Level 3 escalation flags for ministerial review

---

## 3.6 Compliance Scoring Service

**Priority:** P1
**Dependencies:** ComplianceAlert model

### Algorithm

```
ComplianceScore (0-100) = BaseScore (100) - Σ(penalty per open alert)

Penalty per severity:
  info     = 2 points
  warning  = 5 points
  critical = 15 points

Bonus:
  + 5 points if no alerts in last 30 days
  + 3 points if all lab results submitted on time
  + 2 points if all reports submitted before deadline

Minimum: 0, Maximum: 100

Thresholds:
  90-100 = "Excellent" (green badge)
  70-89  = "Good" (lime badge)
  50-69  = "Needs Improvement" (orange badge)
  25-49  = "At Risk" (red badge)
  0-24   = "Critical" (dark red, auto-escalate)
```

### API Contract

```
GET /api/v1/compliance/score/:tenantId
Headers: Authorization: Bearer {jwt}

Response 200:
{
  "tenantId": "uuid",
  "score": 82,
  "grade": "Good",
  "breakdown": {
    "baseScore": 100,
    "openAlertPenalty": -25,
    "bonusNoRecentAlerts": 0,
    "bonusLabTimeliness": 3,
    "bonusReportTimeliness": 2,
    "openAlerts": { "info": 1, "warning": 2, "critical": 1 }
  },
  "trend": [
    { "date": "2026-02-01", "score": 78 },
    { "date": "2026-02-08", "score": 80 },
    { "date": "2026-02-15", "score": 82 }
  ],
  "calculatedAt": "2026-02-21T10:00:00Z"
}
```

### Caching

Score is cached in Redis with key `compliance_score:{tenantId}`, TTL 10 minutes. Invalidated when a new alert is created or resolved.

### Acceptance Criteria
- [ ] Score calculated according to formula
- [ ] Cached in Redis, invalidated on alert changes
- [ ] Trend data shows weekly snapshots for last 12 weeks
- [ ] Score below 25 auto-generates critical escalation

---

## 3.7 Diversion Detection Service

**Priority:** P1
**Dependencies:** All existing modules (reads from plants, batches, transfers, lab-results, verification)

### 3.7.1 Mass Balance Algorithm

```typescript
/**
 * For each facility, compare:
 *   expected_inventory = Σ(harvested_weight) - Σ(sold) - Σ(transferred_out) - Σ(destroyed) - Σ(processing_loss_allowance)
 *   declared_inventory = Σ(batch.currentWeightGrams)
 *
 * Variance = |expected - declared| / expected * 100
 *
 * Thresholds:
 *   < 2%  → PASS
 *   2-5%  → WARNING (possible measurement error)
 *   5-10% → CRITICAL (possible diversion)
 *   > 10% → EMERGENCY (investigation required)
 */
```

### 3.7.2 Wet-to-Dry Ratio Analysis

```typescript
/**
 * Normal wet-to-dry ratio for cannabis: 3:1 to 5:1
 *
 * For each harvest:
 *   ratio = wetWeightGrams / dryWeightGrams
 *
 * Anomalies:
 *   ratio < 2.0 → CRITICAL (weight added — possible dilution or substitution)
 *   ratio > 7.0 → WARNING (excessive shrinkage — possible product skimming)
 *   ratio outside 2.5-6.0 → INFO (review recommended)
 *
 * Per-strain baseline: system maintains rolling average per strain
 * and flags individual harvests that deviate by > 2σ from strain mean.
 */
```

### 3.7.3 Transfer Velocity Detection

```typescript
/**
 * Track transfer frequency per operator:
 *   operator_transfer_rate = transfers_last_30_days / active_facilities
 *
 * Compare against system-wide mean and standard deviation.
 *   Anomaly if operator_rate > mean + 3σ
 *
 * Also flag:
 *   - Transfers to same receiver > 5 times in 7 days
 *   - Transfers at unusual hours (22:00-06:00 local time)
 *   - Transfers where sender and receiver share common ownership
 */
```

### 3.7.4 Verification Pattern Analysis

```typescript
/**
 * Analyze QR code verification scan patterns:
 *   - Frequency: > 20 scans of same QR in 24h → counterfeiting risk
 *   - Geography: scans > 500km apart within 12h → product in multiple cities
 *   - Source: > 50% scans from non-SA IPs → export diversion risk
 *   - Timing: correlate with known market hours vs suspicious patterns
 *
 * Scoring: each anomaly adds to a suspicion score (0-100)
 *   > 70 → auto-flag for investigation
 *   > 90 → auto-disable QR code + alert regulator
 */
```

### Acceptance Criteria
- [ ] All 4 algorithms implemented with configurable thresholds
- [ ] Batch job runs daily for mass balance and weekly for verification patterns
- [ ] Results feed into compliance scoring
- [ ] Anomalies create ComplianceAlerts with full details

---

## 3.8 Inventory Reconciliation Service

**Priority:** P1
**Dependencies:** InventorySnapshot model

### API Contract

```
POST /api/v1/compliance/inventory-reconciliation
Headers: Authorization: Bearer {jwt}
Body:
{
  "facilityId": "uuid",
  "items": [
    { "batchId": "uuid", "declaredGrams": 498.5 }
  ]
}

Response 200:
{
  "snapshotId": "uuid",
  "status": "flagged",
  "totalExpectedGrams": 505.0,
  "totalDeclaredGrams": 498.5,
  "variancePercent": 1.29,
  "items": [
    {
      "batchId": "uuid",
      "expectedGrams": 505.0,
      "declaredGrams": 498.5,
      "varianceGrams": -6.5,
      "variancePercent": -1.29,
      "status": "within_tolerance"
    }
  ]
}
```

### Business Logic

1. For each batch, calculate expected weight from chain of custody
2. Compare with operator-declared weight
3. Store snapshot in `inventory_snapshots` table
4. If total variance > 2%, set status = `flagged` and create ComplianceAlert
5. Monthly auto-reconciliation runs as cron job

### Acceptance Criteria
- [ ] Manual reconciliation via POST endpoint
- [ ] Automatic monthly reconciliation via cron
- [ ] Flagged snapshots create ComplianceAlerts
- [ ] Historical snapshots available for audit trail

---

## 3.9 Compliance API Endpoints

```
GET    /api/v1/compliance/rules                      ← List all rules (regulator only)
POST   /api/v1/compliance/rules                      ← Create/update rule (regulator only)
PATCH  /api/v1/compliance/rules/:id                  ← Toggle rule active/inactive
GET    /api/v1/compliance/alerts                      ← List alerts (filterable by severity, status, tenant)
GET    /api/v1/compliance/alerts/:id                  ← Alert detail
PATCH  /api/v1/compliance/alerts/:id                  ← Acknowledge/resolve alert
POST   /api/v1/compliance/alerts/:id/escalate         ← Manual escalation
GET    /api/v1/compliance/score/:tenantId             ← Compliance score
POST   /api/v1/compliance/inventory-reconciliation    ← Manual reconciliation
POST   /api/v1/compliance/evaluate/:tenantId          ← Manual full evaluation (regulator only)
GET    /api/v1/compliance/diversion-report/:tenantId  ← Diversion detection results
```

### Controller

```typescript
@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private complianceEngine: ComplianceEngine,
    private complianceScoreService: ComplianceScoreService,
    private inventoryService: InventoryReconciliationService,
    private diversionService: DiversionDetectorService,
  ) {}

  @Get('rules')
  @Roles('regulator', 'super_admin')
  async listRules() { ... }

  @Post('rules')
  @Roles('regulator', 'super_admin')
  async createRule(@Body() dto: CreateRuleDto) { ... }

  @Get('alerts')
  @Roles('regulator', 'super_admin', 'operator_admin')
  async listAlerts(@Query() filter: AlertFilterDto) { ... }

  @Patch('alerts/:id')
  async updateAlert(@Param('id') id: string, @Body() dto: UpdateAlertDto) { ... }

  @Get('score/:tenantId')
  async getScore(@Param('tenantId') tenantId: string) { ... }

  @Post('inventory-reconciliation')
  @Roles('operator_admin', 'operator_staff')
  async reconcileInventory(@Body() dto: InventorySnapshotDto) { ... }

  @Post('evaluate/:tenantId')
  @Roles('regulator', 'super_admin')
  async evaluateTenant(@Param('tenantId') tenantId: string) { ... }

  @Get('diversion-report/:tenantId')
  @Roles('regulator', 'super_admin')
  async getDiversionReport(@Param('tenantId') tenantId: string) { ... }
}
```

### Acceptance Criteria
- [ ] All 11 endpoints implemented with proper RBAC
- [ ] Regulators can view all tenants' compliance data
- [ ] Operators can only view their own compliance data
- [ ] Manual evaluation triggers all rules immediately

---

# Section 4: Audit Trail Completion

The existing `audit-lib` package (78 lines) implements hash-chaining with SHA-256 for tamper-evident logging. This section extends it to be production-complete.

## 4.1 Fix Hash-Chaining Consistency

**Priority:** P0
**Dependencies:** None
**Module:** `packages/audit-lib/`

### Current Issue

The permit status update in `regulatory.service.ts` uses a simple `prisma.auditEvent.create()` call that **bypasses** the `audit-lib` hash-chaining logic. All audit writes must go through the audit library.

### Fix

```typescript
// packages/audit-lib/src/audit.service.ts – current interface
@Injectable()
export class AuditService {
  async log(event: {
    tenantId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    before?: any;
    after?: any;
    ipAddress?: string;
  }): Promise<AuditEvent> {
    // 1. Get previous event hash (chain head)
    const previous = await this.prisma.auditEvent.findFirst({
      where: { tenantId: event.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Compute chain hash
    const payload = JSON.stringify({
      ...event,
      previousHash: previous?.chainHash || 'GENESIS',
      timestamp: new Date().toISOString(),
    });
    const chainHash = createHash('sha256').update(payload).digest('hex');

    // 3. Store event with chain hash
    return this.prisma.auditEvent.create({
      data: {
        ...event,
        previousHash: previous?.chainHash || 'GENESIS',
        chainHash,
        metadata: { ipAddress: event.ipAddress },
      },
    });
  }
}
```

### Required Changes

1. **`regulatory.service.ts`**: Replace direct `prisma.auditEvent.create()` with `auditService.log()`
2. **All controllers**: Ensure every state change calls `auditService.log()` with before/after snapshots
3. **New audit events** needed:

| Action | When | Data |
|---|---|---|
| `user.login` | Auth login | `{ ip, userAgent }` |
| `user.login_failed` | Auth login failure | `{ ip, email }` |
| `user.logout` | Auth logout | `{ ip }` |
| `user.created` | Registration | `{ newUserId, role }` |
| `user.password_changed` | Password change | `{ ip }` |
| `plant.created` | Plant registration | `{ trackingId, strainId }` |
| `plant.state_changed` | State transition | `{ before, after, reason }` |
| `plant.destroyed` | Plant destruction | `{ reason, witnessCount }` |
| `batch.created` | Harvest or manual | `{ sourceType, weight }` |
| `batch.weight_updated` | Weight change | `{ before, after }` |
| `harvest.created` | Harvest event | `{ plantCount, wetWeight }` |
| `lab_result.submitted` | Lab result | `{ batchId, passed }` |
| `transfer.created` | Transfer initiation | `{ from, to, items }` |
| `transfer.accepted` | Transfer receipt | `{ discrepancy }` |
| `transfer.rejected` | Transfer rejection | `{ reason }` |
| `sale.created` | Sale recorded | `{ quantity, amount }` |
| `permit.status_changed` | Status change | `{ before, after, reason }` |
| `inspection.created` | Inspection scheduled | `{ type, facilityId }` |
| `inspection.completed` | Inspection done | `{ outcome }` |
| `compliance_alert.created` | Alert fired | `{ ruleId, severity }` |
| `compliance_alert.resolved` | Alert resolved | `{ resolution }` |
| `destruction.recorded` | Destruction event | `{ method, quantity, witnesses }` |
| `data_export.requested` | POPIA request | `{ userId, requestType }` |
| `data_deletion.executed` | POPIA deletion | `{ userId, scope }` |
| `facility.created` | Facility registration | `{ name, type }` |
| `facility.updated` | Facility update | `{ before, after }` |

### Acceptance Criteria
- [ ] All state changes create audit events via `auditService.log()`
- [ ] No direct `prisma.auditEvent.create()` calls outside audit-lib
- [ ] Chain hash verified on read (tamper detection)
- [ ] 26 audit event types covered

---

## 4.2 Audit Chain Verification Endpoint

**Priority:** P1
**Dependencies:** 4.1

### API Contract

```
GET /api/v1/audit/verify?tenantId=uuid&from=2026-01-01&to=2026-02-21
Headers: Authorization: Bearer {jwt} (regulator only)

Response 200:
{
  "verified": true,
  "totalEvents": 1234,
  "firstEvent": "2026-01-15T08:00:00Z",
  "lastEvent": "2026-02-21T09:45:00Z",
  "brokenLinks": [],
  "verificationTime": "2.3s"
}

Response 200 (tampered):
{
  "verified": false,
  "totalEvents": 1234,
  "brokenLinks": [
    { "eventId": "uuid", "position": 456, "expectedHash": "abc...", "actualHash": "def..." }
  ]
}
```

### Business Logic

1. Fetch all audit events for tenant in date range, ordered by `createdAt`
2. For each event, recompute `chainHash` from payload + `previousHash`
3. Compare with stored `chainHash`
4. Report any broken links (tampered events)

### Acceptance Criteria
- [ ] Chain verification endpoint accessible to regulators
- [ ] Tampered events detected and reported with position
- [ ] Performance: < 5 seconds for 10,000 events

---

## 4.3 Audit Query & Export Endpoints

**Priority:** P1
**Dependencies:** 4.1

### API Contracts

```
GET /api/v1/audit?tenantId=uuid&entityType=plant&action=state_changed&page=1&limit=50
Headers: Authorization: Bearer {jwt}

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "action": "plant.state_changed",
      "entityType": "plant",
      "entityId": "uuid",
      "userId": "uuid",
      "before": { "state": "vegetative" },
      "after": { "state": "flowering" },
      "chainHash": "abc123...",
      "verified": true,
      "createdAt": "2026-02-21T08:00:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

```
GET /api/v1/audit/export?tenantId=uuid&from=2026-01-01&to=2026-02-21&format=csv
Headers: Authorization: Bearer {jwt}

Response 200: (CSV download)
Content-Type: text/csv
Content-Disposition: attachment; filename="audit-2026-01-01-to-2026-02-21.csv"
```

### Acceptance Criteria
- [ ] Paginated audit log with filters (entity type, action, date range, user)
- [ ] CSV export for compliance reporting
- [ ] Regulators see all tenants; operators see only their own
- [ ] Each returned event includes inline chain verification status

---

# Section 5: Event System & Notifications

## 5.1 Outbox Pattern Implementation

**Priority:** P1
**Dependencies:** Section 0 (OutboxEvent model), Redis
**Module:** New `apps/api/src/events/`

### Architecture

The Outbox Pattern ensures that domain events are reliably published even if the application crashes after a database write. Events are written to the `outbox_events` table in the same transaction as the domain operation, then a poller publishes them asynchronously.

```
┌─────────────┐   same transaction   ┌──────────────────┐
│ Service      │ ──────────────────── │ outbox_events    │
│ (e.g. plant  │                      │ (publishedAt=null│
│  .create())  │                      │  until polled)   │
└─────────────┘                       └────────┬─────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ OutboxPollerService  │
                                    │ (@Cron('*/5 * * *'))│
                                    │                      │
                                    │ 1. SELECT unpublished│
                                    │ 2. Emit to handlers  │
                                    │ 3. SET publishedAt   │
                                    └──────────┬──────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                    ┌─────────▼──┐   ┌────────▼────┐  ┌───────▼───────┐
                    │ Notification│   │ Compliance  │  │ Webhook       │
                    │ Handler    │   │ Engine      │  │ Dispatcher    │
                    └────────────┘   └─────────────┘  └───────────────┘
```

### Integration Point: Writing Events

```typescript
// Used within $transaction in services:
async createPlant(dto: CreatePlantDto, userId: string): Promise<Plant> {
  return this.prisma.$transaction(async (tx) => {
    const plant = await tx.plant.create({ data: { ... } });

    // Write event in same transaction — guaranteed consistency
    await tx.outboxEvent.create({
      data: {
        eventType: 'plant.created',
        aggregateType: 'plant',
        aggregateId: plant.id,
        payload: {
          trackingId: plant.trackingId,
          strainId: plant.strainId,
          facilityId: plant.facilityId,
          tenantId: plant.tenantId,
          createdBy: userId,
        },
      },
    });

    return plant;
  });
}
```

### Outbox Poller Service

```typescript
// apps/api/src/events/outbox-poller.service.ts
@Injectable()
export class OutboxPollerService {
  private readonly logger = new Logger(OutboxPollerService.name);

  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  @Cron('*/5 * * * * *') // Every 5 seconds
  async pollAndPublish(): Promise<void> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const event of events) {
      try {
        await this.eventBus.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      } catch (error) {
        this.logger.error(`Failed to publish event ${event.id}: ${error.message}`);
        // Event stays unpublished → will be retried next poll
      }
    }
  }
}
```

### Event Types

| Event Type | Trigger | Consumers |
|---|---|---|
| `plant.created` | Plant registration | Compliance (R008, R010, R014), Audit, Notification |
| `plant.state_changed` | State transition | Compliance (R008), Audit, Notification |
| `plant.destroyed` | Plant destruction | Compliance (R012, R007), Audit, Notification |
| `batch.created` | Harvest/manual batch | Compliance (R003, R007), Audit |
| `batch.weight_updated` | Weight adjustment | Compliance (R006, R007), Audit |
| `harvest.created` | New harvest | Compliance (R006), Audit, Notification |
| `lab_result.submitted` | Lab result entry | Compliance (R002, R009), Audit, Notification |
| `transfer.created` | Transfer initiation | Compliance (R004, R014), Audit, Notification |
| `transfer.accepted` | Transfer receipt | Compliance (R003, R004), Audit, Notification |
| `transfer.rejected` | Transfer rejection | Audit, Notification |
| `sale.created` | Sale recorded | Compliance (R003, R014), Audit, ExciseLedger |
| `permit.status_changed` | Permit update | Compliance (R001, R011), Audit, Notification |
| `inspection.completed` | Inspection done | Compliance scoring, Audit, Notification |
| `compliance_alert.created` | Alert fired | Escalation, Notification |
| `destruction.recorded` | Destruction event | Compliance (R012, R007), Audit, Notification |
| `user.login` | Successful auth | Audit |
| `user.login_failed` | Failed auth | Audit, Security (rate limiting) |
| `inventory.reconciled` | Reconciliation | Compliance (R003), Audit |

### Acceptance Criteria
- [ ] Events written in same transaction as domain operation
- [ ] Poller publishes unpublished events every 5 seconds
- [ ] Failed events retried automatically
- [ ] Published events marked with timestamp

---

## 5.2 Event Bus Service

**Priority:** P1
**Dependencies:** 5.1

### Implementation

```typescript
// apps/api/src/events/event-bus.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  async emit(eventType: string, payload: any): Promise<void> {
    this.logger.debug(`Emitting event: ${eventType}`);
    await this.eventEmitter.emitAsync(eventType, payload);
  }
}
```

### Event Handlers Registration

```typescript
// apps/api/src/events/event.module.ts
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,      // Allow 'plant.*' listeners
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [
    OutboxPollerService,
    EventBusService,
    // Event handlers:
    ComplianceEventHandler,
    NotificationEventHandler,
    AuditEventHandler,
  ],
  exports: [EventBusService],
})
export class EventModule {}
```

---

## 5.3 Notification Service

**Priority:** P1
**Dependencies:** Notification model, Redis, SES (email), SNS (SMS)
**Module:** New `apps/api/src/notifications/`

### Channels

| Channel | Provider | Use Case |
|---|---|---|
| In-app | Database + WebSocket (future) | All notifications |
| Email | AWS SES (production) / Mailpit (dev) | Warnings, reports |
| SMS | AWS SNS (production) / console.log (dev) | Critical alerts |
| Push | Future (Firebase FCM) | Mobile (Phase 3+) |

### Notification Service Implementation

```typescript
// apps/api/src/notifications/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async send(notification: {
    tenantId?: string;
    userId?: string;
    role?: string;
    type: string;
    title: string;
    body: string;
    channel?: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  }): Promise<void> {
    // Resolve target users
    let userIds: string[] = [];
    if (notification.userId) {
      userIds = [notification.userId];
    } else if (notification.role && notification.tenantId) {
      const users = await this.prisma.user.findMany({
        where: { tenantId: notification.tenantId, role: notification.role },
        select: { id: true },
      });
      userIds = users.map(u => u.id);
    }

    // Create in-app notifications
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: notification.type,
        channel: notification.channel || 'in_app',
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        actionUrl: notification.actionUrl,
      })),
    });

    // Send external notifications based on channel
    if (notification.channel === 'email') {
      await this.sendEmail(userIds, notification);
    }
    if (notification.channel === 'sms') {
      await this.sendSms(userIds, notification);
    }
  }

  async sendToRole(role: string, notification: Omit<Parameters<NotificationService['send']>[0], 'role'>): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { role },
      select: { id: true },
    });
    for (const user of users) {
      await this.send({ ...notification, userId: user.id });
    }
  }

  // In-app notification endpoints
  async getUnread(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async sendEmail(userIds: string[], notification: any): Promise<void> {
    // Production: AWS SES via @aws-sdk/client-ses
    // Development: Mailpit via nodemailer (smtp://localhost:1025)
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true, firstName: true },
    });
    // SES/Mailpit implementation
  }

  private async sendSms(userIds: string[], notification: any): Promise<void> {
    // Production: AWS SNS
    // Development: console.log
  }
}
```

### API Endpoints

```
GET    /api/v1/notifications              ← Unread notifications for current user
GET    /api/v1/notifications/all          ← All notifications (paginated)
PATCH  /api/v1/notifications/:id/read     ← Mark single notification as read
PATCH  /api/v1/notifications/read-all     ← Mark all notifications as read
GET    /api/v1/notifications/count        ← Unread count (for header badge)
```

### Acceptance Criteria
- [ ] In-app notifications created for all events
- [ ] Email sent for warnings and above
- [ ] SMS sent for critical alerts to regulators
- [ ] Unread count endpoint for header badge UI
- [ ] Mark read / mark all read endpoints
- [ ] Development mode uses Mailpit (already in Docker) instead of SES

---

## 5.4 Scheduled Jobs (Cron Tasks)

**Priority:** P1
**Dependencies:** All previous sections

### Job Registry

```typescript
// apps/api/src/scheduler/scheduler.service.ts
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private complianceEngine: ComplianceEngine,
    private alertEscalation: AlertEscalationService,
    private diversionDetector: DiversionDetectorService,
    private inventoryService: InventoryReconciliationService,
    private prisma: PrismaService,
  ) {}

  /**
   * Every 5 seconds: Poll outbox_events for unpublished events
   * (handled by OutboxPollerService)
   */

  /**
   * Every 5 minutes: Refresh dashboard materialized view
   */
  @Cron('*/5 * * * *')
  async refreshDashboardKpis(): Promise<void> {
    await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis');
    this.logger.debug('Dashboard KPIs refreshed');
  }

  /**
   * Every hour: Escalate overdue compliance alerts
   * (handled by AlertEscalationService.escalateOverdueAlerts)
   */

  /**
   * Daily at 02:00 SAST: Run batch compliance rules
   */
  @Cron('0 2 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyComplianceBatch(): Promise<void> {
    this.logger.log('Starting daily compliance batch evaluation');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.complianceEngine.evaluateBatch(tenant.id);
    }
    this.logger.log(`Daily compliance batch complete for ${tenants.length} tenants`);
  }

  /**
   * Daily at 03:00 SAST: Mass balance check for all facilities
   */
  @Cron('0 3 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyMassBalance(): Promise<void> {
    await this.diversionDetector.runMassBalanceCheck();
  }

  /**
   * Weekly on Monday 04:00 SAST: Verification pattern analysis
   */
  @Cron('0 4 * * 1', { timeZone: 'Africa/Johannesburg' })
  async weeklyVerificationAnalysis(): Promise<void> {
    await this.diversionDetector.runVerificationPatternAnalysis();
  }

  /**
   * Monthly on 1st at 01:00 SAST: Auto-reconcile all facility inventories
   */
  @Cron('0 1 1 * *', { timeZone: 'Africa/Johannesburg' })
  async monthlyInventoryReconciliation(): Promise<void> {
    await this.inventoryService.autoReconcileAll();
  }

  /**
   * Daily at 06:00 SAST: Check permit expirations
   */
  @Cron('0 6 * * *', { timeZone: 'Africa/Johannesburg' })
  async dailyPermitExpiryCheck(): Promise<void> {
    // Find permits expiring in 7 and 30 days, send notifications
    const expiringIn7 = await this.prisma.permit.findMany({
      where: {
        status: 'active',
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    // Notify operator admins
  }

  /**
   * Daily at 00:00 SAST: Clean up published outbox events > 30 days old
   */
  @Cron('0 0 * * *', { timeZone: 'Africa/Johannesburg' })
  async cleanupOutboxEvents(): Promise<void> {
    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        publishedAt: { not: null },
        createdAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    this.logger.log(`Cleaned up ${result.count} published outbox events`);
  }
}
```

### Job Schedule Summary

| Frequency | Time (SAST) | Job | Module |
|---|---|---|---|
| Every 5s | — | Outbox poller | Events |
| Every 5m | — | Dashboard KPI refresh | Scheduler |
| Every 1h | — | Alert escalation | Compliance |
| Daily | 02:00 | Batch compliance rules | Compliance |
| Daily | 03:00 | Mass balance check | Diversion |
| Daily | 06:00 | Permit expiry check | Regulatory |
| Daily | 00:00 | Outbox cleanup | Events |
| Weekly | Mon 04:00 | Verification analysis | Diversion |
| Monthly | 1st 01:00 | Auto-reconciliation | Inventory |

### Acceptance Criteria
- [ ] All 9 scheduled jobs registered and running
- [ ] Jobs use `Africa/Johannesburg` timezone
- [ ] Each job has error handling and logging
- [ ] Failed jobs do not block subsequent runs
- [ ] Job execution history available in logs

---

# Section 6: File Management & Document Generation

## 6.1 S3 File Storage Module

**Priority:** P1
**Dependencies:** AWS S3 (production), MinIO (development — already implied by Docker setup)
**Module:** New `apps/api/src/storage/`

### Directory Layout

```
apps/api/src/storage/
  storage.module.ts
  storage.service.ts
  storage.controller.ts
  dto/
    presigned-url.dto.ts
```

### Storage Service

```typescript
// apps/api/src/storage/storage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'af-south-1'),
      endpoint: config.get('S3_ENDPOINT'), // MinIO for dev
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', 'false') === 'true', // MinIO needs this
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.get('S3_BUCKET', 'ncts-documents');
  }

  /**
   * Generates a presigned URL for client-side upload.
   * Files are organized by: {tenantId}/{entityType}/{entityId}/{filename}
   */
  async getUploadUrl(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    filename: string;
    contentType: string;
    maxSizeBytes?: number;
  }): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `${params.tenantId}/${params.entityType}/${params.entityId}/${Date.now()}-${params.filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: params.contentType,
      Metadata: {
        'tenant-id': params.tenantId,
        'entity-type': params.entityType,
        'entity-id': params.entityId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min
    return { uploadUrl, fileKey };
  }

  /**
   * Generates a presigned download URL (1-hour expiry).
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    }));
  }
}
```

### S3 Bucket Structure

```
ncts-documents/
  {tenantId}/
    inspections/
      {inspectionId}/
        photo-001.jpg
        report.pdf
    destruction-events/
      {destructionId}/
        photo-001.jpg
        video.mp4
        witness-signature-001.png
    lab-results/
      {labResultId}/
        certificate.pdf
    transfers/
      {transferId}/
        manifest.pdf
    reports/
      export-2026-02.csv
      da260-return-2026-Q1.xml
```

### API Endpoints

```
POST   /api/v1/storage/presigned-upload     ← Get upload URL
POST   /api/v1/storage/presigned-download   ← Get download URL
DELETE /api/v1/storage/:fileKey              ← Delete file (admin only)
```

### Acceptance Criteria
- [ ] Presigned upload URLs generated with 5-minute expiry
- [ ] Files organized by tenant/entity/ID
- [ ] Presigned download URLs with 1-hour expiry
- [ ] Development uses MinIO (compatible S3 API)
- [ ] File metadata includes tenant ID for access control

---

## 6.2 PDF Report Generation

**Priority:** P1
**Dependencies:** 6.1 (S3 for storage)
**Module:** New `apps/api/src/reports/`

### Implementation Library

Use `@react-pdf/renderer` (already compatible with the React monorepo) or `puppeteer-core` for complex HTML→PDF conversion.

**Recommended:** `@react-pdf/renderer` for structured reports, `puppeteer-core` for inspection reports with photos.

### Report Types

| Report | Trigger | Format | Storage |
|---|---|---|---|
| Transfer Manifest | Transfer creation | PDF | S3 → transfer record |
| Inspection Report | Inspection completion | PDF | S3 → inspection record |
| Lab Certificate | Lab result submission | PDF | S3 → lab result record |
| Destruction Certificate | Destruction event | PDF | S3 → destruction record |
| Monthly Compliance Summary | Scheduled (1st of month) | PDF | S3 → tenant reports |
| SARS DA 260 Return | On-demand / quarterly | XML + PDF | S3 → regulatory exports |
| INCB Form C | On-demand / annual | PDF | S3 → regulatory exports |
| Audit Export | On-demand | CSV/PDF | S3 → tenant reports |

### Transfer Manifest Generator

```typescript
// apps/api/src/reports/generators/transfer-manifest.generator.ts
@Injectable()
export class TransferManifestGenerator {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private qrService: QrService, // from @ncts/qr-lib
  ) {}

  async generate(transferId: string): Promise<string> {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: { include: { batch: true } },
        senderFacility: true,
        receiverFacility: true,
      },
    });

    // Generate QR code for transfer verification
    const qrDataUrl = await this.qrService.generateQrDataUrl(transfer.transferNumber);

    // Generate PDF using template
    const pdfBuffer = await this.renderPdf({
      title: `Transfer Manifest — ${transfer.transferNumber}`,
      sender: transfer.senderFacility,
      receiver: transfer.receiverFacility,
      items: transfer.items,
      qrCode: qrDataUrl,
      date: transfer.createdAt,
      vehicle: transfer.vehicleRegistration,
      driver: transfer.driverName,
    });

    // Upload to S3
    const fileKey = `${transfer.tenantId}/transfers/${transfer.id}/manifest.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf');

    return fileKey;
  }
}
```

### Inspection Report Generator

```typescript
@Injectable()
export class InspectionReportGenerator {
  async generate(inspectionId: string): Promise<string> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { facility: true },
    });

    const pdfBuffer = await this.renderPdf({
      title: `Inspection Report — ${inspection.facility.name}`,
      inspector: { /* fetched from user table */ },
      date: inspection.completedDate,
      type: inspection.type,
      checklist: inspection.checklist,
      findings: inspection.findings,
      outcome: inspection.overallOutcome,
      photos: inspection.photos, // Embedded from S3
      remediationRequired: inspection.remediationRequired,
      remediationDeadline: inspection.remediationDeadline,
    });

    const fileKey = `${inspection.tenantId}/inspections/${inspection.id}/report.pdf`;
    await this.storageService.uploadBuffer(fileKey, pdfBuffer, 'application/pdf');

    // Update inspection record with report URL
    await this.prisma.inspection.update({
      where: { id: inspection.id },
      data: { reportUrl: fileKey },
    });

    return fileKey;
  }
}
```

### Acceptance Criteria
- [ ] Transfer manifests generated with QR code and chain-of-custody details
- [ ] Inspection reports include checklist, findings, photos, and outcome
- [ ] All PDFs stored in S3 and linked to source records
- [ ] PDF generation is non-blocking (runs after response is sent via event)

---

## 6.3 CSV/XML Export Service

**Priority:** P2
**Dependencies:** 6.1

### Export Formats

```typescript
// apps/api/src/reports/export.service.ts
@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService, private storageService: StorageService) {}

  /**
   * Generate CSV export of plants, batches, sales, etc.
   */
  async exportCsv(params: {
    tenantId: string;
    entityType: 'plants' | 'batches' | 'transfers' | 'sales' | 'audit_events';
    filters?: Record<string, any>;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<string> {
    // Query data based on entity type and filters
    // Convert to CSV using json2csv or similar
    // Upload to S3
    // Return download URL
  }

  /**
   * Generate SARS DA 260 XML return for excise duty reporting
   */
  async generateDa260Xml(tenantId: string, period: string): Promise<string> {
    const ledgerEntries = await this.prisma.exciseLedger.findMany({
      where: { tenantId, reportingPeriod: period },
      include: { rate: true },
    });

    const xml = this.buildDa260Xml(ledgerEntries);
    const fileKey = `${tenantId}/reports/da260-${period}.xml`;
    await this.storageService.uploadBuffer(fileKey, Buffer.from(xml), 'application/xml');
    return fileKey;
  }

  /**
   * Generate INCB Form C annual statistical return
   */
  async generateIncbFormC(year: number): Promise<string> {
    // Aggregate national-level statistics
    // Format according to INCB requirements
  }

  private buildDa260Xml(entries: any[]): string {
    // Build XML structure per SARS e-Filing specification
    return `<?xml version="1.0" encoding="UTF-8"?>
<DA260Return>
  <Header>
    <FormVersion>2.0</FormVersion>
    <TaxYear>${new Date().getFullYear()}</TaxYear>
    <ReturnType>Original</ReturnType>
  </Header>
  <CannabisExcise>
    ${entries.map(e => `
    <LineItem>
      <ProductCategory>${e.rate.productCategory}</ProductCategory>
      <Quantity>${e.quantity}</Quantity>
      <Unit>${e.unit}</Unit>
      <DutyRate>${e.rateApplied}</DutyRate>
      <DutyAmount>${e.dutyAmountZar}</DutyAmount>
    </LineItem>`).join('')}
  </CannabisExcise>
</DA260Return>`;
  }
}
```

### API Endpoints

```
POST   /api/v1/reports/export                       ← Generic CSV export
POST   /api/v1/reports/da260/:period                ← SARS DA 260 XML
POST   /api/v1/reports/incb-form-c/:year            ← INCB Form C
GET    /api/v1/reports/download/:fileKey             ← Download generated report
GET    /api/v1/reports/history                       ← Previously generated reports
```

### Acceptance Criteria
- [ ] CSV export for all major entity types
- [ ] SARS DA 260 XML matches e-Filing schema
- [ ] INCB Form C aggregates national statistics
- [ ] Downloaded by presigned URL, not direct file serving

---

# Section 7: Government Integration APIs

## 7.1 Inspection Module

**Priority:** P0 (Critical — page 4.9 in FrontEnd.md depends on this)
**Dependencies:** Section 0 (Inspection model), Section 1 (Auth/RBAC)
**Module:** New `apps/api/src/inspections/`

### Directory Layout

```
apps/api/src/inspections/
  inspections.module.ts
  inspections.controller.ts
  inspections.service.ts
  dto/
    create-inspection.dto.ts
    update-inspection.dto.ts
    complete-inspection.dto.ts
    inspection-filter.dto.ts
```

### API Contracts

```
POST   /api/v1/inspections                    ← Schedule inspection (regulator only)
GET    /api/v1/inspections                    ← List inspections (filterable)
GET    /api/v1/inspections/:id                ← Inspection detail
PATCH  /api/v1/inspections/:id                ← Update inspection (start, update checklist)
POST   /api/v1/inspections/:id/complete       ← Complete inspection with findings
POST   /api/v1/inspections/:id/photos         ← Upload photos (returns presigned URLs)
```

### Create Inspection DTO

```typescript
// apps/api/src/inspections/dto/create-inspection.dto.ts
import { IsUUID, IsEnum, IsDateString, IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInspectionDto {
  @ApiProperty()
  @IsUUID()
  facilityId: string;

  @ApiProperty({ enum: ['routine', 'complaint', 'follow_up', 'random'] })
  @IsEnum(['routine', 'complaint', 'follow_up', 'random'] as const)
  type: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'] as const)
  priority?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  estimatedDurationHrs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional inspector user IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalInspectors?: string[];
}
```

### Complete Inspection DTO

```typescript
export class CompleteInspectionDto {
  @ApiProperty({ enum: ['pass', 'conditional_pass', 'fail'] })
  @IsEnum(['pass', 'conditional_pass', 'fail'] as const)
  overallOutcome: string;

  @ApiPropertyOptional()
  @IsOptional()
  checklist?: Array<{
    item: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  remediationRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  remediationDeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remediationNotes?: string;
}
```

### Business Logic

```typescript
// apps/api/src/inspections/inspections.service.ts
@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationService: NotificationService,
    private reportGenerator: InspectionReportGenerator,
  ) {}

  async schedule(dto: CreateInspectionDto, inspectorId: string): Promise<Inspection> {
    const inspection = await this.prisma.inspection.create({
      data: {
        facilityId: dto.facilityId,
        inspectorId,
        type: dto.type,
        priority: dto.priority || 'medium',
        status: 'scheduled',
        scheduledDate: new Date(dto.scheduledDate),
        estimatedDurationHrs: dto.estimatedDurationHrs,
        reason: dto.reason,
        additionalInspectors: dto.additionalInspectors || [],
        tenantId: await this.getTenantForFacility(dto.facilityId),
      },
    });

    // Notify operator admin of upcoming inspection
    await this.notificationService.send({
      tenantId: inspection.tenantId,
      role: 'operator_admin',
      type: 'info',
      title: 'Inspection Scheduled',
      body: `A ${dto.type} inspection has been scheduled for ${dto.scheduledDate}`,
      entityType: 'inspection',
      entityId: inspection.id,
      channel: 'email',
    });

    await this.auditService.log({
      tenantId: inspection.tenantId,
      userId: inspectorId,
      entityType: 'inspection',
      entityId: inspection.id,
      action: 'inspection.created',
      after: { type: dto.type, scheduledDate: dto.scheduledDate },
    });

    return inspection;
  }

  async start(inspectionId: string, inspectorId: string): Promise<Inspection> {
    return this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'in_progress',
        actualStartDate: new Date(),
      },
    });
  }

  async complete(inspectionId: string, dto: CompleteInspectionDto, inspectorId: string): Promise<Inspection> {
    const inspection = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        overallOutcome: dto.overallOutcome,
        checklist: dto.checklist || [],
        findings: dto.findings,
        remediationRequired: dto.remediationRequired || false,
        remediationDeadline: dto.remediationDeadline ? new Date(dto.remediationDeadline) : null,
        remediationNotes: dto.remediationNotes,
      },
    });

    // Generate PDF report (async via event)
    await this.reportGenerator.generate(inspectionId);

    // If failed, create compliance alert
    if (dto.overallOutcome === 'fail') {
      // ComplianceAlert created via event system
    }

    // If remediation required, schedule follow-up inspection
    if (dto.remediationRequired && dto.remediationDeadline) {
      await this.schedule({
        facilityId: inspection.facilityId,
        type: 'follow_up',
        priority: 'high',
        scheduledDate: dto.remediationDeadline,
      }, inspectorId);
    }

    await this.auditService.log({
      tenantId: inspection.tenantId,
      userId: inspectorId,
      entityType: 'inspection',
      entityId: inspection.id,
      action: 'inspection.completed',
      after: { outcome: dto.overallOutcome, remediationRequired: dto.remediationRequired },
    });

    return inspection;
  }

  async listInspections(filter: InspectionFilterDto): Promise<PaginatedResponse<Inspection>> {
    const where: any = {};
    if (filter.facilityId) where.facilityId = filter.facilityId;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.inspectorId) where.inspectorId = filter.inspectorId;
    if (filter.dateFrom) where.scheduledDate = { ...where.scheduledDate, gte: new Date(filter.dateFrom) };
    if (filter.dateTo) where.scheduledDate = { ...where.scheduledDate, lte: new Date(filter.dateTo) };

    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip: ((filter.page || 1) - 1) * (filter.limit || 20),
        take: filter.limit || 20,
        orderBy: { scheduledDate: 'desc' },
        include: { facility: { select: { name: true, province: true } } },
      }),
      this.prisma.inspection.count({ where }),
    ]);

    return { data, total, page: filter.page || 1, limit: filter.limit || 20 };
  }
}
```

### Standard Inspection Checklist (Pre-loaded)

```json
[
  { "item": "Valid SAHPRA Section 22A permit displayed", "category": "documentation" },
  { "item": "Security measures in place (fencing, CCTV, access control)", "category": "security" },
  { "item": "All plants tagged with QR codes", "category": "tracking" },
  { "item": "Seed-to-sale records accessible and current", "category": "records" },
  { "item": "Environmental controls maintained (temp, humidity)", "category": "cultivation" },
  { "item": "Waste disposal procedures documented", "category": "waste" },
  { "item": "Staff training records up to date", "category": "personnel" },
  { "item": "Pesticide application records maintained", "category": "cultivation" },
  { "item": "Lab testing results for all active batches", "category": "lab" },
  { "item": "Inventory counts match system records", "category": "inventory" },
  { "item": "Transfer manifest records complete", "category": "transfers" },
  { "item": "Restricted area access properly controlled", "category": "security" },
  { "item": "Fire safety equipment present and current", "category": "safety" },
  { "item": "No unauthorized varieties or strains", "category": "compliance" },
  { "item": "Destruction records complete with witness signatures", "category": "waste" }
]
```

### Acceptance Criteria
- [ ] Inspections schedulable by regulators only
- [ ] Full lifecycle: scheduled → in_progress → completed/cancelled
- [ ] Checklist with per-item pass/fail/NA and notes
- [ ] PDF report auto-generated on completion
- [ ] Failed inspections create compliance alerts
- [ ] Remediation triggers follow-up inspection
- [ ] Photo upload via presigned S3 URLs
- [ ] Operator notified of scheduled inspections via email

---

## 7.2 Destruction & Disposal Module

**Priority:** P1
**Dependencies:** Section 0 (DestructionEvent model), Section 7.1 (related workflow)
**Module:** New `apps/api/src/destruction/`

### API Contracts

```
POST   /api/v1/destruction                      ← Record destruction event
GET    /api/v1/destruction                      ← List destruction events
GET    /api/v1/destruction/:id                  ← Destruction detail
POST   /api/v1/destruction/:id/approve          ← Regulator approval (post-facto)
```

### Create Destruction DTO

```typescript
export class CreateDestructionDto {
  @ApiProperty()
  @IsUUID()
  facilityId: string;

  @ApiProperty({ enum: ['plant', 'batch'] })
  @IsEnum(['plant', 'batch'] as const)
  entityType: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  entityIds: string[];

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  @Min(0.01)
  quantityKg: number;

  @ApiProperty({ enum: ['incineration', 'grinding', 'composting'] })
  @IsEnum(['incineration', 'grinding', 'composting'] as const)
  destructionMethod: string;

  @ApiProperty()
  @IsDateString()
  destructionDate: string;

  @ApiProperty({ type: [String], minItems: 2 })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2, { message: 'At least 2 witnesses required' })
  witnessNames: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  witnessOrganizations: string[];

  @ApiProperty({ enum: ['failed_lab', 'expired', 'damaged', 'regulatory_order', 'excess'] })
  @IsEnum(['failed_lab', 'expired', 'damaged', 'regulatory_order', 'excess'] as const)
  reason: string;
}
```

### Business Logic

1. Validate all entity IDs exist and belong to the operator's tenant
2. Ensure at least 2 witnesses (SA regulatory requirement)
3. Update plant/batch status to `destroyed`
4. Create audit event with full chain of custody details
5. Fire compliance engine R012 (Destruction Compliance) check
6. Auto-notify regulator of destruction events > 10 kg
7. Update mass balance calculations

### Acceptance Criteria
- [ ] Destruction events require minimum 2 witnesses
- [ ] Destroyed entities updated to `destroyed` status
- [ ] Photos and video links stored via S3
- [ ] Witness signatures stored via S3
- [ ] Regulator notified for large destructions
- [ ] Destruction certificate PDF auto-generated

---

## 7.3 Import/Export Module

**Priority:** P2
**Dependencies:** Section 0 (ImportExportRecord model)
**Module:** New `apps/api/src/import-export/`

### API Contracts

```
POST   /api/v1/import-export                  ← Create record
GET    /api/v1/import-export                  ← List records
GET    /api/v1/import-export/:id              ← Record detail
PATCH  /api/v1/import-export/:id/status       ← Update status
```

### Business Logic

1. Verify operator has valid import/export permit
2. Cross-reference with INCB quotas (country-level)
3. Track customs documentation
4. Auto-calculate excise duty for exports
5. Create audit event

### Acceptance Criteria
- [ ] Import/export records linked to permits and batches
- [ ] INCB quota tracking per country
- [ ] Status workflow: pending → in_transit → completed/cancelled

---

## 7.4 Regulatory Dashboard API Enhancements

**Priority:** P1
**Dependencies:** All modules
**Module:** `apps/api/src/regulatory/`

### New Endpoints

```
GET /api/v1/regulatory/dashboard/kpis                     ← Cached KPIs from materialized view
GET /api/v1/regulatory/dashboard/compliance-overview       ← All operators' compliance scores
GET /api/v1/regulatory/dashboard/alert-summary             ← Alert counts by severity/status
GET /api/v1/regulatory/dashboard/inspection-calendar       ← Upcoming/recent inspections
GET /api/v1/regulatory/dashboard/production-trends         ← Plant/harvest/sales over time
GET /api/v1/regulatory/dashboard/geographic                ← Facility/plant distribution by province
GET /api/v1/regulatory/operators/:tenantId/drill-down      ← Deep-dive on single operator
GET /api/v1/regulatory/reports/national-summary            ← Monthly/quarterly/annual summaries
```

### KPIs Endpoint (from Materialized View)

```typescript
@Get('dashboard/kpis')
@Roles('regulator', 'super_admin')
async getDashboardKpis(): Promise<DashboardKpis> {
  // Try cache first
  const cached = await this.cache.get('dashboard_kpis');
  if (cached) return cached;

  // Fall back to materialized view
  const [kpi] = await this.prisma.$queryRaw<[DashboardKpis]>`
    SELECT * FROM mv_dashboard_kpis
  `;

  // Supplement with live counts
  const alertCounts = await this.prisma.complianceAlert.groupBy({
    by: ['severity'],
    where: { status: 'open' },
    _count: true,
  });

  const result = {
    ...kpi,
    openAlerts: {
      info: alertCounts.find(a => a.severity === 'info')?._count || 0,
      warning: alertCounts.find(a => a.severity === 'warning')?._count || 0,
      critical: alertCounts.find(a => a.severity === 'critical')?._count || 0,
    },
  };

  await this.cache.set('dashboard_kpis', result, 300); // 5 min cache
  return result;
}
```

### Operator Drill-Down

```typescript
@Get('operators/:tenantId/drill-down')
@Roles('regulator', 'super_admin')
async operatorDrillDown(@Param('tenantId') tenantId: string): Promise<OperatorDrillDown> {
  const [tenant, facilities, permits, complianceScore, recentAlerts, recentInspections] = await Promise.all([
    this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    this.prisma.facility.findMany({ where: { tenantId } }),
    this.prisma.permit.findMany({ where: { tenantId } }),
    this.complianceScoreService.getScore(tenantId),
    this.prisma.complianceAlert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    this.prisma.inspection.findMany({
      where: { tenantId },
      orderBy: { scheduledDate: 'desc' },
      take: 5,
    }),
  ]);

  // Aggregate stats
  const [plantCounts, batchCounts, transferCounts, saleCounts] = await Promise.all([
    this.prisma.plant.groupBy({
      by: ['state'],
      where: { tenantId },
      _count: true,
    }),
    this.prisma.batch.count({ where: { tenantId } }),
    this.prisma.transfer.count({ where: { tenantId } }),
    this.prisma.sale.aggregate({
      where: { tenantId },
      _sum: { totalPriceZar: true, quantityGrams: true },
    }),
  ]);

  return {
    tenant,
    facilities,
    permits,
    complianceScore,
    recentAlerts,
    recentInspections,
    stats: { plantCounts, batchCounts, transferCounts, saleCounts },
  };
}
```

### Acceptance Criteria
- [ ] Dashboard KPIs served from materialized view with Redis cache
- [ ] Compliance overview shows all operator scores in table/map form
- [ ] Operator drill-down aggregates all relevant data
- [ ] Geographic endpoint returns province-level statistics
- [ ] All endpoints regulator-only

### 7.4.1 Municipal-Level Dashboard Aggregation

**Context:** South African municipalities regulate local business licenses for cannabis retail and distribution. DTIC hemp industrial permits also require municipal coordination.

**Additional Endpoints:**

```
GET /api/v1/regulatory/dashboard/municipal-summary            ← Aggregated stats per municipality
GET /api/v1/regulatory/dashboard/municipal/:municipalityCode  ← Drill-down for a specific municipality
```

**Municipal Summary Endpoint:**

```typescript
@Get('dashboard/municipal-summary')
@Roles('regulator', 'super_admin')
async getMunicipalSummary(): Promise<MunicipalSummary[]> {
  // Group facilities by municipality (derived from geolocation or address province + town)
  const facilities = await this.prisma.facility.findMany({
    select: {
      id: true,
      province: true,
      address: true,
      municipalLicenseNumber: true,
      municipalLicenseExpiry: true,
      isActive: true,
      tenant: { select: { id: true, name: true } },
      _count: { select: { plants: true, inspections: true } },
    },
  });

  // Aggregate by municipality (extracted from address or future municipality field)
  const byMunicipality = this.aggregateByMunicipality(facilities);

  return byMunicipality.map(m => ({
    municipalityName: m.name,
    province: m.province,
    facilityCount: m.facilities.length,
    activeLicenses: m.facilities.filter(f => f.municipalLicenseNumber).length,
    expiredLicenses: m.facilities.filter(f =>
      f.municipalLicenseExpiry && f.municipalLicenseExpiry < new Date()
    ).length,
    totalPlants: m.totalPlants,
    dticHempFacilities: m.facilities.filter(f =>
      f.tenant?.permits?.some(p => p.permitType === 'dtic_hemp_industrial')
    ).length,
  }));
}
```

**Acceptance Criteria:**
- [ ] Municipal summary aggregates facilities grouped by municipality
- [ ] Expired/missing municipal license counts surfaced for regulatory enforcement
- [ ] DTIC hemp industrial facilities identifiable per municipality

---

## 7.5 QR Code Verification Enhancement

**Priority:** P1
**Dependencies:** Existing `apps/api/src/verification/`, `packages/qr-lib/`
**Module:** `apps/api/src/verification/`

### Current State

The verification module has `verify(trackingId)` which returns plant details. It works but:
1. Uses `require()` (CommonJS) for qr-lib instead of ESM import
2. No scan logging (can't detect verification anomalies)
3. No geographic/IP tracking

### Enhancements

```typescript
// apps/api/src/verification/verification.service.ts
@Injectable()
export class VerificationService {
  async verify(trackingId: string, metadata?: {
    ip?: string;
    userAgent?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<VerificationResult> {
    // 1. Existing: resolve tracking ID to plant/batch
    const entity = await this.resolveEntity(trackingId);
    if (!entity) throw new NotFoundException('Entity not found');

    // 2. NEW: Log scan event
    await this.prisma.outboxEvent.create({
      data: {
        eventType: 'verification.scanned',
        aggregateType: entity.type,
        aggregateId: entity.id,
        payload: {
          trackingId,
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
          location: metadata?.latitude
            ? { lat: metadata.latitude, lng: metadata.longitude }
            : null,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 3. Existing: build chain of custody
    const chainOfCustody = await this.buildChainOfCustody(entity);

    // 4. NEW: include lab results
    const labResults = entity.type === 'batch'
      ? await this.prisma.labResult.findFirst({
          where: { batchId: entity.id },
          orderBy: { testDate: 'desc' },
        })
      : null;

    return {
      valid: true,
      entity: entity.data,
      type: entity.type,
      chainOfCustody,
      labResults: labResults ? {
        thcPercent: labResults.thcPercent,
        cbdPercent: labResults.cbdPercent,
        testDate: labResults.testDate,
        allTestsPassed: labResults.pesticidesFree && labResults.heavyMetalsFree
          && labResults.microbialFree && labResults.mycotoxinsFree,
      } : null,
      verifiedAt: new Date().toISOString(),
    };
  }
}
```

### Public Suspicious Activity Endpoint

```
POST /api/v1/verify/report-suspicious
Body:
{
  "trackingId": "NCTS-ZA-2026-000001",
  "reason": "Product appears counterfeit — label doesn't match scan",
  "reporterContact": "+27821234567",
  "location": { "lat": -33.92, "lng": 18.42 }
}

Response 200:
{ "reportId": "uuid", "message": "Report submitted. Case reference: SUS-2026-001" }
```

### Acceptance Criteria
- [ ] Verification scans logged with IP and location
- [ ] Lab results included in verification response
- [ ] CommonJS `require()` replaced with ESM import
- [ ] Public suspicious activity reporting endpoint
- [ ] Suspicious reports viewable by regulators

---

## 7.6 QR Code Generation Module

**Priority:** P1
**Dependencies:** `packages/qr-lib/`, Batch module, Plant module
**Module:** New `apps/api/src/qr/`
**Reference:** Plan.md Phase 4.1 — QR code generation and label printing

### Why This Section

Plan.md Phase 4.1 explicitly requires QR code generation for batch labels and plant tags. The existing `packages/qr-lib/` provides encoding/decoding utilities, but no API endpoints exist for generating QR images, bulk label production, or printable Avery labels.

### Directory Layout

```
apps/api/src/qr/
  qr.module.ts
  qr.controller.ts
  qr.service.ts
  dto/
    generate-qr.dto.ts
    bulk-qr.dto.ts
  templates/
    avery-label.hbs          ← Handlebars template for Avery 5160 labels
```

### API Contracts

```
GET  /api/v1/qr/:batchId              ← Generate QR code SVG for a single batch
GET  /api/v1/qr/:batchId/label        ← Generate printable Avery label PDF
POST /api/v1/qr/bulk                  ← Bulk generate QR labels (up to 100 per request)
```

### Controller

```typescript
// apps/api/src/qr/qr.controller.ts
import { Controller, Get, Post, Param, Body, Res, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BulkQrDto } from './dto/bulk-qr.dto';

@ApiTags('QR Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get(':batchId')
  @Roles('operator_admin', 'operator_user', 'regulator')
  @ApiProduces('image/svg+xml')
  async generateQrSvg(
    @Param('batchId') batchId: string,
    @Query('size') size: number = 256,
    @Res() res: Response,
  ): Promise<void> {
    const svg = await this.qrService.generateBatchQrSvg(batchId, size);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.send(svg);
  }

  @Get(':batchId/label')
  @Roles('operator_admin', 'operator_user')
  @ApiProduces('application/pdf')
  async generateLabel(
    @Param('batchId') batchId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.qrService.generateAveryLabel(batchId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label-${batchId}.pdf"`);
    res.send(pdf);
  }

  @Post('bulk')
  @Roles('operator_admin')
  async generateBulkLabels(
    @Body() dto: BulkQrDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.qrService.generateBulkLabels(dto.batchIds);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-labels.pdf"');
    res.send(pdf);
  }
}
```

### DTOs

```typescript
// apps/api/src/qr/dto/bulk-qr.dto.ts
import { IsArray, ArrayMinSize, ArrayMaxSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkQrDto {
  @ApiProperty({ description: 'Array of batch UUIDs to generate labels for (max 100)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  batchIds: string[];
}
```

### Service

```typescript
// apps/api/src/qr/qr.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@ncts/database';
import { QrCodeGenerator } from '@ncts/qr-lib';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrGenerator: QrCodeGenerator,
  ) {}

  async generateBatchQrSvg(batchId: string, size = 256): Promise<string> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { facility: { include: { tenant: true } } },
    });

    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    // Encode verification URL into QR code
    const verificationUrl = `${process.env.VERIFY_APP_URL}/verify/${batch.trackingId}`;

    return this.qrGenerator.toSvg(verificationUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H', // High — allows 30% damage tolerance
    });
  }

  async generateAveryLabel(batchId: string): Promise<Buffer> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        facility: { include: { tenant: true } },
        labResults: { orderBy: { testDate: 'desc' }, take: 1 },
      },
    });

    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    const qrSvg = await this.generateBatchQrSvg(batchId, 120);
    const labResult = batch.labResults?.[0];

    // Generate Avery 5160 label (2.625" × 1", 30 per sheet)
    const doc = new PDFDocument({ size: [189, 72] }); // points: 2.625" × 1"
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    // QR code on left (72×72 points = 1" square)
    doc.image(Buffer.from(qrSvg), 4, 4, { width: 64, height: 64 });

    // Text on right
    doc.fontSize(6)
      .text(batch.trackingId, 72, 6, { width: 110 })
      .text(batch.facility.tenant.name, 72, 16, { width: 110 })
      .text(batch.batchType || 'Cannabis', 72, 26, { width: 110 });

    if (labResult) {
      doc.text(`THC: ${labResult.thcPercent}% | CBD: ${labResult.cbdPercent}%`, 72, 36, { width: 110 });
    }

    doc.fontSize(5)
      .text(`Weight: ${batch.processedWeightGrams || batch.dryWeightGrams || '—'}g`, 72, 48, { width: 110 })
      .text(`Batch: ${batch.createdAt.toISOString().slice(0, 10)}`, 72, 56, { width: 110 });

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
  }

  async generateBulkLabels(batchIds: string[]): Promise<Buffer> {
    // Generate multi-page PDF with 30 labels per page (Avery 5160 layout)
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const LABELS_PER_ROW = 3;
    const LABELS_PER_COL = 10;
    const LABEL_WIDTH = 189;  // 2.625" in points
    const LABEL_HEIGHT = 72;  // 1" in points
    const X_GAP = 9;          // ~0.125" gap
    const Y_GAP = 0;

    for (let i = 0; i < batchIds.length; i++) {
      const pageIndex = Math.floor(i / (LABELS_PER_ROW * LABELS_PER_COL));
      const posOnPage = i % (LABELS_PER_ROW * LABELS_PER_COL);
      const col = posOnPage % LABELS_PER_ROW;
      const row = Math.floor(posOnPage / LABELS_PER_ROW);

      if (i > 0 && posOnPage === 0) doc.addPage();

      const x = 36 + col * (LABEL_WIDTH + X_GAP);
      const y = 36 + row * (LABEL_HEIGHT + Y_GAP);

      const batch = await this.prisma.batch.findUnique({
        where: { id: batchIds[i] },
        include: { facility: { include: { tenant: true } } },
      });

      if (!batch) continue;

      const verificationUrl = `${process.env.VERIFY_APP_URL}/verify/${batch.trackingId}`;
      const qrSvg = this.qrGenerator.toSvg(verificationUrl, { width: 60, margin: 1, errorCorrectionLevel: 'H' });

      doc.save();
      doc.rect(x, y, LABEL_WIDTH, LABEL_HEIGHT).stroke('#eee');
      doc.image(Buffer.from(qrSvg), x + 4, y + 4, { width: 60, height: 60 });
      doc.fontSize(6)
        .text(batch.trackingId, x + 68, y + 6, { width: 115 })
        .text(batch.facility.tenant.name, x + 68, y + 18, { width: 115 })
        .text(`Created: ${batch.createdAt.toISOString().slice(0, 10)}`, x + 68, y + 30, { width: 115 });
      doc.restore();
    }

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
  }
}
```

### Module Registration

```typescript
// apps/api/src/qr/qr.module.ts
import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { QrLibModule } from '@ncts/qr-lib';
import { DatabaseModule } from '@ncts/database';

@Module({
  imports: [DatabaseModule, QrLibModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
```

### Integration with `@ncts/qr-lib`

The existing `packages/qr-lib/` exports a `QrCodeGenerator` class. This module wires it into the NestJS DI system and adds:
- Batch context resolution (tracking ID → verification URL)
- PDF label generation (depends on `pdfkit` — add to `apps/api/package.json`)
- Bulk generation with rate limiting (100 batches max)

### Acceptance Criteria
- [ ] `GET /qr/:batchId` returns SVG QR code with verification URL encoded
- [ ] `GET /qr/:batchId/label` returns Avery 5160-format PDF label with QR + batch metadata
- [ ] `POST /qr/bulk` generates multi-page PDF with up to 100 labels
- [ ] QR codes use error correction level H (30% damage tolerance)
- [ ] Labels include tracking ID, operator name, THC/CBD%, weight, and date
- [ ] Integration with `@ncts/qr-lib` for encoding

---

## 7.7 Mobile Sync API

**Priority:** P2
**Dependencies:** Section 1 (Auth), Section 2 (DTOs), Section 4 (Audit)
**Module:** New `apps/api/src/sync/`
**Reference:** Plan.md Phase 5.3 — WatermelonDB sync with conflict resolution

### Why This Section

Plan.md Phase 5.3 specifies a mobile/tablet app using WatermelonDB for offline-first operation. Field inspectors and operators need to record plants, harvests, and inspections while offline in rural areas (common in SA's Eastern Cape, Limpopo, and Northern Cape provinces where connectivity is unreliable). This sync API enables WatermelonDB's pull/push synchronization protocol.

### Directory Layout

```
apps/api/src/sync/
  sync.module.ts
  sync.controller.ts
  sync.service.ts
  dto/
    sync-push.dto.ts
    sync-pull.dto.ts
  strategies/
    plant-sync.strategy.ts
    batch-sync.strategy.ts
    harvest-sync.strategy.ts
    inspection-sync.strategy.ts
    sale-sync.strategy.ts
```

### API Contracts

```
POST /api/v1/sync/push               ← Push local changes to server
GET  /api/v1/sync/pull?since={ts}     ← Pull changes since last sync timestamp
GET  /api/v1/sync/reference-data      ← Pull read-only reference data (cultivars, zones, compliance rules)
```

### Push Endpoint

```typescript
// apps/api/src/sync/sync.controller.ts
@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @Roles('operator_admin', 'operator_user', 'inspector')
  async pushChanges(
    @Body() dto: SyncPushDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SyncPushResponse> {
    return this.syncService.pushChanges(user.tenantId, user.sub, dto);
  }

  @Get('pull')
  @Roles('operator_admin', 'operator_user', 'inspector')
  async pullChanges(
    @Query('since') since: string,         // ISO 8601 timestamp
    @Query('tables') tables?: string,       // Comma-separated: 'plants,batches,harvests'
    @CurrentUser() user: JwtPayload,
  ): Promise<SyncPullResponse> {
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid "since" timestamp — use ISO 8601 format');
    }
    const tableList = tables?.split(',').map(t => t.trim()) || ['plants', 'batches', 'harvests', 'inspections', 'sales'];
    return this.syncService.pullChanges(user.tenantId, sinceDate, tableList);
  }

  @Get('reference-data')
  @Roles('operator_admin', 'operator_user', 'inspector')
  async getReferenceData(): Promise<ReferenceDataResponse> {
    return this.syncService.getReferenceData();
  }
}
```

### Push DTO (WatermelonDB Format)

```typescript
// apps/api/src/sync/dto/sync-push.dto.ts
import { IsArray, IsOptional, ValidateNested, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SyncChangeRecord {
  @ApiProperty()
  @IsString()
  id: string;  // WatermelonDB local ID

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _serverId?: string;  // Server UUID (for updates/deletes)

  @ApiProperty()
  payload: Record<string, any>;
}

class SyncTableChanges {
  @ApiProperty({ type: [SyncChangeRecord] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeRecord)
  created: SyncChangeRecord[];

  @ApiProperty({ type: [SyncChangeRecord] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeRecord)
  updated: SyncChangeRecord[];

  @ApiProperty({ description: 'Array of server IDs to mark as deleted' })
  @IsArray()
  @IsString({ each: true })
  deleted: string[];
}

export class SyncPushDto {
  @ApiProperty({ description: 'Last successful pull timestamp' })
  @IsDateString()
  lastPulledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTableChanges)
  plants?: SyncTableChanges;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTableChanges)
  batches?: SyncTableChanges;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTableChanges)
  harvests?: SyncTableChanges;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTableChanges)
  inspections?: SyncTableChanges;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTableChanges)
  sales?: SyncTableChanges;
}
```

### Sync Service (Conflict Resolution)

```typescript
// apps/api/src/sync/sync.service.ts
@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Push changes from mobile client to server.
   * Conflict resolution strategy per entity:
   *
   * | Entity      | Strategy           | Reason                                    |
   * |-------------|--------------------|--------------------------------------------|
   * | Plant       | server-wins        | Regulatory data — server is authoritative  |
   * | Batch       | server-wins        | Tracking IDs must remain consistent        |
   * | Harvest     | last-write-wins    | Field data entry — most recent is likely correct |
   * | Inspection  | merge-fields       | Inspector adds notes offline, server adds status |
   * | Sale        | reject-if-conflict | Financial records cannot auto-merge         |
   */
  async pushChanges(
    tenantId: string,
    userId: string,
    dto: SyncPushDto,
  ): Promise<SyncPushResponse> {
    const conflicts: SyncConflict[] = [];
    const applied: { table: string; created: number; updated: number; deleted: number }[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Process each table's changes
      for (const [tableName, changes] of Object.entries(dto).filter(([k]) => k !== 'lastPulledAt')) {
        if (!changes) continue;
        const tableChanges = changes as SyncTableChanges;
        const strategy = this.getConflictStrategy(tableName);
        let created = 0, updated = 0, deleted = 0;

        // CREATES: Map WatermelonDB IDs to server UUIDs
        for (const record of tableChanges.created) {
          const serverRecord = await this.createRecord(tx, tenantId, tableName, record.payload);
          created++;
        }

        // UPDATES: Apply conflict resolution
        for (const record of tableChanges.updated) {
          const serverId = record._serverId;
          if (!serverId) continue;

          const serverVersion = await this.getRecord(tx, tableName, serverId);
          if (!serverVersion) continue;

          const lastPulled = new Date(dto.lastPulledAt);
          const serverUpdated = serverVersion.updatedAt;

          if (serverUpdated > lastPulled) {
            // CONFLICT: Server was modified since client's last pull
            const resolution = this.resolveConflict(strategy, record.payload, serverVersion);
            if (resolution.action === 'reject') {
              conflicts.push({
                table: tableName,
                id: serverId,
                clientData: record.payload,
                serverData: serverVersion,
                resolution: 'rejected',
              });
              continue;
            }
            await this.updateRecord(tx, tableName, serverId, resolution.mergedData);
          } else {
            // No conflict: apply client changes
            await this.updateRecord(tx, tableName, serverId, record.payload);
          }
          updated++;
        }

        // DELETES: Soft-delete (set deletedAt)
        for (const serverId of tableChanges.deleted) {
          await this.softDeleteRecord(tx, tableName, serverId);
          deleted++;
        }

        applied.push({ table: tableName, created, updated, deleted });
      }

      // Audit trail for all sync operations
      await this.auditService.logEvent(tx, {
        tenantId,
        userId,
        eventType: 'sync.push',
        details: { applied, conflictCount: conflicts.length },
      });
    });

    return {
      applied,
      conflicts,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Pull changes since last sync.
   * Returns WatermelonDB-compatible change sets.
   */
  async pullChanges(
    tenantId: string,
    since: Date,
    tables: string[],
  ): Promise<SyncPullResponse> {
    const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};

    for (const table of tables) {
      const [created, updated, deleted] = await Promise.all([
        // Records created after last sync
        this.getCreatedSince(tenantId, table, since),
        // Records updated after last sync (but created before)
        this.getUpdatedSince(tenantId, table, since),
        // Records soft-deleted after last sync
        this.getDeletedSince(tenantId, table, since),
      ]);

      changes[table] = { created, updated, deleted };
    }

    return {
      changes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reference data for mobile dropdowns and validation.
   * Cached aggressively (1 hour TTL) — rarely changes.
   */
  async getReferenceData(): Promise<ReferenceDataResponse> {
    const [cultivars, zones, complianceRules, provinces] = await Promise.all([
      this.prisma.$queryRaw`SELECT DISTINCT cultivar FROM plants WHERE cultivar IS NOT NULL ORDER BY cultivar`,
      this.prisma.zone.findMany({ select: { id: true, name: true, facilityId: true, capacity: true } }),
      this.prisma.complianceRule.findMany({ where: { isActive: true }, select: { id: true, name: true, category: true } }),
      Promise.resolve([
        'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
        'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
      ]),
    ]);

    return {
      cultivars: cultivars.map((c: any) => c.cultivar),
      zones,
      complianceRules,
      provinces,
      facilityTypes: ['cultivation', 'processing', 'distribution', 'retail', 'research', 'hemp_industrial'],
      plantStates: ['seedling', 'vegetative', 'flowering', 'harvested', 'destroyed', 'quarantined'],
      batchTypes: ['raw', 'processed', 'packaged', 'finished'],
      saleTypes: ['retail', 'wholesale', 'medical', 'export'],
    };
  }

  private getConflictStrategy(table: string): 'server-wins' | 'last-write-wins' | 'merge-fields' | 'reject-if-conflict' {
    const strategies: Record<string, any> = {
      plants: 'server-wins',
      batches: 'server-wins',
      harvests: 'last-write-wins',
      inspections: 'merge-fields',
      sales: 'reject-if-conflict',
    };
    return strategies[table] || 'server-wins';
  }

  private resolveConflict(
    strategy: string,
    clientData: Record<string, any>,
    serverData: Record<string, any>,
  ): { action: 'apply' | 'reject'; mergedData?: Record<string, any> } {
    switch (strategy) {
      case 'server-wins':
        return { action: 'reject' };
      case 'last-write-wins':
        return { action: 'apply', mergedData: clientData };
      case 'merge-fields':
        // Merge: client's non-null fields override server's, server's non-null fields preserved
        const merged = { ...serverData };
        for (const [key, value] of Object.entries(clientData)) {
          if (value !== null && value !== undefined) merged[key] = value;
        }
        return { action: 'apply', mergedData: merged };
      case 'reject-if-conflict':
        return { action: 'reject' };
      default:
        return { action: 'reject' };
    }
  }
}
```

### Change Tracking Mechanism

To support efficient `pullChanges`, all syncable models must track update timestamps:

```prisma
// Ensure all syncable models have these fields:
updatedAt  DateTime  @updatedAt @map("updated_at")
deletedAt  DateTime? @map("deleted_at")  // Soft delete — required for sync deletion tracking
```

**Models requiring `deletedAt` addition:** Plant, Batch, Harvest, Sale (Inspection already has soft-delete via `status: 'cancelled'`).

### Acceptance Criteria
- [ ] `POST /sync/push` accepts WatermelonDB-format change sets
- [ ] Conflict resolution strategies applied per entity type
- [ ] `GET /sync/pull?since={timestamp}` returns created/updated/deleted change sets
- [ ] `GET /sync/reference-data` returns all dropdown/validation data for offline use
- [ ] All sync operations wrapped in database transactions
- [ ] Audit trail created for each push operation
- [ ] Soft-delete fields added to Plant, Batch, Harvest, Sale models

---

# Section 8: Advanced Features

## 8.1 Excise Duty Calculation Engine

**Priority:** P2
**Dependencies:** Section 0 (ExciseRate, ExciseLedger models), Sales module
**Module:** New `apps/api/src/excise/`

### Architecture

```
sale.created event →
  ExciseDutyService.calculateDuty(sale) →
    1. Look up active ExciseRate for batch's product category
    2. Calculate: duty = quantity × rate_per_unit
    3. Create ExciseLedger entry
    4. Tag sale with excise reference
```

### Service

```typescript
@Injectable()
export class ExciseDutyService {
  constructor(private prisma: PrismaService) {}

  @OnEvent('sale.created')
  async calculateDuty(payload: { saleId: string; batchId: string; quantityGrams: number }): Promise<void> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: payload.batchId },
      select: { productCategory: true },
    });

    const rate = await this.prisma.exciseRate.findFirst({
      where: {
        productCategory: batch?.productCategory || 'dried_flower',
        isActive: true,
        effectiveDate: { lte: new Date() },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } },
        ],
      },
    });

    if (!rate) return;

    const quantity = payload.quantityGrams;
    const dutyAmount = quantity * rate.ratePerUnit;
    const reportingPeriod = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    await this.prisma.exciseLedger.create({
      data: {
        tenantId: (await this.prisma.sale.findUnique({ where: { id: payload.saleId } }))!.tenantId,
        saleId: payload.saleId,
        batchId: payload.batchId,
        rateId: rate.id,
        quantity,
        unit: rate.unit,
        rateApplied: rate.ratePerUnit,
        dutyAmountZar: dutyAmount,
        reportingPeriod,
      },
    });
  }

  async getExciseSummary(tenantId: string, period: string): Promise<ExciseSummary> {
    const entries = await this.prisma.exciseLedger.findMany({
      where: { tenantId, reportingPeriod: period },
      include: { rate: true },
    });

    const byCategory = entries.reduce((acc, e) => {
      const key = e.rate.productCategory;
      if (!acc[key]) acc[key] = { quantity: 0, duty: 0 };
      acc[key].quantity += e.quantity;
      acc[key].duty += e.dutyAmountZar;
      return acc;
    }, {} as Record<string, { quantity: number; duty: number }>);

    return {
      period,
      totalDutyZar: entries.reduce((sum, e) => sum + e.dutyAmountZar, 0),
      byCategory,
      entryCount: entries.length,
    };
  }
}
```

### API Endpoints

```
GET    /api/v1/excise/rates                     ← List active rates (admin)
POST   /api/v1/excise/rates                     ← Create/update rate (regulator)
GET    /api/v1/excise/summary/:period            ← Period summary for operator
GET    /api/v1/excise/ledger                    ← Detailed ledger entries
POST   /api/v1/excise/da260/:period             ← Generate SARS DA 260 return
```

### Acceptance Criteria
- [ ] Excise duty auto-calculated on sale events
- [ ] Rates configurable by product category
- [ ] Period summary aggregates totals
- [ ] DA 260 XML export ready for SARS e-Filing

---

## 8.2 POPIA Compliance Module

**Priority:** P1 (Legal requirement)
**Dependencies:** Section 0 (Consent model), Section 1 (Auth), Section 4 (Audit)
**Module:** New `apps/api/src/popia/`

### POPIA 8 Conditions → Implementation

| # | Condition | Implementation |
|---|---|---|
| 1 | Accountability | Data Processing Officer role, audit trail |
| 2 | Processing Limitation | Purpose-bound consent, minimal data collection |
| 3 | Purpose Specification | Consent records with specific purposes |
| 4 | Further Processing Limitation | No sharing without consent |
| 5 | Information Quality | Data validation (DTOs), update endpoints |
| 6 | Openness | Privacy policy versioning, data inventory |
| 7 | Security Safeguards | Encryption (crypto-lib), RLS, audit trail |
| 8 | Data Subject Participation | Access/correction/deletion endpoints |

### API Endpoints

```
POST   /api/v1/popia/consent                  ← Record consent
GET    /api/v1/popia/consent                  ← User's consent history
PATCH  /api/v1/popia/consent/:id/withdraw     ← Withdraw consent
POST   /api/v1/popia/data-export              ← Request personal data export (SAR)
POST   /api/v1/popia/data-deletion            ← Request data deletion (right to erasure)
GET    /api/v1/popia/data-inventory           ← What data we hold about user
GET    /api/v1/popia/privacy-policy            ← Current policy version
```

### Subject Access Request (SAR) Implementation

```typescript
@Injectable()
export class PopiaService {
  async requestDataExport(userId: string): Promise<{ requestId: string }> {
    // 1. Create audit event: 'data_export.requested'
    // 2. Queue async job to compile all user data
    // 3. Compile: user profile, plants, batches, sales, audit events, consents
    // 4. Package as encrypted ZIP
    // 5. Upload to S3 with short-lived URL (24h)
    // 6. Notify user via email with download link
    // 7. Must complete within 30 days (POPIA requirement, target: 48h)
  }

  async requestDataDeletion(userId: string, scope: string): Promise<void> {
    // 1. Validate: cannot delete data required for regulatory compliance
    // 2. For deletable data: anonymize (don't physically delete)
    // 3. Replace PII with 'REDACTED-{hash}'
    // 4. Preserve non-PII for regulatory reporting
    // 5. Create audit event: 'data_deletion.executed'
    // 6. Confirm deletion to user via retained email (then redact email)
  }
}
```

### Data Retention Policy

| Data Category | Retention Period | Legal Basis |
|---|---|---|
| User PII | Account lifetime + 5 years | POPIA + regulatory |
| Plant tracking data | 7 years from harvest | SA cannabis regulations |
| Transfer records | 7 years from date | Chain of custody |
| Lab results | 7 years from test | Product safety |
| Audit events | 10 years | Regulatory audit trail |
| Financial records (sales, excise) | 7 years | SARS requirements |
| Inspection records | 7 years | Regulatory compliance |
| Consent records | Account lifetime + 5 years | POPIA condition 2 |
| Verification scan logs | 2 years | Operational analytics |

### Acceptance Criteria
- [ ] Consent recording with policy version tracking
- [ ] Subject access request completed within 48 hours
- [ ] Data deletion anonymizes rather than physically deletes
- [ ] Regulatory data preserved despite deletion requests
- [ ] Privacy policy versioning
- [ ] All POPIA requests create audit events

---

## 8.3 Planting Intention Module

**Priority:** P2
**Dependencies:** Section 0 (PlantingIntention model)
**Module:** New `apps/api/src/planting-intentions/`

### API Contracts

```
POST   /api/v1/planting-intentions              ← Submit planting plan
GET    /api/v1/planting-intentions              ← List (per operator or all for regulator)
GET    /api/v1/planting-intentions/:id          ← Detail
PATCH  /api/v1/planting-intentions/:id          ← Update draft
POST   /api/v1/planting-intentions/:id/submit   ← Submit for acknowledgment
```

### Business Logic

1. Operators submit seasonal planting plans with cultivar breakdown
2. DALRRD-style: area in hectares, estimated yield per cultivar
3. Government can review and acknowledge plans
4. Used for national production forecasting

### Acceptance Criteria
- [ ] Operators can submit and manage planting intentions
- [ ] Regulator can view all operators' plans in aggregate
- [ ] Season-based organization

---

## 8.4 Public Statistics API

**Priority:** P3
**Dependencies:** All modules
**Module:** `apps/api/src/regulatory/`

### API Contract

```
GET /api/v1/public/statistics
No authentication required

Response 200:
{
  "lastUpdated": "2026-02-21T06:00:00Z",
  "national": {
    "totalLicensedOperators": 245,
    "totalActiveFacilities": 312,
    "totalActivePlants": 45000,
    "provinceDistribution": {
      "Western Cape": 82,
      "Gauteng": 65,
      "KwaZulu-Natal": 48,
      "Eastern Cape": 20,
      "Limpopo": 12,
      "Mpumalanga": 8,
      "Free State": 5,
      "North West": 3,
      "Northern Cape": 2
    },
    "averageComplianceScore": 78,
    "totalVerificationsLast30Days": 12500
  }
}
```

### Privacy

- Only aggregate statistics (no operator-identifiable data)
- Province-level minimum: suppress if < 3 operators (avoid identification)
- Cached for 1 hour

### Acceptance Criteria
- [ ] Public endpoint, no auth required
- [ ] Only aggregate data, no PII
- [ ] Province suppression for < 3 operators
- [ ] Cached in Redis (1 hour TTL)

---

# Section 9: Security Hardening

## 9.1 Input Validation & Sanitization

**Priority:** P0 (Critical — done partially via Section 2 DTOs)
**Dependencies:** Section 2

### Remaining Work

1. **SQL Injection Prevention**
   - **Fixed in Section 0.4:** `withTenantContext()` parameterized
   - **Remaining:** Audit all `$queryRaw` and `$executeRawUnsafe` calls (found: 3 places)
   - **Pattern:** Always use tagged template literals (`$queryRaw\`...\``) instead of `$executeRawUnsafe(string)`

2. **XSS Prevention**
   - All text fields sanitized via `class-transformer` before storage
   - Add `sanitize-html` for any rich text fields (inspection findings, notes)

```typescript
// apps/api/src/common/interceptors/sanitize.interceptor.ts
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.body) {
      request.body = this.sanitizeDeep(request.body);
    }
    return next.handle();
  }

  private sanitizeDeep(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj, {
        allowedTags: [], // Strip ALL HTML
        allowedAttributes: {},
      });
    }
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeDeep(item));
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, this.sanitizeDeep(v)])
      );
    }
    return obj;
  }
}
```

3. **Path Traversal Prevention** (S3 keys)
   - Validate filenames don't contain `../` or absolute paths
   - Enforce prefix: `{tenantId}/` in all S3 keys

### Acceptance Criteria
- [ ] Zero `$executeRawUnsafe` calls with string interpolation
- [ ] All text input sanitized against XSS
- [ ] S3 keys validated against path traversal

---

## 9.2 Security Headers

**Priority:** P1
**Dependencies:** None

### Fastify Helmet Configuration

```typescript
// apps/api/src/main.ts
import helmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.amazonaws.com'],
        connectSrc: ["'self'", 'https://api.ncts.gov.za'],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // CORS
  app.enableCors({
    origin: [
      'https://ncts.gov.za',
      'https://admin.ncts.gov.za',
      'https://verify.ncts.gov.za',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Id'],
  });
}
```

### Acceptance Criteria
- [ ] Helmet configured with strict CSP
- [ ] CORS whitelist for known origins only
- [ ] HSTS enabled with 1-year max-age
- [ ] No `X-Powered-By` header

---

## 9.3 Encryption at Rest & in Transit

**Priority:** P1 (Legal — SA MISS standards)
**Dependencies:** `packages/crypto-lib/`

### Current State

`crypto-lib` implements AES-256-GCM encryption with `encrypt(data, key)` / `decrypt(data, key)`. It works but is not integrated anywhere.

### Integration Points

| Data | Encryption Method | When |
|---|---|---|
| User passwords | bcrypt (12 rounds) | Auth module |
| MFA secrets | AES-256-GCM via crypto-lib | User model |
| SA ID numbers | AES-256-GCM via crypto-lib | User model (if stored) |
| Patient pseudonymization | SHA-256 hash (one-way) | PatientAccess |
| S3 objects | AWS SSE-S3 (server-side) | S3 bucket policy |
| Database connections | TLS 1.2+ | pg connection string |
| API transport | TLS 1.2+ (HTTPS only) | Load balancer |
| Audit chain hashes | SHA-256 | audit-lib |
| QR code signatures | HMAC-SHA256 | qr-lib |

### Key Management

```typescript
// apps/api/src/common/encryption/key-manager.ts
@Injectable()
export class KeyManager {
  private masterKey: Buffer;

  constructor(private config: ConfigService) {
    // Production: AWS KMS → decrypt data key
    // Development: env variable ENCRYPTION_KEY
    this.masterKey = Buffer.from(
      config.getOrThrow('ENCRYPTION_KEY'),
      'hex',
    );
  }

  /**
   * Encrypt sensitive field before database storage
   */
  encryptField(plaintext: string): string {
    return encrypt(plaintext, this.masterKey.toString('hex'));
  }

  /**
   * Decrypt sensitive field after database retrieval
   */
  decryptField(ciphertext: string): string {
    return decrypt(ciphertext, this.masterKey.toString('hex'));
  }
}
```

### Acceptance Criteria
- [ ] MFA secrets encrypted at rest via crypto-lib
- [ ] Patient IDs pseudonymized via SHA-256
- [ ] S3 bucket configured with SSE-S3 encryption
- [ ] Database connections require TLS
- [ ] Master key from AWS KMS in production, env var in dev

---

## 9.4 RBAC (Role-Based Access Control) Matrix

**Priority:** P0 (Critical)
**Dependencies:** Section 1 (Auth)

### Role Definitions

| Role | Scope | Description |
|---|---|---|
| `super_admin` | System-wide | NCTS system administrators |
| `regulator` | System-wide | Government regulators (SAHPRA/DALRRD) |
| `inspector` | System-wide | Field inspectors |
| `operator_admin` | Tenant | Licensed operator administrator |
| `operator_staff` | Tenant | Operator field staff |
| `lab_technician` | Tenant | Lab result submission |
| `auditor` | System-wide (read-only) | External auditors |

### Permission Matrix

| Resource | super_admin | regulator | inspector | operator_admin | operator_staff | lab_technician | auditor |
|---|---|---|---|---|---|---|---|
| **Users** | CRUD all | CRUD all | Read own | CRUD own tenant | Read own | Read own | — |
| **Facilities** | CRUD all | Read all | Read assigned | CRUD own | Read own | — | Read all |
| **Plants** | CRUD all | Read all | Read assigned | CRUD own | CRUD own | — | Read all |
| **Batches** | CRUD all | Read all | Read assigned | CRUD own | CRUD own | Read own | Read all |
| **Harvests** | CRUD all | Read all | — | CRUD own | CRUD own | — | Read all |
| **Lab Results** | CRUD all | Read all | — | Read own | Read own | CRUD own | Read all |
| **Transfers** | CRUD all | Read all | — | CRUD own | CRUD own | — | Read all |
| **Sales** | CRUD all | Read all | — | CRUD own | CRUD own | — | Read all |
| **Permits** | CRUD all | CRUD all | Read assigned | Read own | — | — | Read all |
| **Inspections** | CRUD all | CRUD all | CRUD assigned | Read own | Read own | — | Read all |
| **Compliance Rules** | CRUD | CRUD | Read | Read | — | — | Read |
| **Compliance Alerts** | CRUD | CRUD | Read assigned | Read own | — | — | Read all |
| **Destruction Events** | CRUD all | Read all | Witness | CRUD own | CRUD own | — | Read all |
| **Audit Events** | Read all | Read all | Read assigned | Read own | — | — | Read all |
| **Reports/Export** | All | All | Own | Own | — | — | Read all |
| **Dashboard KPIs** | Full | Full | — | Own | — | — | Full |
| **POPIA Requests** | Process | Process | — | Own | Own | Own | — |

### Guard Implementation

```typescript
// apps/api/src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) return false;

    return requiredRoles.includes(user.role);
  }
}

// Usage:
@Roles('regulator', 'super_admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('dashboard/kpis')
async getKpis() { ... }
```

### Tenant Isolation Guard

```typescript
// apps/api/src/common/guards/tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    // System-wide roles can access any tenant
    if (['super_admin', 'regulator', 'inspector', 'auditor'].includes(user.role)) {
      return true;
    }

    // Tenant-scoped roles: verify tenantId in params/query matches JWT tenant
    const requestedTenant = params.tenantId || request.query?.tenantId;
    if (requestedTenant && requestedTenant !== user.tenantId) {
      return false;
    }

    return true;
  }
}
```

### Acceptance Criteria
- [ ] 7 roles defined with clear scope
- [ ] RolesGuard enforces role requirements per endpoint
- [ ] TenantGuard prevents cross-tenant access for operator roles
- [ ] System-wide roles bypass tenant restrictions
- [ ] Permission matrix documented and enforced

---

## 9.5 Request Logging & Monitoring

**Priority:** P1
**Dependencies:** None

### Request Logger Middleware

```typescript
// apps/api/src/common/middleware/request-logger.middleware.ts
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void) {
    const startTime = Date.now();
    const { method, url } = req;
    const userId = req.user?.sub || 'anonymous';
    const tenantId = req.user?.tenantId || 'none';
    const requestId = randomUUID();

    req.requestId = requestId;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      this.logger.log(
        JSON.stringify({
          requestId,
          method,
          url,
          statusCode,
          duration,
          userId,
          tenantId,
          ip: req.ip,
          userAgent: req.headers?.['user-agent']?.substring(0, 100),
        })
      );

      // Log slow requests
      if (duration > 2000) {
        this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`);
      }
    });

    next();
  }
}
```

### Global Exception Filter

```typescript
// apps/api/src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    // Don't leak internal error details in production
    const errorResponse = {
      statusCode: status,
      error: HttpStatus[status] || 'Error',
      message: status === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : message,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    };

    // Log full error internally
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).send(errorResponse);
  }
}
```

### Acceptance Criteria
- [ ] All requests logged with structured JSON
- [ ] Slow requests (> 2s) logged as warnings
- [ ] Internal errors don't leak in production
- [ ] Every response includes `requestId` for tracing
- [ ] Global exception filter catches all unhandled errors

---

# Section 10: Testing Strategy

## 10.1 Testing Architecture

### Test Pyramid

```
         ╱ ╲
        ╱ E2E ╲           ~20 tests (API-level, Supertest)
       ╱───────╲
      ╱ Integr. ╲         ~50 tests (DB + services, Testcontainers)
     ╱───────────╲
    ╱    Unit     ╲        ~200 tests (pure logic, Vitest)
   ╱───────────────╲
```

### Test Infrastructure

| Layer | Framework | Scope |
|---|---|---|
| Unit | Vitest | Pure functions, validators, algorithms, DTOs |
| Integration | Vitest + Testcontainers | Service methods with real PostgreSQL + Redis |
| E2E | Vitest + Supertest | Full HTTP request/response cycle |
| Load | k6 | Performance benchmarks |

### Setup: Testcontainers

```typescript
// apps/api/test/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

let postgresContainer: any;
let redisContainer: any;

export async function setupTestDb() {
  postgresContainer = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('ncts_test')
    .withExposedPorts(5432)
    .start();

  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));

  // Run Prisma migrations
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../../../packages/database'),
    env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() },
  });
}
```

---

## 10.2 Unit Tests (Target: ~200)

**Priority:** P1
**Dependencies:** None — can write alongside features

### Test Categories

| Category | Files | Est. Tests | Description |
|---|---|---|---|
| DTO Validation | `dto/*.spec.ts` | ~40 | Valid/invalid input for all DTOs |
| Compliance Rules | `evaluators/*.spec.ts` | ~28 | Each rule: pass/fail/edge cases |
| Diversion Algorithms | `algorithms/*.spec.ts` | ~16 | Mass balance, wet-dry, velocity, verification |
| Compliance Scoring | `scoring/*.spec.ts` | ~10 | Score calculation, grading, bonuses |
| Auth Logic | `auth/*.spec.ts` | ~15 | Password validation, token generation, lockout |
| ID Generation | `utils/*.spec.ts` | ~8 | Tracking ID format, sequence |
| State Machine | `plants/state.spec.ts` | ~12 | Valid/invalid plant state transitions |
| Excise Calculation | `excise/*.spec.ts` | ~8 | Rate lookup, duty calculation, period grouping |
| crypto-lib | `crypto/*.spec.ts` | ~6 | Encrypt/decrypt, key derivation |
| qr-lib | `qr/*.spec.ts` | ~6 | Generate, verify, sign, HMAC validation |
| audit-lib | `audit/*.spec.ts` | ~8 | Hash chain, tamper detection |
| SA Validators | `validators/*.spec.ts` | ~10 | SA ID checksum, coordinate bounds |
| Sanitization | `sanitize/*.spec.ts` | ~6 | XSS stripping, path traversal |
| Misc Utilities | `utils/*.spec.ts` | ~8 | Date formatting, pagination helpers |

### Example: Plant State Machine Test

```typescript
// apps/api/src/plants/__tests__/plant-state.spec.ts
import { describe, it, expect } from 'vitest';
import { isValidStateTransition } from '../plant-state-machine';

describe('Plant State Machine', () => {
  const validTransitions = [
    ['seed', 'seedling'],
    ['seedling', 'vegetative'],
    ['vegetative', 'flowering'],
    ['flowering', 'harvested'],
    ['seed', 'destroyed'],
    ['seedling', 'destroyed'],
    ['vegetative', 'destroyed'],
    ['flowering', 'destroyed'],
  ];

  const invalidTransitions = [
    ['harvested', 'flowering'],  // can't go back
    ['destroyed', 'seedling'],   // can't resurrect
    ['seed', 'flowering'],       // can't skip stages
    ['flowering', 'vegetative'], // can't go back
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidStateTransition(from, to)).toBe(true);
  });

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(isValidStateTransition(from, to)).toBe(false);
  });
});
```

### Example: THC Limit Evaluator Test

```typescript
// apps/api/src/compliance/engine/evaluators/__tests__/thc-limit.spec.ts
describe('ThcLimitEvaluator', () => {
  it('passes when THC below hemp threshold', async () => {
    const result = await evaluator.evaluate({
      thcPercent: 0.15,
      facilityType: 'hemp_cultivation',
    });
    expect(result.passed).toBe(true);
  });

  it('fails when THC exceeds hemp threshold (0.2%)', async () => {
    const result = await evaluator.evaluate({
      thcPercent: 0.25,
      facilityType: 'hemp_cultivation',
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('critical');
    expect(result.autoAction?.type).toBe('quarantine_batch');
  });

  it('passes medicinal cannabis at any THC level', async () => {
    const result = await evaluator.evaluate({
      thcPercent: 28.5,
      facilityType: 'cultivation',
    });
    expect(result.passed).toBe(true);
  });
});
```

---

## 10.3 Integration Tests (Target: ~50)

**Priority:** P1
**Dependencies:** Testcontainers setup

### Test Suites

| Suite | Tests | Description |
|---|---|---|
| Auth Flow | ~8 | Login, register, refresh, lockout, password change |
| Plant Lifecycle | ~6 | Create → state transitions → harvest → batch |
| Transfer Chain | ~6 | Create → accept/reject, discrepancy detection |
| Harvest → Batch → Sale | ~5 | Full product lifecycle |
| Lab Result Submission | ~4 | Submit, THC check triggers, batch status update |
| Compliance Engine | ~6 | Rule evaluation, alert creation, escalation |
| Inspection Lifecycle | ~5 | Schedule → start → complete, report generation |
| Audit Chain | ~4 | Create events, verify chain, detect tampering |
| RLS Enforcement | ~4 | Cross-tenant isolation, system-wide role bypass |
| Destruction Flow | ~3 | Record destruction, witness validation, mass balance update |

### Example: Auth Integration Test

```typescript
// apps/api/test/integration/auth.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDb, createTestApp } from '../setup';

describe('Auth Flow (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDb();
    app = await createTestApp();
  });

  it('completes login → refresh → logout cycle', async () => {
    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'operator@greenfields.co.za', password: 'Test123!' })
      .expect(200);

    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');

    // Refresh
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(200);

    expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);

    // Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
      .expect(200);

    // Old token should now fail
    await request(app.getHttpServer())
      .get('/plants')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
      .expect(401);
  });

  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'operator@greenfields.co.za', password: 'WrongPassword' })
        .expect(401);
    }

    // 6th attempt should get 429
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'operator@greenfields.co.za', password: 'WrongPassword' })
      .expect(429);
  });
});
```

### Example: RLS Integration Test

```typescript
describe('RLS Enforcement (Integration)', () => {
  it('tenant A cannot see tenant B plants even without WHERE clause', async () => {
    // Create plants for tenant A and B
    const plantA = await createPlantForTenant('tenant-a');
    const plantB = await createPlantForTenant('tenant-b');

    // Query as tenant A with RLS
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL app.current_tenant = $1', 'tenant-a');
      return tx.plant.findMany(); // No WHERE clause!
    });

    expect(result.map(p => p.id)).toContain(plantA.id);
    expect(result.map(p => p.id)).not.toContain(plantB.id);
  });
});
```

---

## 10.4 E2E Tests (Target: ~20)

**Priority:** P2
**Dependencies:** Full application setup

### Test Scenarios

| # | Scenario | Steps |
|---|---|---|
| 1 | Operator Registration | Admin creates user → user logs in → changes password |
| 2 | Facility Setup | Create facility → add zones → verify in list |
| 3 | Plant Registration | Register plant → verify tracking ID → QR verify |
| 4 | Full Lifecycle | Plant → grow → harvest → batch → lab → sell |
| 5 | Transfer Flow | Create transfer → accept → verify quantities |
| 6 | Transfer Rejection | Create transfer → reject with reason |
| 7 | Lab Result Failure | Submit failing lab → batch quarantined |
| 8 | Inspection Flow | Schedule → start → checklist → complete → report |
| 9 | Compliance Alert | Trigger rule → alert created → escalation |
| 10 | Destruction | Record destruction → witnesses → mass balance |
| 11 | Export DA 260 | Create sales → excise calculated → generate XML |
| 12 | POPIA SAR | Request data export → ZIP generated → download |
| 13 | Public Verify | Scan QR → chain-of-custody → lab results |
| 14 | Report Suspicious | Public reports → regulator sees report |
| 15 | Dashboard KPIs | Load dashboard → verify aggregations |
| 16 | Cross-Tenant Isolation | Tenant A cannot access tenant B data |
| 17 | Rate Limiting | Hit login > 5 times → 429 returned |
| 18 | Concurrent ID Gen | Parallel plant creation → no duplicate IDs |
| 19 | Token Refresh | Access token expires → refresh → new token |
| 20 | Bulk Plant Register | Batch create 100 plants → all get unique IDs |

---

## 10.5 Load Testing (k6)

**Priority:** P3
**Dependencies:** Deployed staging environment

### Configuration

```javascript
// infrastructure/load-tests/ncts-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Sustained load
    { duration: '2m', target: 100 },  // Peak
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95) < 500', 'p(99) < 1000'], // 95th < 500ms, 99th < 1s
    http_req_failed: ['rate < 0.01'],                      // < 1% error rate
    'http_req_duration{name:verify}': ['p(95) < 200'],     // Verify must be fast
  },
};

export default function () {
  const token = login();
  
  // Mix of operations
  const operations = [
    { weight: 40, fn: () => listPlants(token) },
    { weight: 20, fn: () => createPlant(token) },
    { weight: 15, fn: () => verifyQr() },
    { weight: 10, fn: () => createTransfer(token) },
    { weight: 10, fn: () => getDashboard(token) },
    { weight: 5,  fn: () => createSale(token) },
  ];

  // Weighted random selection
  const r = Math.random() * 100;
  let cumWeight = 0;
  for (const op of operations) {
    cumWeight += op.weight;
    if (r < cumWeight) { op.fn(); break; }
  }

  sleep(1);
}
```

### Performance Targets

| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| `GET /plants` (list) | < 100ms | < 300ms | < 500ms |
| `POST /plants` (create) | < 200ms | < 500ms | < 1s |
| `GET /verify/:id` | < 50ms | < 150ms | < 300ms |
| `GET /regulatory/dashboard` | < 300ms | < 800ms | < 1.5s |
| `POST /auth/login` | < 200ms | < 500ms | < 1s |
| All endpoints | < 150ms | < 500ms | < 1s |

### Acceptance Criteria
- [ ] 50 concurrent users sustained for 5 minutes without degradation
- [ ] 100 concurrent users at peak with < 1% error rate
- [ ] All endpoints meet performance targets
- [ ] Verification endpoint < 200ms at p95 (public-facing)

---

# Section 11: DevOps & Deployment

## 11.1 Docker Development Environment

**Priority:** P0 (Critical — needed for development)
**Dependencies:** None

### Current State

`docker-compose.yml` defines PostgreSQL + PostGIS, Redis, and Mailpit. Missing: MinIO for S3-compatible storage.

### Enhanced Docker Compose

```yaml
# docker-compose.yml additions
services:
  # ... existing postgres, redis, mailpit ...

  minio:
    image: minio/minio:latest
    container_name: ncts-minio
    environment:
      MINIO_ROOT_USER: ncts_minio_admin
      MINIO_ROOT_PASSWORD: ncts_minio_secret
    command: server /data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  createbuckets:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set minio http://minio:9000 ncts_minio_admin ncts_minio_secret;
      mc mb minio/ncts-documents --ignore-existing;
      mc anonymous set download minio/ncts-documents/public;
      exit 0;
      "

volumes:
  minio_data:
```

### Development `.env` Template

```bash
# .env.development
DATABASE_URL=postgresql://ncts_admin:ncts_dev_password@localhost:5432/ncts_dev?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=ncts-documents
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=ncts_minio_admin
AWS_SECRET_ACCESS_KEY=ncts_minio_secret
AWS_REGION=af-south-1
JWT_SECRET=dev-secret-change-in-production-32chars
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SMTP_HOST=localhost
SMTP_PORT=1025
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176
NODE_ENV=development
PORT=3000
```

### Acceptance Criteria
- [ ] Full dev environment starts with `docker compose up`
- [ ] MinIO available for S3-compatible file storage
- [ ] Mailpit captures emails at `http://localhost:8025`
- [ ] `.env.development` template committed with safe defaults

---

## 11.2 CI/CD Pipeline

**Priority:** P1
**Dependencies:** None

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: NCTS CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: '**/coverage/lcov.info'

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: ncts_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: ncts_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:integration
        env:
          DATABASE_URL: postgresql://ncts_test:test_password@localhost:5432/ncts_test
          REDIS_HOST: localhost

  build:
    needs: [lint, typecheck, unit-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
```

### Acceptance Criteria
- [ ] CI runs on every PR and push to main/develop
- [ ] Lint, typecheck, unit tests, integration tests, build
- [ ] Code coverage uploaded to Codecov
- [ ] Integration tests run against real PostgreSQL + Redis

---

## 11.3 Terraform Infrastructure (AWS af-south-1)

**Priority:** P2
**Dependencies:** AWS account with af-south-1 access

### Resource Plan

| Resource | Service | Config |
|---|---|---|
| API Server | ECS Fargate | 2 vCPU, 4 GB, min 2 tasks |
| Database | RDS PostgreSQL 16 | db.r6g.large, Multi-AZ, 100 GB gp3 |
| Cache | ElastiCache Redis | cache.t3.medium, 1 replica |
| File Storage | S3 | SSE-S3, lifecycle rules |
| CDN | CloudFront | For static assets (web, admin, verify) |
| DNS | Route 53 | ncts.gov.za |
| Secrets | Secrets Manager | DB credentials, JWT secrets, encryption keys |
| Email | SES | Verified domain: ncts.gov.za |
| SMS | SNS | AF mobile numbers |
| Monitoring | CloudWatch | Logs, metrics, alarms |
| WAF | WAF v2 | Rate limiting, SQL injection, XSS |
| VPC | VPC | Private subnets for RDS + Redis |
| Load Balancer | ALB | HTTPS termination, TLS 1.2+ |

### Directory Layout

```
infrastructure/terraform/
  main.tf
  variables.tf
  outputs.tf
  modules/
    networking/         ← VPC, subnets, security groups
    database/           ← RDS + ElastiCache
    compute/            ← ECS Fargate + ALB
    storage/            ← S3 buckets
    cdn/                ← CloudFront distributions
    monitoring/         ← CloudWatch dashboards, alarms
    security/           ← WAF, Secrets Manager
```

### Terraform Variables

```hcl
variable "environment" {
  type    = string
  default = "staging" # staging | production
}

variable "region" {
  type    = string
  default = "af-south-1"
}

variable "db_instance_class" {
  type    = string
  default = "db.r6g.large"
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "domain" {
  type    = string
  default = "ncts.gov.za"
}
```

### Acceptance Criteria
- [ ] Terraform modules for all AWS resources
- [ ] Staging and production environments parameterized
- [ ] Private subnets for database and cache
- [ ] HTTPS-only with TLS 1.2+
- [ ] WAF protects against OWASP Top 10
- [ ] CloudWatch alarms for critical metrics

---

## 11.4 Monitoring & Observability

**Priority:** P2
**Dependencies:** 11.3

### Metrics to Track

| Metric | Source | Alert Threshold |
|---|---|---|
| API response time (p95) | CloudWatch | > 1s |
| API error rate (5xx) | CloudWatch | > 1% |
| Database CPU utilization | RDS metrics | > 80% |
| Database connections | RDS metrics | > 80% pool |
| Redis memory usage | ElastiCache | > 80% |
| Redis hit rate | ElastiCache | < 70% |
| ECS task count | ECS metrics | < desired count |
| Disk IOPS | RDS metrics | > 80% provisioned |
| Compliance alerts (critical) | Application | Any new |
| Auth failures | Application | > 100/hour |

### CloudWatch Dashboard

```json
{
  "widgets": [
    { "type": "metric", "properties": { "title": "API Latency (p95)", "period": 300 } },
    { "type": "metric", "properties": { "title": "5xx Error Rate", "period": 60 } },
    { "type": "metric", "properties": { "title": "RDS CPU Utilization", "period": 300 } },
    { "type": "metric", "properties": { "title": "Active Database Connections", "period": 300 } },
    { "type": "metric", "properties": { "title": "Redis Memory Usage", "period": 300 } },
    { "type": "metric", "properties": { "title": "ECS Running Tasks", "period": 60 } }
  ]
}
```

### Health Check Endpoint Enhancement

Currently the health check returns a static `{ status: 'ok' }`. Enhance:

```typescript
@Get('health')
async healthCheck(): Promise<HealthCheckResult> {
  const checks = {};

  // Database
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    checks['database'] = { status: 'up' };
  } catch {
    checks['database'] = { status: 'down' };
  }

  // Redis
  try {
    await this.cache.set('health_check', 'ok', 5);
    const val = await this.cache.get('health_check');
    checks['redis'] = { status: val === 'ok' ? 'up' : 'down' };
  } catch {
    checks['redis'] = { status: 'down' };
  }

  // S3
  try {
    await this.storageService.headBucket();
    checks['storage'] = { status: 'up' };
  } catch {
    checks['storage'] = { status: 'down' };
  }

  const allUp = Object.values(checks).every((c: any) => c.status === 'up');

  return {
    status: allUp ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || '0.0.0',
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

### Acceptance Criteria
- [ ] Health check tests database, Redis, and S3 connectivity
- [ ] CloudWatch dashboards for all critical metrics
- [ ] Alarms configured with SNS notifications
- [ ] Structured JSON logging for CloudWatch Logs Insights

---

## 11.5 Database Backup & Disaster Recovery

**Priority:** P2
**Dependencies:** 11.3

### Strategy

| Component | Method | Frequency | Retention |
|---|---|---|---|
| RDS Database | Automated snapshots | Daily | 35 days |
| RDS Database | Point-in-time recovery | Continuous (5-min RPO) | 35 days |
| S3 Documents | Cross-region replication | Continuous | Infinite |
| Redis Cache | No backup needed | — | Rebuilt on start |
| Audit Events | S3 export (cold storage) | Monthly | 10 years |
| Terraform State | S3 backend + DynamoDB lock | On every apply | Versioned |

### Recovery Time Objectives

| Scenario | RTO | RPO |
|---|---|---|
| Single AZ failure | 0 (Multi-AZ failover) | 0 |
| Database corruption | < 1 hour (PITR) | < 5 minutes |
| Region failure | < 4 hours (restore from S3) | < 1 hour |
| Ransomware | < 2 hours (restore snapshot) | < 24 hours |

### Acceptance Criteria
- [ ] Automated daily snapshots with 35-day retention
- [ ] PITR enabled with 5-minute RPO
- [ ] S3 cross-region replication to eu-west-1
- [ ] Monthly audit event export to Glacier
- [ ] DR runbook documented

---

# Implementation Priority

Total estimated tasks: ~85 across all sections. Ordered by dependency chain and business criticality.

## Week 1-2: Foundation (P0 — Critical Blockers)

| # | Task | Section | Est. Hours | Depends On |
|---|---|---|---|---|
| 1 | Generate & run initial Prisma migration | 0.1 | 4 | — |
| 2 | Fix RLS wiring (SQL injection + parameterized) | 0.4 | 8 | 1 |
| 3 | Create database sequences for atomic IDs | 0.3 | 4 | 1 |
| 4 | Add new Prisma models (Inspection, ComplianceRule, ComplianceAlert, Notification) | 0.2 | 8 | 1 |
| 5 | Redis integration module | 1.5 | 4 | — |
| 6 | AuthController — login endpoint | 1.1 | 12 | 1, 5 |
| 7 | AuthController — refresh token | 1.3 | 6 | 6 |
| 8 | DTO validation layer (all 15 endpoints) | 2.1–2.8 | 16 | 1 |
| 9 | RBAC guard implementation | 9.4 | 8 | 6 |
| 10 | Global exception filter + request logger | 9.5 | 4 | — |
| **Total** | | | **74** | |

## Week 3-4: Core Features (P0-P1)

| # | Task | Section | Est. Hours | Depends On |
|---|---|---|---|---|
| 11 | AuthController — register, logout, password change | 1.2, 1.4 | 12 | 6, 7 |
| 12 | Rate limiting | 1.6 | 4 | 5 |
| 13 | Compliance Engine orchestrator + strategy pattern | 3.1–3.3 | 16 | 4 |
| 14 | Compliance rules R001-R003 (permit, THC, inventory) | 3.4 | 12 | 13 |
| 15 | Alert escalation service | 3.5 | 8 | 13 |
| 16 | Audit trail — fix hash-chaining, all event types | 4.1 | 12 | 1 |
| 17 | Outbox pattern + event bus | 5.1–5.2 | 12 | 1 |
| 18 | Notification service (in-app + email) | 5.3 | 12 | 4, 5 |
| 19 | Missing endpoints (GET /harvests, POST /batches) | 2.10 | 8 | 8 |
| 20 | Security headers + sanitization | 9.1–9.2 | 4 | — |
| **Total** | | | **100** | |

## Week 5-6: Government Features (P1)

| # | Task | Section | Est. Hours | Depends On |
|---|---|---|---|---|
| 21 | Inspection module (full CRUD + lifecycle) | 7.1 | 20 | 4, 9 |
| 22 | Compliance rules R004-R010 | 3.4 | 16 | 13 |
| 23 | Compliance scoring service | 3.6 | 8 | 13 |
| 24 | Diversion detection (4 algorithms) | 3.7 | 16 | 13, 17 |
| 25 | Inventory reconciliation | 3.8 | 8 | 4, 24 |
| 26 | Compliance API endpoints (11 routes) | 3.9 | 12 | 13-15, 23-25 |
| 27 | Audit chain verification + query endpoints | 4.2–4.3 | 8 | 16 |
| 28 | S3 file storage module | 6.1 | 8 | — |
| 29 | PDF report generation (transfer manifest, inspection) | 6.2 | 12 | 28, 21 |
| 30 | Scheduled jobs (all 9 cron tasks) | 5.4 | 8 | 13, 15, 17 |
| **Total** | | | **116** | |

## Week 7-8: Regulatory & Compliance (P1-P2)

| # | Task | Section | Est. Hours | Depends On |
|---|---|---|---|---|
| 31 | Destruction & disposal module | 7.2 | 12 | 4, 28 |
| 32 | Regulatory dashboard API enhancements (8 endpoints) | 7.4 | 16 | 0.6, 23 |
| 33 | QR verification enhancement + suspicious reports | 7.5 | 8 | 17 |
| 33a | QR code generation module (SVG + Avery labels + bulk) | 7.6 | 12 | 28, 33 |
| 34 | POPIA compliance module (7 endpoints) | 8.2 | 16 | 9, 16 |
| 35 | Remaining compliance rules R011-R014 | 3.4 | 8 | 13 |
| 36 | Remaining Prisma models (P2 tier) | 0.2 | 8 | 1 |
| 37 | Encryption integration (crypto-lib wiring) | 9.3 | 6 | — |
| 38 | Docker dev environment (MinIO + env template) | 11.1 | 4 | — |
| 39 | CI/CD pipeline (GitHub Actions) | 11.2 | 8 | — |
| 40 | Unit tests — DTOs + validators + state machine (~60) | 10.2 | 16 | 8 |
| **Total** | | | **114** | |

## Week 9-10: Advanced & Polish (P2-P3)

| # | Task | Section | Est. Hours | Depends On |
|---|---|---|---|---|
| 41 | Excise duty calculation engine | 8.1 | 12 | 36 |
| 42 | Import/export module | 7.3 | 8 | 36 |
| 43 | Planting intention module | 8.3 | 6 | 4 |
| 44 | CSV/XML export service (DA 260, INCB Form C) | 6.3 | 12 | 28, 41 |
| 45 | Public statistics API | 8.4 | 4 | 32 |
| 45a | Mobile sync API (push/pull/reference-data) | 7.7 | 16 | 8, 17 |
| 45b | Sales summary aggregation endpoint | 2.10 | 4 | 19 |
| 46 | Table partitioning + materialized views | 0.5–0.6 | 6 | 1 |
| 47 | Health check enhancement | 11.4 | 4 | 5, 28 |
| 48 | Unit tests — compliance rules + algorithms (~50) | 10.2 | 12 | 13, 24 |
| 49 | Integration tests (~50) | 10.3 | 20 | All modules |
| 50 | E2E tests (~20) | 10.4 | 16 | All modules |
| 51 | PatientAccess model + privacy | 0.2.14, 8.2 | 8 | 37 |
| **Total** | | | **108** | |

## Post-Launch / Phase 3+

| # | Task | Section | Est. Hours |
|---|---|---|---|
| 52 | Terraform infrastructure (full AWS) | 11.3 | 40 |
| 53 | CloudWatch monitoring + alarms | 11.4 | 16 |
| 54 | Database backup & DR setup | 11.5 | 12 |
| 55 | Load testing with k6 | 10.5 | 12 |
| 56 | AWS Cognito migration (from local JWT) | 1.x | 16 |
| 57 | WebSocket notifications (real-time) | 5.3 | 12 |
| 58 | Mobile push notifications (FCM) | 5.3 | 8 |
| 59 | Penetration testing | 9.x | 40 |
| 60 | Disaster recovery drill | 11.5 | 8 |
| **Total** | | | **164** | |

---

## Summary

| Phase | Weeks | Tasks | Hours | Key Deliverables |
|---|---|---|---|---|
| Foundation | 1-2 | 10 | 74 | Auth, DTOs, migrations, RLS, Redis |
| Core Features | 3-4 | 10 | 100 | Compliance engine, audit trail, events, notifications |
| Government | 5-6 | 10 | 116 | Inspections, diversion detection, file storage, reports |
| Regulatory | 7-8 | 10 | 102 | Dashboard, POPIA, destruction, CI/CD, initial tests |
| Advanced | 9-10 | 11 | 108 | Excise, imports, exports, full test suite |
| Post-Launch | TBD | 9 | 164 | Infrastructure, monitoring, DR, security audit |

**Grand Total: 65 tasks, ~712 hours**

**New API Endpoints: ~50** (bringing total from 36 to ~86)
**New Prisma Models: 14** (bringing total from 14 to 28)
**New Modules: 12** (compliance, events, notifications, storage, reports, inspections, destruction, import-export, excise, popia, qr, sync)
**Test Coverage Target: ~270 tests** (200 unit + 50 integration + 20 E2E)
